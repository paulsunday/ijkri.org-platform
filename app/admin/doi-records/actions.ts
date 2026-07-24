"use server";

import { revalidatePath } from "next/cache";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

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
    formData: FormData,
) {
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
}

export async function markDoiFailed(
    formData: FormData,
) {
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
}

export async function resetDoiToPending(
    formData: FormData,
) {
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
}
