"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function publishSubmission(
    formData: FormData,
) {
    const editor =
        await requireAnyActionRole(EDITORIAL_ROLES);

    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const issueId = String(
        formData.get("issueId") || "",
    ).trim();

    const doi = String(
        formData.get("doi") || "",
    ).trim();

    const publicationDateValue = String(
        formData.get("publicationDate") || "",
    ).trim();

    const pdfUrl = String(
        formData.get("pdfUrl") || "",
    ).trim();

    if (!submissionId) {
        throw new Error(
            "Submission ID is missing.",
        );
    }

    if (!issueId) {
        throw new Error("Select an issue.");
    }

    if (!publicationDateValue) {
        throw new Error(
            "Publication date is required.",
        );
    }

    const publicationDate = new Date(
        `${publicationDateValue}T12:00:00`,
    );

    if (
        Number.isNaN(
            publicationDate.getTime(),
        )
    ) {
        throw new Error(
            "The publication date is invalid.",
        );
    }

    const submission =
        await prisma.submission.findUnique({
            where: {
                id: submissionId,
            },

            include: {
                author: true,
                journal: true,

                submissionAuthors: {
                    orderBy: {
                        sortOrder: "asc",
                    },
                },

                keywords: {
                    include: {
                        keyword: true,
                    },
                },

                productionFiles: {
                    where: {
                        isFinal: true,
                    },

                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });

    if (!submission) {
        throw new Error(
            "Submission not found.",
        );
    }

    if (
        submission.status !==
        "READY_FOR_PUBLICATION"
    ) {
        throw new Error(
            "Only a submission ready for publication can be published.",
        );
    }

    const issue =
        await prisma.issue.findUnique({
            where: {
                id: issueId,
            },

            include: {
                volume: true,
            },
        });

    if (!issue) {
        throw new Error(
            "Issue not found.",
        );
    }

    if (
        issue.journalId !==
        submission.journalId
    ) {
        throw new Error(
            "The selected issue does not belong to this journal.",
        );
    }

    if (!isSuperAdmin(editor)) {
        const publicationRole =
            await prisma.userJournalRole.findFirst({
                where: {
                    userId: editor.id,
                    journalId:
                        submission.journalId,
                    role: {
                        in: [
                            "SUPER_ADMIN",
                            "ADMIN",
                            "EDITOR_IN_CHIEF",
                            "MANAGING_EDITOR",
                            "SECTION_EDITOR",
                            "PUBLISHER",
                        ],
                    },
                },

                select: {
                    id: true,
                },
            });

        if (!publicationRole) {
            throw new Error(
                "You do not have publication permission for this journal.",
            );
        }
    }

    const finalPdf =
        submission.productionFiles.find(
            (file) =>
                file.fileType ===
                "PDF_GALLEY" ||
                file.fileType ===
                "FINAL_PUBLICATION_FILE" ||
                file.fileType ===
                "PROOF_FILE",
        );

    const articlePdfUrl = finalPdf
        ? `/api/production-files/${finalPdf.id}/download`
        : pdfUrl || null;

    const baseSlug = slugify(
        submission.title,
    );

    const existingArticle =
        await prisma.article.findUnique({
            where: {
                submissionId,
            },
        });

    const articleSlug =
        existingArticle?.slug ||
        `${baseSlug}-${submission.id.slice(-6)}`;

    const publicationAuthors =
        submission.submissionAuthors.length > 0
            ? submission.submissionAuthors
            : [
                {
                    fullName:
                        submission.author.name,
                    email:
                        submission.author.email,
                    affiliation:
                        submission.author
                            .affiliation,
                    department: null,
                    country:
                        submission.author
                            .country,
                    orcid:
                        submission.author.orcid,
                    isCorresponding: true,
                    sortOrder: 1,
                },
            ];

    await prisma.$transaction(
        async (tx) => {
            const article =
                await tx.article.upsert({
                    where: {
                        submissionId,
                    },

                    update: {
                        issueId,
                        journalId:
                            submission.journalId,
                        title:
                            submission.title,
                        abstract:
                            submission.abstract,
                        pdfUrl:
                            articlePdfUrl,
                        doi: doi || null,
                        status:
                            "PUBLISHED",
                        publishedAt:
                            publicationDate,
                    },

                    create: {
                        journalId:
                            submission.journalId,
                        issueId,
                        submissionId,
                        title:
                            submission.title,
                        slug:
                            articleSlug,
                        abstract:
                            submission.abstract,
                        pdfUrl:
                            articlePdfUrl,
                        doi: doi || null,
                        status:
                            "PUBLISHED",
                        publishedAt:
                            publicationDate,
                    },
                });

            await tx.articleAuthor.deleteMany({
                where: {
                    articleId:
                        article.id,
                },
            });

            await tx.articleAuthor.createMany({
                data: publicationAuthors.map(
                    (
                        publicationAuthor,
                        index,
                    ) => ({
                        articleId:
                            article.id,
                        fullName:
                            publicationAuthor.fullName,
                        email:
                            publicationAuthor.email ||
                            null,
                        affiliation:
                            publicationAuthor.affiliation ||
                            null,
                        country:
                            publicationAuthor.country ||
                            null,
                        orcid:
                            publicationAuthor.orcid ||
                            null,
                        isCorresponding:
                            publicationAuthor.isCorresponding,
                        sortOrder:
                            publicationAuthor.sortOrder ||
                            index + 1,
                    }),
                ),
            });

            await tx.articleKeyword.deleteMany({
                where: {
                    articleId:
                        article.id,
                },
            });

            if (
                submission.keywords.length >
                0
            ) {
                await tx.articleKeyword.createMany({
                    data: submission.keywords.map(
                        (
                            submissionKeyword,
                        ) => ({
                            articleId:
                                article.id,
                            keywordId:
                                submissionKeyword.keywordId,
                        }),
                    ),
                });
            }

            if (doi) {
                await tx.doiRecord.upsert({
                    where: {
                        doi,
                    },

                    update: {
                        articleId:
                            article.id,
                        status:
                            "PENDING",
                        metadata: {
                            title:
                                submission.title,
                            journal:
                                submission.journal
                                    .name,
                            issueId,
                            volumeNumber:
                                issue.volume
                                    .number,
                            issueNumber:
                                issue.number,
                            publicationDate:
                                publicationDate.toISOString(),
                            authors:
                                publicationAuthors.map(
                                    (
                                        publicationAuthor,
                                    ) => ({
                                        fullName:
                                            publicationAuthor.fullName,
                                        email:
                                            publicationAuthor.email ||
                                            null,
                                        affiliation:
                                            publicationAuthor.affiliation ||
                                            null,
                                        country:
                                            publicationAuthor.country ||
                                            null,
                                        orcid:
                                            publicationAuthor.orcid ||
                                            null,
                                        sortOrder:
                                            publicationAuthor.sortOrder,
                                    }),
                                ),
                        },
                    },

                    create: {
                        articleId:
                            article.id,
                        doi,
                        status:
                            "PENDING",
                        metadata: {
                            title:
                                submission.title,
                            journal:
                                submission.journal
                                    .name,
                            issueId,
                            volumeNumber:
                                issue.volume
                                    .number,
                            issueNumber:
                                issue.number,
                            publicationDate:
                                publicationDate.toISOString(),
                            authors:
                                publicationAuthors.map(
                                    (
                                        publicationAuthor,
                                    ) => ({
                                        fullName:
                                            publicationAuthor.fullName,
                                        email:
                                            publicationAuthor.email ||
                                            null,
                                        affiliation:
                                            publicationAuthor.affiliation ||
                                            null,
                                        country:
                                            publicationAuthor.country ||
                                            null,
                                        orcid:
                                            publicationAuthor.orcid ||
                                            null,
                                        sortOrder:
                                            publicationAuthor.sortOrder,
                                    }),
                                ),
                        },
                    },
                });
            }

            await tx.submission.update({
                where: {
                    id: submissionId,
                },

                data: {
                    status:
                        "PUBLISHED",
                },
            });

            await tx.notification.create({
                data: {
                    userId:
                        submission.authorId,
                    type:
                        "PUBLICATION",
                    title:
                        "Article Published",
                    message:
                        `Your article "${submission.title}" has been published.`,
                    link:
                        `/author/submissions/${submissionId}`,
                },
            });

            await tx.activityLog.create({
                data: {
                    userId:
                        editor.id,
                    action:
                        "PUBLISH_ARTICLE",
                    entity:
                        "Article",
                    entityId:
                        article.id,
                    metadata: {
                        event: "ARTICLE_PUBLISHED",
                        submissionId,
                        issueId,
                        journalId: submission.journalId,
                        articleSlug,
                        doi: doi || null,
                        authorCount:
                            publicationAuthors.length,
                        authors:
                            publicationAuthors.map(
                                (
                                    publicationAuthor,
                                ) => ({
                                    fullName:
                                        publicationAuthor.fullName,
                                    sortOrder:
                                        publicationAuthor.sortOrder,
                                    isCorresponding:
                                        publicationAuthor.isCorresponding,
                                }),
                            ),
                        publishedAt:
                            publicationDate.toISOString(),
                    },
                },
            });
        },
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/publication`,
    );

    revalidatePath(
        `/author/submissions/${submissionId}`,
    );

    revalidatePath(
        "/current-issue",
    );

    revalidatePath(
        "/archives",
    );

    revalidatePath(
        "/admin/articles",
    );

    revalidatePath(
        "/admin/issues",
    );

    revalidatePath(
        "/editor/dashboard",
    );

    revalidatePath(
        "/author/dashboard",
    );

    redirect(
        `/editor/submissions/${submissionId}`,
    );
}