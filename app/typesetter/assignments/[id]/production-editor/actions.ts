"use server";

import { revalidatePath } from "next/cache";

import { isSuperAdmin, requireAnyActionRole } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/generated/prisma";
import { TYPESETTER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { uploadJournalFile } from "@/lib/storage/blob";
import { renderArticlePdf } from "@/lib/pdf/render-article-pdf";
import type { FormattedArticleContent } from "@/lib/ai/format-article";

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function parseReferences(referencesText: string): string[] {
    return referencesText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

async function loadAssignmentForEditing(
    assignmentId: string,
    typesetter: { id: string; roles: { role: UserRole }[] },
) {
    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }

    const assignment = await prisma.productionAssignment.findFirst({
        where: {
            id: assignmentId,
            stage: "TYPESETTING",
            ...(isSuperAdmin(typesetter)
                ? {}
                : {
                    assigneeId: typesetter.id,
                }),
        },
        select: {
            id: true,
            status: true,
            submissionId: true,
            submission: {
                select: {
                    id: true,
                    title: true,
                    abstract: true,
                    journalId: true,
                    submissionAuthors: {
                        select: {
                            id: true,
                        },
                    },
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
                    keywords: {
                        select: {
                            keyword: {
                                select: {
                                    name: true,
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
            },
        },
    });

    if (!assignment) {
        throw new Error(
            "Production assignment not found, or it is not assigned to you.",
        );
    }

    if (
        assignment.status !== "IN_PROGRESS" &&
        assignment.status !== "CHANGES_REQUESTED"
    ) {
        throw new Error(
            "Start this typesetting assignment before editing the production article.",
        );
    }

    return assignment;
}

function refreshEditorPages(assignmentId: string, submissionId: string) {
    revalidatePath(`/typesetter/assignments/${assignmentId}`);
    revalidatePath(
        `/typesetter/assignments/${assignmentId}/production-editor`,
    );
    revalidatePath(`/editor/typesetting`);
    revalidatePath(`/admin/articles`);
    revalidatePath(`/admin/submissions/${submissionId}`);
}

type SaveDraftInput = {
    assignmentId: string;
    title: string;
    abstractHtml: string;
    bodyHtml: string;
    referencesText: string;
};

async function saveDraftInternal(
    input: SaveDraftInput,
): Promise<{ articleId: string; submissionId: string }> {
    const typesetter = await requireAnyActionRole(TYPESETTER_ROLES);

    const assignment = await loadAssignmentForEditing(
        input.assignmentId,
        typesetter,
    );

    const title = input.title.trim() || assignment.submission.title;
    const abstractHtml =
        input.abstractHtml.trim() || assignment.submission.abstract;
    const bodyHtml = input.bodyHtml.trim();
    const references = parseReferences(input.referencesText);

    if (!bodyHtml) {
        throw new Error("The article body cannot be empty.");
    }

    const baseSlug = slugify(title);

    if (!baseSlug) {
        throw new Error(
            "The title cannot produce a valid URL slug.",
        );
    }

    /*
     * Always computed, even though it is only actually used when the
     * upsert takes the `create` path. Prisma validates the full shape
     * of both the `update` and `create` payloads upfront regardless of
     * which branch ends up running, so passing `undefined` here for an
     * already-existing article would fail validation even though
     * `update` never touches `slug` at all.
     */
    const freshSlug = `${baseSlug}-${assignment.submission.id.slice(-6)}`;

    const article = await prisma.$transaction(async (tx) => {
        const savedArticle = await tx.article.upsert({
            where: {
                submissionId: assignment.submission.id,
            },
            update: {
                title,
                abstract: abstractHtml,
                body: bodyHtml,
            },
            create: {
                journalId: assignment.submission.journalId,
                submissionId: assignment.submission.id,
                title,
                slug: freshSlug,
                abstract: abstractHtml,
                body: bodyHtml,
                status: "DRAFT",
            },
            select: {
                id: true,
            },
        });

        await tx.articleReference.deleteMany({
            where: {
                articleId: savedArticle.id,
            },
        });

        if (references.length > 0) {
            await tx.articleReference.createMany({
                data: references.map((citation, index) => ({
                    articleId: savedArticle.id,
                    citation,
                    sortOrder: index + 1,
                })),
            });
        }

        await tx.activityLog.create({
            data: {
                userId: typesetter.id,
                action: "UPDATE",
                entity: "Article",
                entityId: savedArticle.id,
                metadata: {
                    event: "PRODUCTION_DRAFT_SAVED",
                    submissionId: assignment.submission.id,
                    assignmentId: assignment.id,
                    referenceCount: references.length,
                },
            },
        });

        return savedArticle;
    });

    refreshEditorPages(assignment.id, assignment.submission.id);

    return {
        articleId: article.id,
        submissionId: assignment.submission.id,
    };
}

export async function saveProductionDraft(formData: FormData) {
    await saveDraftInternal({
        assignmentId: String(formData.get("assignmentId") || "").trim(),
        title: String(formData.get("title") || ""),
        abstractHtml: String(formData.get("abstractHtml") || ""),
        bodyHtml: String(formData.get("bodyHtml") || ""),
        referencesText: String(formData.get("referencesText") || ""),
    });
}

export async function updateProductionCorrespondingAuthor(
    formData: FormData,
) {
    const typesetter = await requireAnyActionRole(TYPESETTER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();
    const submissionAuthorId = String(
        formData.get("submissionAuthorId") || "",
    ).trim();

    const assignment = await loadAssignmentForEditing(
        assignmentId,
        typesetter,
    );

    if (submissionAuthorId) {
        const belongs = assignment.submission.submissionAuthors.some(
            (author) => author.id === submissionAuthorId,
        );

        if (!belongs) {
            throw new Error(
                "The selected author does not belong to this manuscript.",
            );
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.submissionAuthor.updateMany({
            where: {
                submissionId: assignment.submission.id,
                isCorresponding: true,
            },
            data: {
                isCorresponding: false,
            },
        });

        if (submissionAuthorId) {
            await tx.submissionAuthor.update({
                where: {
                    id: submissionAuthorId,
                },
                data: {
                    isCorresponding: true,
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: typesetter.id,
                action: "UPDATE",
                entity: "SubmissionAuthor",
                entityId: submissionAuthorId || assignment.submission.id,
                metadata: {
                    event: "PRODUCTION_CORRESPONDING_AUTHOR_CHANGED",
                    submissionId: assignment.submission.id,
                    assignmentId: assignment.id,
                },
            },
        });
    });

    refreshEditorPages(assignment.id, assignment.submission.id);
}

export async function buildFormattedContent(
    assignmentId: string,
    formData: FormData,
    typesetter: { id: string; roles: { role: UserRole }[] },
): Promise<{
    content: FormattedArticleContent;
    metadata: Parameters<typeof renderArticlePdf>[0]["metadata"];
    assignment: Awaited<ReturnType<typeof loadAssignmentForEditing>>;
}> {
    const assignment = await loadAssignmentForEditing(
        assignmentId,
        typesetter,
    );

    const title =
        String(formData.get("title") || "").trim() ||
        assignment.submission.title;
    const abstractHtml =
        String(formData.get("abstractHtml") || "").trim() ||
        assignment.submission.abstract;
    const bodyHtml = String(formData.get("bodyHtml") || "").trim();
    const references = parseReferences(
        String(formData.get("referencesText") || ""),
    );

    if (!bodyHtml) {
        throw new Error("The article body cannot be empty.");
    }

    const authors = await prisma.submissionAuthor.findMany({
        where: {
            submissionId: assignment.submission.id,
        },
        orderBy: {
            sortOrder: "asc",
        },
    });

    const keywords = assignment.submission.keywords.map(
        (item) => item.keyword.name,
    );

    const volume = assignment.submission.article?.issue?.volume;

    const content: FormattedArticleContent = {
        title,
        authors: (authors.length > 0
            ? authors
            : [
                {
                    fullName: "Author",
                    affiliation: "",
                    orcid: null,
                    isCorresponding: true,
                },
            ]
        ).map((author) => ({
            fullName: author.fullName,
            affiliation: author.affiliation || "",
            orcid: author.orcid,
            isCorresponding: author.isCorresponding,
        })),
        abstract: "",
        abstractHtml,
        keywords,
        sections: [],
        tables: [],
        figures: [],
        references,
        bodyHtml,
    };

    const metadata = {
        journalName: assignment.submission.journal.name,
        journalShortName: assignment.submission.journal.shortName,
        volumeNumber: volume?.number ?? 0,
        issueNumber: assignment.submission.article?.issue?.number ?? 0,
        year: volume?.year ?? new Date().getFullYear(),
        startPage: assignment.submission.article?.startPage ?? null,
        endPage: assignment.submission.article?.endPage ?? null,
        doi: assignment.submission.article?.doi ?? null,
        copyrightPolicy:
            assignment.submission.journal.settings?.copyrightPolicy ?? null,
        license: assignment.submission.journal.settings?.license ?? null,
    };

    return { content, metadata, assignment };
}

export async function generateProductionPdf(formData: FormData) {
    const typesetter = await requireAnyActionRole(TYPESETTER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    await saveDraftInternal({
        assignmentId,
        title: String(formData.get("title") || ""),
        abstractHtml: String(formData.get("abstractHtml") || ""),
        bodyHtml: String(formData.get("bodyHtml") || ""),
        referencesText: String(formData.get("referencesText") || ""),
    });

    const { content, metadata, assignment } = await buildFormattedContent(
        assignmentId,
        formData,
        typesetter,
    );

    let pdfBytes: Uint8Array;

    try {
        pdfBytes = await renderArticlePdf({ content, metadata });
    } catch (error) {
        logger.error("Production PDF generation failed", error, {
            event: "PRODUCTION_PDF_GENERATION_FAILED",
            assignmentId,
            submissionId: assignment.submission.id,
        });

        throw new Error(
            "The PDF could not be generated. Please try again.",
        );
    }

    const latestPdf = await prisma.productionFile.findFirst({
        where: {
            submissionId: assignment.submission.id,
            fileType: "PDF_GALLEY",
        },
        orderBy: {
            versionNumber: "desc",
        },
        select: {
            versionNumber: true,
        },
    });

    const nextVersionNumber = (latestPdf?.versionNumber || 0) + 1;

    const pdfFile = new File(
        [pdfBytes as BlobPart],
        `${slugify(content.title) || "article"}.pdf`,
        { type: "application/pdf" },
    );

    const pdfUpload = await uploadJournalFile({
        file: pdfFile,
        category: "PDF_GALLEY",
        visibility: "private",
        metadata: {
            category: "PDF_GALLEY",
            journalId: assignment.submission.journalId,
            submissionId: assignment.submission.id,
            assignmentId,
            versionNumber: nextVersionNumber,
        },
    });

    const typesetHtmlFile = new File(
        [content.bodyHtml || ""],
        `${slugify(content.title) || "article"}.html`,
        { type: "text/html" },
    );

    const typesetUpload = await uploadJournalFile({
        file: typesetHtmlFile,
        category: "TYPESET",
        visibility: "private",
        metadata: {
            category: "TYPESET",
            journalId: assignment.submission.journalId,
            submissionId: assignment.submission.id,
            assignmentId,
            versionNumber: nextVersionNumber,
        },
    });

    await prisma.$transaction(async (tx) => {
        const pdfFileRecord = await tx.productionFile.create({
            data: {
                submissionId: assignment.submission.id,
                productionAssignmentId: assignmentId,
                uploadedById: typesetter.id,
                fileType: "PDF_GALLEY",
                fileName: pdfUpload.originalFilename,
                fileUrl: pdfUpload.url,
                mimeType: pdfUpload.mimeType || null,
                fileSize: pdfUpload.size,
                versionNumber: nextVersionNumber,
                description: "Generated in the IJKRI production editor",
                isFinal: false,
            },
        });

        await tx.productionFile.create({
            data: {
                submissionId: assignment.submission.id,
                productionAssignmentId: assignmentId,
                uploadedById: typesetter.id,
                fileType: "TYPESET_DOCUMENT",
                fileName: typesetUpload.originalFilename,
                fileUrl: typesetUpload.url,
                mimeType: typesetUpload.mimeType || null,
                fileSize: typesetUpload.size,
                versionNumber: nextVersionNumber,
                description: "Generated in the IJKRI production editor",
                isFinal: false,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: typesetter.id,
                action: "CREATE",
                entity: "ProductionFile",
                entityId: pdfFileRecord.id,
                metadata: {
                    event: "PRODUCTION_PDF_GENERATED",
                    submissionId: assignment.submission.id,
                    assignmentId,
                    versionNumber: nextVersionNumber,
                },
            },
        });
    });

    refreshEditorPages(assignmentId, assignment.submission.id);
}
