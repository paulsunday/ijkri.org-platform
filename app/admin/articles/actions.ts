"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

const VALID_ARTICLE_STATUSES = [
    "DRAFT",
    "SCHEDULED",
    "PUBLISHED",
    "ARCHIVED",
] as const;

type ArticleStatusValue =
    (typeof VALID_ARTICLE_STATUSES)[number];

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function refreshArticlePages(articleSlug?: string) {
    revalidatePath("/admin/articles");
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    revalidatePath("/search");
    revalidatePath("/sitemap.xml");

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
    formData: FormData,
) {
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

    const pdfUrl = String(
        formData.get("pdfUrl") || "",
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
            status: true,
        },
    });

    if (!article) {
        throw new Error("Article not found.");
    }

    await verifyArticleAdminPermission(
        administrator.id,
        article.journalId,
    );

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
                    pdfUrl: pdfUrl || null,
                    publishedAt,
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
                        event: "ARTICLE_UPDATED",
                        previousTitle: article.title,
                        title,
                        previousSlug: article.slug,
                        slug: newSlug,
                        issueId,
                        previousDoi: article.doi,
                        doi: doi || null,
                        publishedAt:
                            publishedAt?.toISOString() || null,
                    },
                },
            });

            return savedArticle;
        });

    refreshArticlePages(article.slug);

    if (updatedArticle.slug !== article.slug) {
        refreshArticlePages(updatedArticle.slug);
    }
}

export async function changeArticleStatus(
    formData: FormData,
) {
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
}

export async function deleteArticle(
    formData: FormData,
) {
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
}