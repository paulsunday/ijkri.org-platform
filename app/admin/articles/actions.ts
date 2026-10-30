"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { embedPublishedArticlePdfMetadata } from "@/lib/pdf/publish-metadata";
import { prisma } from "@/lib/prisma";
import { processAmbassadorPublicationEvent } from "@/lib/ambassador/process-publication-event";
import { uploadJournalFile } from "@/lib/storage/blob";
import {
    runFormAction,
    type FormActionState,
} from "@/lib/forms/run-form-action";

const VALID_ARTICLE_STATUSES = [
    "DRAFT",
    "SCHEDULED",
    "PUBLISHED",
    "ARCHIVED",
] as const;

const ISSN_PATTERN = /^\d{4}-\d{3}[\dX]$/;

type ArticleStatusValue =
    (typeof VALID_ARTICLE_STATUSES)[number];

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function changeArticleStatusMessage(
    status: ArticleStatusValue,
) {
    switch (status) {
        case "PUBLISHED":
            return "Article published.";

        case "SCHEDULED":
            return "Article scheduled.";

        case "DRAFT":
            return "Article returned to draft.";

        case "ARCHIVED":
            return "Article archived.";

        default:
            return "Article status updated.";
    }
}

function refreshArticlePages(articleSlug?: string) {
    revalidatePath("/admin/articles");
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    revalidatePath("/search");
    revalidatePath("/sitemap.xml");
    revalidatePath("/author/dashboard");

    if (articleSlug) {
        revalidatePath(`/articles/${articleSlug}`);
    }
}

async function verifyArticleAdminPermission(
    administratorId: string,
    journalId: string,
) {
    const administrator = await prisma.user.findUnique({
        where: {
            id: administratorId,
        },
        select: {
            roles: {
                select: {
                    role: true,
                    journalId: true,
                },
            },
        },
    });

    if (!administrator) {
        throw new Error("Administrator account not found.");
    }

    const isSuperAdmin = administrator.roles.some(
        (roleRecord) =>
            roleRecord.role === "SUPER_ADMIN",
    );

    if (isSuperAdmin) {
        return;
    }

    const hasJournalPermission =
        administrator.roles.some(
            (roleRecord) =>
                roleRecord.journalId === journalId &&
                ADMIN_ROLES.includes(roleRecord.role),
        );

    if (!hasJournalPermission) {
        throw new Error(
            "You do not have administrative permission for this journal.",
        );
    }
}

export async function updateArticle(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const articleId = String(
        formData.get("articleId") || "",
    ).trim();

    const title = String(
        formData.get("title") || "",
    ).trim();

    const abstract = String(
        formData.get("abstract") || "",
    ).trim();

    const issueIdValue = String(
        formData.get("issueId") || "",
    ).trim();

    const doi = String(
        formData.get("doi") || "",
    ).trim();

    const issn = String(
        formData.get("issn") || "",
    ).trim();

    const pdfUrl = String(
        formData.get("pdfUrl") || "",
    ).trim();

    const accessType = String(
        formData.get("accessType") || "",
    ).trim();

    const publicationDateValue = String(
        formData.get("publishedAt") || "",
    ).trim();

    if (!articleId) {
        throw new Error("Article ID is missing.");
    }

    if (!title) {
        throw new Error("Article title is required.");
    }

    if (!abstract) {
        throw new Error("Article abstract is required.");
    }

    const article = await prisma.article.findUnique({
        where: {
            id: articleId,
        },
        select: {
            id: true,
            journalId: true,
            title: true,
            slug: true,
            doi: true,
            issn: true,
            status: true,
            submissionId: true,
        },
    });

    if (!article) {
        throw new Error("Article not found.");
    }

    await verifyArticleAdminPermission(
        administrator.id,
        article.journalId,
    );

    if (
        article.status === "PUBLISHED" &&
        !isSuperAdmin(administrator)
    ) {
        throw new Error(
            "Only a super admin can edit a published article. Return it to Draft first, or ask a super admin to make this correction.",
        );
    }

    if (issn && !ISSN_PATTERN.test(issn)) {
        throw new Error(
            "The article ISSN must be in the format 0000-000X.",
        );
    }

    let issueId: string | null = null;

    if (issueIdValue) {
        const issue = await prisma.issue.findUnique({
            where: {
                id: issueIdValue,
            },
            select: {
                id: true,
                journalId: true,
            },
        });

        if (!issue) {
            throw new Error("Selected issue not found.");
        }

        if (issue.journalId !== article.journalId) {
            throw new Error(
                "The selected issue does not belong to this article's journal.",
            );
        }

        issueId = issue.id;
    }

    let publishedAt: Date | null = null;

    if (publicationDateValue) {
        publishedAt = new Date(
            `${publicationDateValue}T12:00:00`,
        );

        if (Number.isNaN(publishedAt.getTime())) {
            throw new Error(
                "The publication date is invalid.",
            );
        }
    }

    if (pdfUrl) {
        try {
            const parsedUrl = new URL(pdfUrl);

            if (
                parsedUrl.protocol !== "https:" &&
                parsedUrl.protocol !== "http:"
            ) {
                throw new Error();
            }
        } catch {
            throw new Error("Enter a valid PDF URL.");
        }
    }

    const validAccessTypes = [
        "OPEN_ACCESS",
        "SUBSCRIPTION",
        "PAY_PER_VIEW",
        "SUBSCRIPTION_OR_PAY_PER_VIEW",
    ] as const;

    if (
        !validAccessTypes.includes(
            accessType as (typeof validAccessTypes)[number],
        )
    ) {
        throw new Error("Select a valid access type.");
    }

    const baseSlug = slugify(title);

    if (!baseSlug) {
        throw new Error(
            "The article title cannot produce a valid URL slug.",
        );
    }

    const newSlug =
        title === article.title
            ? article.slug
            : `${baseSlug}-${articleId.slice(-6)}`;

    const existingSlugArticle =
        await prisma.article.findFirst({
            where: {
                slug: newSlug,
                id: {
                    not: articleId,
                },
            },
            select: {
                id: true,
            },
        });

    if (existingSlugArticle) {
        throw new Error(
            "Another article already uses the generated URL slug.",
        );
    }

    if (doi) {
        const existingDoiArticle =
            await prisma.article.findFirst({
                where: {
                    doi,
                    id: {
                        not: articleId,
                    },
                },
                select: {
                    id: true,
                },
            });

        if (existingDoiArticle) {
            throw new Error(
                "This DOI is already assigned to another article.",
            );
        }
    }

    const updatedArticle =
        await prisma.$transaction(async (tx) => {
            const savedArticle = await tx.article.update({
                where: {
                    id: articleId,
                },
                data: {
                    title,
                    slug: newSlug,
                    abstract,
                    issueId,
                    doi: doi || null,
                    issn: issn || null,
                    pdfUrl: pdfUrl || null,
                    publishedAt,
                    accessType:
                        accessType as (typeof validAccessTypes)[number],
                },
                select: {
                    id: true,
                    slug: true,
                },
            });

            if (doi) {
                await tx.doiRecord.upsert({
                    where: {
                        doi,
                    },
                    update: {
                        articleId,
                        metadata: {
                            articleId,
                            title,
                            updatedAt: new Date().toISOString(),
                        },
                    },
                    create: {
                        articleId,
                        doi,
                        status: "PENDING",
                        metadata: {
                            articleId,
                            title,
                            createdAt: new Date().toISOString(),
                        },
                    },
                });

                if (article.doi && article.doi !== doi) {
                    await tx.doiRecord.deleteMany({
                        where: {
                            articleId,
                            doi: article.doi,
                        },
                    });
                }
            } else if (article.doi) {
                await tx.doiRecord.deleteMany({
                    where: {
                        articleId,
                    },
                });
            }

            await tx.activityLog.create({
                data: {
                    userId: administrator.id,
                    action: "UPDATE",
                    entity: "Article",
                    entityId: articleId,
                    metadata: {
                        event:
                            article.status === "PUBLISHED"
                                ? "ARTICLE_REPUBLISHED"
                                : "ARTICLE_UPDATED",
                        previousTitle: article.title,
                        title,
                        previousSlug: article.slug,
                        slug: newSlug,
                        issueId,
                        previousDoi: article.doi,
                        doi: doi || null,
                        previousIssn: article.issn,
                        issn: issn || null,
                        publishedAt:
                            publishedAt?.toISOString() || null,
                    },
                },
            });

            return savedArticle;
        });

    refreshArticlePages(article.slug);

    if (article.submissionId) {
        revalidatePath(
            `/author/submissions/${article.submissionId}`,
        );
    }

    if (updatedArticle.slug !== article.slug) {
        refreshArticlePages(updatedArticle.slug);
    }

    if (article.status === "PUBLISHED") {
        /*
         * The live PDF may have the old title/DOI/authors baked
         * into its embedded citation metadata, so refresh it to
         * match the correction. Never blocks the save that already
         * committed above.
         */
        after(() =>
            embedPublishedArticlePdfMetadata(articleId),
        );

        return "Article updated and republished.";
    }

    return "Article updated.";
    }, { action: "updateArticle" });
}

export async function replaceArticlePdfFile(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const articleId = String(
        formData.get("articleId") || "",
    ).trim();

    if (!articleId) {
        throw new Error("Article ID is missing.");
    }

    const article = await prisma.article.findUnique({
        where: {
            id: articleId,
        },
        select: {
            id: true,
            journalId: true,
            slug: true,
            status: true,
            submissionId: true,
            pdfUrl: true,
        },
    });

    if (!article) {
        throw new Error("Article not found.");
    }

    await verifyArticleAdminPermission(
        administrator.id,
        article.journalId,
    );

    if (
        article.status === "PUBLISHED" &&
        !isSuperAdmin(administrator)
    ) {
        throw new Error(
            "Only a super admin can replace the file on a published article. Return it to Draft first, or ask a super admin to make this correction.",
        );
    }

    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
        throw new Error(
            "Please select a PDF file to upload.",
        );
    }

    const upload = await uploadJournalFile({
        file,
        category: "FINAL_ARTICLE",
        visibility: article.submissionId
            ? "private"
            : "public",

        metadata: {
            journalId: article.journalId,
            articleId: article.id,
            category: "FINAL_ARTICLE",
        },
    });

    await prisma.$transaction(async (tx) => {
        let nextPdfUrl = upload.url;

        if (article.submissionId) {
            /*
             * Mirrors embedPublishedArticlePdfMetadata's lookup so a
             * manual replacement lands on the same ProductionFile the
             * public download route already serves, instead of
             * orphaning a second copy.
             */
            const finalProductionFile =
                await tx.productionFile.findFirst({
                    where: {
                        submissionId: article.submissionId,
                        fileType: {
                            in: [
                                "PDF_GALLEY",
                                "FINAL_PUBLICATION_FILE",
                                "PROOF_FILE",
                            ],
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    select: {
                        id: true,
                    },
                });

            if (finalProductionFile) {
                await tx.productionFile.update({
                    where: {
                        id: finalProductionFile.id,
                    },
                    data: {
                        fileUrl: upload.url,
                        fileName:
                            upload.originalFilename,
                        mimeType: upload.mimeType,
                        fileSize: upload.size,
                    },
                });

                nextPdfUrl = `/api/production-files/${finalProductionFile.id}/download`;
            } else {
                const created =
                    await tx.productionFile.create({
                        data: {
                            submissionId:
                                article.submissionId,
                            uploadedById:
                                administrator.id,
                            fileType:
                                "FINAL_PUBLICATION_FILE",
                            fileName:
                                upload.originalFilename,
                            fileUrl: upload.url,
                            mimeType: upload.mimeType,
                            fileSize: upload.size,
                            isFinal: true,
                            description:
                                "Super admin replacement file for the published article",
                        },
                    });

                nextPdfUrl = `/api/production-files/${created.id}/download`;
            }
        }

        await tx.article.update({
            where: {
                id: articleId,
            },
            data: {
                pdfUrl: nextPdfUrl,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Article",
                entityId: articleId,
                metadata: {
                    event:
                        article.status === "PUBLISHED"
                            ? "ARTICLE_PDF_FILE_REPLACED_AND_REPUBLISHED"
                            : "ARTICLE_PDF_FILE_REPLACED",
                    previousPdfUrl: article.pdfUrl,
                    fileName: upload.originalFilename,
                },
            },
        });
    });

    refreshArticlePages(article.slug);

    if (article.status === "PUBLISHED") {
        after(() =>
            embedPublishedArticlePdfMetadata(articleId),
        );

        return "PDF file replaced and republished.";
    }

    return "PDF file replaced.";
    }, { action: "replaceArticlePdfFile" });
}

export async function updateCorrespondingAuthor(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const articleId = String(
        formData.get("articleId") || "",
    ).trim();

    const authorId = String(
        formData.get("authorId") || "",
    ).trim();

    if (!articleId) {
        throw new Error("Article ID is missing.");
    }

    const article = await prisma.article.findUnique({
        where: {
            id: articleId,
        },
        select: {
            id: true,
            journalId: true,
            slug: true,
            authors: {
                select: {
                    id: true,
                    fullName: true,
                    isCorresponding: true,
                },
            },
        },
    });

    if (!article) {
        throw new Error("Article not found.");
    }

    await verifyArticleAdminPermission(
        administrator.id,
        article.journalId,
    );

    if (authorId) {
        const selectedAuthor = article.authors.find(
            (author) => author.id === authorId,
        );

        if (!selectedAuthor) {
            throw new Error(
                "The selected author does not belong to this article.",
            );
        }
    }

    const previousCorrespondingAuthor = article.authors.find(
        (author) => author.isCorresponding,
    );

    await prisma.$transaction(async (tx) => {
        await tx.articleAuthor.updateMany({
            where: {
                articleId,
                isCorresponding: true,
            },
            data: {
                isCorresponding: false,
            },
        });

        if (authorId) {
            await tx.articleAuthor.update({
                where: {
                    id: authorId,
                },
                data: {
                    isCorresponding: true,
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Article",
                entityId: articleId,
                metadata: {
                    event: "ARTICLE_CORRESPONDING_AUTHOR_CHANGED",
                    previousCorrespondingAuthorId:
                        previousCorrespondingAuthor?.id || null,
                    previousCorrespondingAuthorName:
                        previousCorrespondingAuthor?.fullName || null,
                    newCorrespondingAuthorId: authorId || null,
                },
            },
        });
    });

    refreshArticlePages(article.slug);

    return "Corresponding author updated.";
    }, { action: "updateCorrespondingAuthor" });
}

export async function changeArticleStatus(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const articleId = String(
        formData.get("articleId") || "",
    ).trim();

    const statusValue = String(
        formData.get("status") || "",
    ).trim();

    if (!articleId) {
        throw new Error("Article ID is missing.");
    }

    if (
        !VALID_ARTICLE_STATUSES.includes(
            statusValue as ArticleStatusValue,
        )
    ) {
        throw new Error("Invalid article status.");
    }

    const status =
        statusValue as ArticleStatusValue;

    const article = await prisma.article.findUnique({
        where: {
            id: articleId,
        },
        select: {
            id: true,
            journalId: true,
            issueId: true,
            submissionId: true,
            publishedAt: true,
            status: true,
            slug: true,
            submission: {
                select: {
                    status: true,
                    invoice: {
                        select: {
                            invoiceNumber: true,
                            status: true,
                        },
                    },
                },
            },
        },
    });

    if (!article) {
        throw new Error("Article not found.");
    }

    await verifyArticleAdminPermission(
        administrator.id,
        article.journalId,
    );

    if (status === "PUBLISHED" && !article.issueId) {
        throw new Error(
            "Assign the article to an issue before publishing it.",
        );
    }

    /*
     * An Article row can now exist before the submission has
     * finished editorial/production review (the in-journal
     * production editor creates one as a working draft). Only
     * allow this action to publish it once the submission has
     * actually completed that workflow at least once — either it
     * is READY_FOR_PUBLICATION now, or it was already PUBLISHED
     * before (re-publishing an archived article).
     */
    if (
        status === "PUBLISHED" &&
        article.submission &&
        article.submission.status !== "READY_FOR_PUBLICATION" &&
        article.submission.status !== "PUBLISHED"
    ) {
        throw new Error(
            "This submission has not completed the editorial and production workflow yet. Publish it from the submission's Publication page once it reaches Ready for Publication.",
        );
    }

    if (status === "PUBLISHED") {
        const invoice = article.submission?.invoice;

        /*
         * PARTIALLY_WAIVED is intentionally excluded: it does not
         * mean the outstanding balance is zero, and this schema
         * has no field tracking what remains owed on a partial
         * waiver. See the matching comment in
         * editor/submissions/[id]/publication/actions.ts.
         */
        const apcSettled =
            !invoice ||
            invoice.status === "PAID" ||
            invoice.status === "WAIVED";

        if (!apcSettled) {
            throw new Error(
                `This article cannot be published until its APC invoice (${invoice?.invoiceNumber}) is paid or waived. Current status: ${invoice?.status
                    .replaceAll("_", " ")
                    .toLowerCase()}.`,
            );
        }
    }

    const nextPublishedAt =
        status === "PUBLISHED"
            ? article.publishedAt || new Date()
            : article.publishedAt;

    await prisma.$transaction(async (tx) => {
        await tx.article.update({
            where: {
                id: articleId,
            },
            data: {
                status,
                publishedAt: nextPublishedAt,
            },
        });

        if (article.submissionId) {
            await tx.submission.update({
                where: {
                    id: article.submissionId,
                },
                data: {
                    status:
                        status === "PUBLISHED"
                            ? "PUBLISHED"
                            : "READY_FOR_PUBLICATION",
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Article",
                entityId: articleId,
                metadata: {
                    event: "ARTICLE_STATUS_CHANGED",
                    previousStatus: article.status,
                    newStatus: status,
                },
            },
        });
    });

    refreshArticlePages(article.slug);

    if (
        status === "PUBLISHED" &&
        article.status !== "PUBLISHED"
    ) {
        /*
         * Runs after the response is sent, but keeps the
         * serverless function alive until it finishes. A
         * failure here should not undo the publication that
         * already committed above, so the helper never throws.
         */
        after(() =>
            embedPublishedArticlePdfMetadata(articleId),
        );

        after(() =>
            processAmbassadorPublicationEvent({
                articleId,
                submissionId: article.submissionId,
            }),
        );
    }

    return changeArticleStatusMessage(status);
    }, { action: "changeArticleStatus" });
}

export async function deleteArticle(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const articleId = String(
        formData.get("articleId") || "",
    ).trim();

    if (!articleId) {
        throw new Error("Article ID is missing.");
    }

    const article = await prisma.article.findUnique({
        where: {
            id: articleId,
        },
        select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            journalId: true,
            submissionId: true,
        },
    });

    if (!article) {
        throw new Error("Article not found.");
    }

    await verifyArticleAdminPermission(
        administrator.id,
        article.journalId,
    );

    if (article.status === "PUBLISHED") {
        throw new Error(
            "A published article cannot be deleted. Archive or return it to draft first.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.doiRecord.deleteMany({
            where: {
                articleId,
            },
        });

        await tx.articleAuthor.deleteMany({
            where: {
                articleId,
            },
        });

        await tx.articleKeyword.deleteMany({
            where: {
                articleId,
            },
        });

        await tx.articleReference.deleteMany({
            where: {
                articleId,
            },
        });

        await tx.article.delete({
            where: {
                id: articleId,
            },
        });

        if (article.submissionId) {
            await tx.submission.update({
                where: {
                    id: article.submissionId,
                },
                data: {
                    status: "READY_FOR_PUBLICATION",
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "DELETE",
                entity: "Article",
                entityId: articleId,
                metadata: {
                    event: "ARTICLE_DELETED",
                    title: article.title,
                    slug: article.slug,
                    journalId: article.journalId,
                    submissionId: article.submissionId,
                },
            },
        });
    });

    refreshArticlePages(article.slug);

    return "Article deleted.";
    }, { action: "deleteArticle" });
}