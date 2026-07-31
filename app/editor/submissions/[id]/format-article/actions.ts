"use server";

import { revalidatePath } from "next/cache";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import {
    formatArticleContent,
    type FormattedArticleContent,
    type RawArticleFormattingInput,
} from "@/lib/ai/format-article";
import { prisma } from "@/lib/prisma";
import { uploadJournalFile } from "@/lib/storage/blob";

import { renderArticlePdf } from "./render";

const PUBLICATION_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
] as const;

async function verifyFormattingPermission(
    userId: string,
    journalId: string,
) {
    const editor = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            roles: {
                select: {
                    role: true,
                },
            },
        },
    });

    if (!editor) {
        throw new Error("Editor account not found.");
    }

    if (isSuperAdmin(editor)) {
        return;
    }

    const permitted = await prisma.userJournalRole.findFirst({
        where: {
            userId,
            journalId,
            role: {
                in: [...PUBLICATION_ROLES],
            },
        },
        select: {
            id: true,
        },
    });

    if (!permitted) {
        throw new Error(
            "You do not have permission to format articles for this journal.",
        );
    }
}

async function loadSubmissionForFormatting(
    submissionId: string,
) {
    const submission = await prisma.submission.findUnique({
        where: {
            id: submissionId,
        },
        select: {
            id: true,
            title: true,
            journalId: true,
            status: true,

            journal: {
                select: {
                    name: true,
                    shortName: true,

                    settings: {
                        select: {
                            copyrightPolicy: true,
                            license: true,
                        },
                    },
                },
            },

            article: {
                select: {
                    id: true,
                    doi: true,
                    startPage: true,
                    endPage: true,

                    issue: {
                        select: {
                            number: true,

                            volume: {
                                select: {
                                    number: true,
                                    year: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!submission) {
        throw new Error("Submission not found.");
    }

    if (
        submission.status !== "READY_FOR_PUBLICATION" &&
        submission.status !== "PUBLISHED"
    ) {
        throw new Error(
            "Articles can only be formatted once a submission is ready for publication.",
        );
    }

    return submission;
}

export async function generateFormattedArticle(
    submissionId: string,
    input: RawArticleFormattingInput,
): Promise<FormattedArticleContent> {
    const editor = await requireAnyActionRole([
        ...PUBLICATION_ROLES,
    ]);

    const submission =
        await loadSubmissionForFormatting(submissionId);

    await verifyFormattingPermission(
        editor.id,
        submission.journalId,
    );

    return formatArticleContent(input);
}

export type ApproveFormattedArticleInput = {
    submissionId: string;
    content: FormattedArticleContent;
};

export async function approveFormattedArticle({
    submissionId,
    content,
}: ApproveFormattedArticleInput): Promise<{
    productionFileId: string;
}> {
    const editor = await requireAnyActionRole([
        ...PUBLICATION_ROLES,
    ]);

    const submission =
        await loadSubmissionForFormatting(submissionId);

    await verifyFormattingPermission(
        editor.id,
        submission.journalId,
    );

    const volume = submission.article?.issue?.volume;

    const pdfBytes = await renderArticlePdf({
        content,
        metadata: {
            journalName: submission.journal.name,
            journalShortName:
                submission.journal.shortName,
            volumeNumber: volume?.number ?? 0,
            issueNumber:
                submission.article?.issue?.number ?? 0,
            year:
                volume?.year ?? new Date().getFullYear(),
            startPage:
                submission.article?.startPage ?? null,
            endPage: submission.article?.endPage ?? null,
            doi: submission.article?.doi ?? null,
            copyrightPolicy:
                submission.journal.settings
                    ?.copyrightPolicy ?? null,
            license:
                submission.journal.settings?.license ??
                null,
        },
    });

    const file = new File(
        [pdfBytes as BlobPart],
        "formatted-article.pdf",
        {
            type: "application/pdf",
        },
    );

    const latestFile = await prisma.productionFile.findFirst(
        {
            where: {
                submissionId,
                fileType: "PDF_GALLEY",
            },
            orderBy: {
                versionNumber: "desc",
            },
            select: {
                versionNumber: true,
            },
        },
    );

    const nextVersionNumber =
        (latestFile?.versionNumber || 0) + 1;

    const upload = await uploadJournalFile({
        file,
        category: "PDF_GALLEY",
        visibility: "private",

        metadata: {
            category: "PDF_GALLEY",
            journalId: submission.journalId,
            submissionId,
            versionNumber: nextVersionNumber,
        },
    });

    const productionFile =
        await prisma.$transaction(async (tx) => {
            const created = await tx.productionFile.create(
                {
                    data: {
                        submissionId,
                        uploadedById: editor.id,
                        fileType: "PDF_GALLEY",
                        fileName: upload.originalFilename,
                        fileUrl: upload.url,
                        mimeType:
                            upload.mimeType || null,
                        fileSize: upload.size,
                        versionNumber: nextVersionNumber,
                        description:
                            "AI-formatted article galley",
                        isFinal: true,
                    },
                },
            );

            await tx.activityLog.create({
                data: {
                    userId: editor.id,
                    action: "CREATE",
                    entity: "ProductionFile",
                    entityId: created.id,
                    metadata: {
                        event:
                            "AI_FORMATTED_ARTICLE_APPROVED",
                        submissionId,
                        versionNumber:
                            nextVersionNumber,
                        title: content.title,
                        authorCount:
                            content.authors.length,
                    },
                },
            });

            return created;
        });

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/format-article`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/publication`,
    );

    return {
        productionFileId: productionFile.id,
    };
}
