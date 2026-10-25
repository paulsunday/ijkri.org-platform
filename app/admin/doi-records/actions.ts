"use server";

import { revalidatePath } from "next/cache";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { submitDepositToCrossref } from "@/lib/doi/crossref-client";
import { buildCrossrefDepositXml } from "@/lib/doi/crossref-xml";
import { prisma } from "@/lib/prisma";
import {
    runFormAction,
    type FormActionState,
} from "@/lib/forms/run-form-action";

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

const DOI_MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

async function verifyDoiManager(
    userId: string,
    journalId: string,
) {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            roles: true,
        },
    });

    if (!user) {
        throw new Error("User account not found.");
    }

    if (isSuperAdmin(user)) {
        return;
    }

    const role = await prisma.userJournalRole.findFirst({
        where: {
            userId,
            journalId,
            role: {
                in: [...DOI_MANAGER_ROLES],
            },
        },
        select: {
            id: true,
        },
    });

    if (!role) {
        throw new Error(
            "You do not have DOI management permission for this journal.",
        );
    }
}

function refreshDoiPages() {
    revalidatePath("/admin/doi-records");
    revalidatePath("/admin/articles");
    revalidatePath("/current-issue");
    revalidatePath("/archives");
}

export async function markDoiRegistered(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const user = await requireAnyActionRole([
        ...DOI_MANAGER_ROLES,
    ]);

    const doiRecordId = String(
        formData.get("doiRecordId") || "",
    ).trim();

    if (!doiRecordId) {
        throw new Error("DOI record ID is missing.");
    }

    const record = await prisma.doiRecord.findUnique({
        where: {
            id: doiRecordId,
        },
        include: {
            article: {
                select: {
                    id: true,
                    title: true,
                    journalId: true,
                },
            },
        },
    });

    if (!record) {
        throw new Error("DOI record not found.");
    }

    if (!record.article) {
        throw new Error(
            "This DOI record is not linked to an article.",
        );
    }

    const article = record.article;

    await verifyDoiManager(
        user.id,
        article.journalId,
    );

    const registeredAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.doiRecord.update({
            where: {
                id: doiRecordId,
            },
            data: {
                status: "REGISTERED",
                registeredAt,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: user.id,
                action: "REGISTER_DOI",
                entity: "DoiRecord",
                entityId: doiRecordId,
                metadata: {
                    event: "DOI_MARKED_REGISTERED",
                    articleId: article.id,
                    articleTitle: article.title,
                    journalId: article.journalId,
                    doi: record.doi,
                    previousStatus: record.status,
                    registeredAt:
                        registeredAt.toISOString(),
                },
            },
        });
    });

    refreshDoiPages();

    return "DOI marked as registered.";
    });
}

export async function markDoiFailed(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const user = await requireAnyActionRole([
        ...DOI_MANAGER_ROLES,
    ]);

    const doiRecordId = String(
        formData.get("doiRecordId") || "",
    ).trim();

    const failureReason = String(
        formData.get("failureReason") || "",
    ).trim();

    if (!doiRecordId) {
        throw new Error("DOI record ID is missing.");
    }

    if (!failureReason) {
        throw new Error(
            "Enter the reason the DOI registration failed.",
        );
    }

    const record = await prisma.doiRecord.findUnique({
        where: {
            id: doiRecordId,
        },
        include: {
            article: {
                select: {
                    id: true,
                    title: true,
                    journalId: true,
                },
            },
        },
    });

    if (!record) {
        throw new Error("DOI record not found.");
    }

    if (!record.article) {
        throw new Error(
            "This DOI record is not linked to an article.",
        );
    }

    const article = record.article;

    await verifyDoiManager(
        user.id,
        article.journalId,
    );

    const oldMetadata =
        record.metadata &&
            typeof record.metadata === "object" &&
            !Array.isArray(record.metadata)
            ? record.metadata
            : {};

    const failedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.doiRecord.update({
            where: {
                id: doiRecordId,
            },
            data: {
                status: "FAILED",
                registeredAt: null,
                metadata: {
                    ...oldMetadata,
                    failureReason,
                    failedAt: failedAt.toISOString(),
                },
            },
        });

        await tx.activityLog.create({
            data: {
                userId: user.id,
                action: "UPDATE",
                entity: "DoiRecord",
                entityId: doiRecordId,
                metadata: {
                    event: "DOI_MARKED_FAILED",
                    articleId: article.id,
                    doi: record.doi,
                    previousStatus: record.status,
                    failureReason,
                    failedAt: failedAt.toISOString(),
                },
            },
        });
    });

    refreshDoiPages();

    return "DOI marked as failed.";
    });
}

export async function resetDoiToPending(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const user = await requireAnyActionRole([
        ...DOI_MANAGER_ROLES,
    ]);

    const doiRecordId = String(
        formData.get("doiRecordId") || "",
    ).trim();

    if (!doiRecordId) {
        throw new Error("DOI record ID is missing.");
    }

    const record = await prisma.doiRecord.findUnique({
        where: {
            id: doiRecordId,
        },
        include: {
            article: {
                select: {
                    id: true,
                    journalId: true,
                },
            },
        },
    });

    if (!record) {
        throw new Error("DOI record not found.");
    }

    if (!record.article) {
        throw new Error(
            "This DOI record is not linked to an article.",
        );
    }

    const article = record.article;

    await verifyDoiManager(
        user.id,
        article.journalId,
    );

    await prisma.$transaction(async (tx) => {
        await tx.doiRecord.update({
            where: {
                id: doiRecordId,
            },
            data: {
                status: "PENDING",
                registeredAt: null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: user.id,
                action: "UPDATE",
                entity: "DoiRecord",
                entityId: doiRecordId,
                metadata: {
                    event: "DOI_RESET_TO_PENDING",
                    articleId: article.id,
                    doi: record.doi,
                    previousStatus: record.status,
                },
            },
        });
    });

    refreshDoiPages();

    return "DOI reset to pending.";
    });
}

function getCrossrefDepositorInfo() {
    const depositorName =
        process.env.CROSSREF_DEPOSITOR_NAME?.trim();

    const depositorEmail =
        process.env.CROSSREF_DEPOSITOR_EMAIL?.trim();

    const registrant =
        process.env.CROSSREF_REGISTRANT?.trim();

    if (!depositorName || !depositorEmail || !registrant) {
        throw new Error(
            "Crossref depositor details are not configured. Set CROSSREF_DEPOSITOR_NAME, CROSSREF_DEPOSITOR_EMAIL and CROSSREF_REGISTRANT.",
        );
    }

    return {
        depositorName,
        depositorEmail,
        registrant,
    };
}

/**
 * Submits a DOI record's article metadata to Crossref for real
 * registration (against CROSSREF_DEPOSIT_ENDPOINT, defaulting to
 * the Crossref test system). Falls back to marking the record
 * FAILED on any error so the manual escape hatch actions above
 * remain available.
 */
export async function submitDoiRegistration(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const user = await requireAnyActionRole([
        ...DOI_MANAGER_ROLES,
    ]);

    const doiRecordId = String(
        formData.get("doiRecordId") || "",
    ).trim();

    if (!doiRecordId) {
        throw new Error("DOI record ID is missing.");
    }

    const record = await prisma.doiRecord.findUnique({
        where: {
            id: doiRecordId,
        },
        include: {
            article: {
                include: {
                    journal: true,

                    issue: {
                        include: {
                            volume: true,
                        },
                    },

                    authors: {
                        orderBy: {
                            sortOrder: "asc",
                        },
                    },
                },
            },
        },
    });

    if (!record) {
        throw new Error("DOI record not found.");
    }

    if (!record.article) {
        throw new Error(
            "This DOI record is not linked to an article.",
        );
    }

    const article = record.article;

    await verifyDoiManager(
        user.id,
        article.journalId,
    );

    if (!article.issue) {
        throw new Error(
            "The article must be assigned to an issue before it can be submitted to Crossref.",
        );
    }

    if (!article.publishedAt) {
        throw new Error(
            "The article must have a publication date before it can be submitted to Crossref.",
        );
    }

    try {
        const depositor = getCrossrefDepositorInfo();

        const depositXml = buildCrossrefDepositXml({
            article: {
                title: article.title,
                abstract: article.abstract,
                doi: record.doi,
                slug: article.slug,
                startPage: article.startPage,
                endPage: article.endPage,
                publishedAt: article.publishedAt,
                authors: article.authors.map(
                    (author) => ({
                        fullName: author.fullName,
                        orcid: author.orcid,
                    }),
                ),
            },
            journal: {
                name: article.journal.name,
                shortName: article.journal.shortName,
                issnPrint: article.journal.issnPrint,
                issnOnline: article.journal.issnOnline,
            },
            issue: {
                number: article.issue.number,
            },
            volume: {
                number: article.issue.volume.number,
                year: article.issue.volume.year,
            },
            siteUrl,
            depositor,
        });

        const submission =
            await submitDepositToCrossref(depositXml);

        const registeredAt = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.doiRecord.update({
                where: {
                    id: doiRecordId,
                },
                data: {
                    status: "REGISTERED",
                    registeredAt,
                    metadata: {
                        crossrefResponse:
                            submission.responseBody.slice(
                                0,
                                2000,
                            ),
                        submittedAt:
                            registeredAt.toISOString(),
                    },
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: user.id,
                    action: "REGISTER_DOI",
                    entity: "DoiRecord",
                    entityId: doiRecordId,
                    metadata: {
                        event: "DOI_SUBMITTED_TO_CROSSREF",
                        articleId: article.id,
                        articleTitle: article.title,
                        journalId: article.journalId,
                        doi: record.doi,
                        previousStatus: record.status,
                        registeredAt:
                            registeredAt.toISOString(),
                    },
                },
            });
        });
    } catch (error) {
        const failureReason =
            error instanceof Error
                ? error.message
                : "An unknown Crossref submission error occurred.";

        const failedAt = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.doiRecord.update({
                where: {
                    id: doiRecordId,
                },
                data: {
                    status: "FAILED",
                    registeredAt: null,
                    metadata: {
                        failureReason,
                        failedAt: failedAt.toISOString(),
                    },
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: user.id,
                    action: "UPDATE",
                    entity: "DoiRecord",
                    entityId: doiRecordId,
                    metadata: {
                        event: "DOI_CROSSREF_SUBMISSION_FAILED",
                        articleId: article.id,
                        doi: record.doi,
                        previousStatus: record.status,
                        failureReason,
                        failedAt: failedAt.toISOString(),
                    },
                },
            });
        });

        throw new Error(failureReason);
    }

    refreshDoiPages();

    return "DOI submitted to Crossref.";
    });
}
