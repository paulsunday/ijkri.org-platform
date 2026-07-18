"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

function refreshIssuePages() {
    revalidatePath("/admin/issues");
    revalidatePath("/admin/volumes");
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    revalidatePath("/admin/articles");
}

async function verifyIssueAdminPermission(
    administratorId: string,
    journalId: string,
) {
    const permission =
        await prisma.userJournalRole.findFirst({
            where: {
                userId: administratorId,
                journalId,
                role: {
                    in: [...ADMIN_ROLES],
                },
            },
            select: {
                id: true,
            },
        });

    if (!permission) {
        throw new Error(
            "You do not have permission to manage this journal.",
        );
    }
}

export async function createIssue(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const volumeId = String(
        formData.get("volumeId") || "",
    ).trim();

    const number = Number(formData.get("number"));

    const title = String(
        formData.get("title") || "",
    ).trim();

    const description = String(
        formData.get("description") || "",
    ).trim();

    const coverImage = String(
        formData.get("coverImage") || "",
    ).trim();

    if (!volumeId) {
        throw new Error("Select a volume.");
    }

    if (!Number.isInteger(number) || number < 1) {
        throw new Error(
            "Issue number must be a positive whole number.",
        );
    }

    const volume =
        await prisma.volume.findUnique({
            where: {
                id: volumeId,
            },
            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });

    if (!volume) {
        throw new Error("Volume not found.");
    }

    await verifyIssueAdminPermission(
        administrator.id,
        volume.journalId,
    );

    if (!volume.journal.isActive) {
        throw new Error(
            "An issue cannot be created for an inactive journal.",
        );
    }

    const existingIssue =
        await prisma.issue.findUnique({
            where: {
                volumeId_number: {
                    volumeId,
                    number,
                },
            },
            select: {
                id: true,
            },
        });

    if (existingIssue) {
        throw new Error(
            `Issue ${number} already exists in Volume ${volume.number}.`,
        );
    }

    const issue = await prisma.issue.create({
        data: {
            journalId: volume.journalId,
            volumeId,
            number,
            title: title || null,
            description: description || null,
            coverImage: coverImage || null,
            isCurrent: false,
            isPublished: false,
        },
    });

    await prisma.activityLog.create({
        data: {
            userId: administrator.id,
            action: "CREATE",
            entity: "Issue",
            entityId: issue.id,
            metadata: {
                event: "ISSUE_CREATED",
                journalId: volume.journalId,
                journalName: volume.journal.name,
                volumeId,
                volumeNumber: volume.number,
                issueNumber: number,
            },
        },
    });

    refreshIssuePages();
}

export async function updateIssue(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const issueId = String(
        formData.get("issueId") || "",
    ).trim();

    const title = String(
        formData.get("title") || "",
    ).trim();

    const description = String(
        formData.get("description") || "",
    ).trim();

    const coverImage = String(
        formData.get("coverImage") || "",
    ).trim();

    if (!issueId) {
        throw new Error("Issue ID is missing.");
    }

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId,
        },
        select: {
            id: true,
            journalId: true,
            title: true,
            description: true,
            coverImage: true,
        },
    });

    if (!issue) {
        throw new Error("Issue not found.");
    }

    await verifyIssueAdminPermission(
        administrator.id,
        issue.journalId,
    );

    await prisma.$transaction(async (tx) => {
        await tx.issue.update({
            where: {
                id: issueId,
            },
            data: {
                title: title || null,
                description: description || null,
                coverImage: coverImage || null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Issue",
                entityId: issueId,
                metadata: {
                    event: "ISSUE_UPDATED",
                    journalId: issue.journalId,
                    previousTitle: issue.title,
                    title: title || null,
                    previousDescription: issue.description,
                    description: description || null,
                    previousCoverImage: issue.coverImage,
                    coverImage: coverImage || null,
                },
            },
        });
    });

    refreshIssuePages();
}

export async function publishIssue(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const issueId = String(
        formData.get("issueId") || "",
    ).trim();

    if (!issueId) {
        throw new Error("Issue ID is missing.");
    }

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId,
        },
        include: {
            volume: true,
            articles: {
                where: {
                    status: "PUBLISHED",
                },
                select: {
                    id: true,
                },
            },
        },
    });

    if (!issue) {
        throw new Error("Issue not found.");
    }

    await verifyIssueAdminPermission(
        administrator.id,
        issue.journalId,
    );

    if (issue.isPublished) {
        throw new Error(
            "This issue is already published.",
        );
    }

    if (issue.articles.length === 0) {
        throw new Error(
            "At least one published article must be assigned before publishing this issue.",
        );
    }

    const publishedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.issue.update({
            where: {
                id: issueId,
            },
            data: {
                isPublished: true,
                publishedAt:
                    issue.publishedAt || publishedAt,
            },
        });

        if (!issue.volume.isPublished) {
            await tx.volume.update({
                where: {
                    id: issue.volumeId,
                },
                data: {
                    isPublished: true,
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Issue",
                entityId: issueId,
                metadata: {
                    event: "ISSUE_PUBLISHED",
                    journalId: issue.journalId,
                    volumeId: issue.volumeId,
                    issueNumber: issue.number,
                    articleCount: issue.articles.length,
                    publishedAt:
                        issue.publishedAt?.toISOString() ||
                        publishedAt.toISOString(),
                },
            },
        });
    });

    refreshIssuePages();
}

export async function unpublishIssue(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const issueId = String(
        formData.get("issueId") || "",
    ).trim();

    if (!issueId) {
        throw new Error("Issue ID is missing.");
    }

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId,
        },
        select: {
            id: true,
            journalId: true,
            volumeId: true,
            number: true,
            isPublished: true,
            isCurrent: true,
        },
    });

    if (!issue) {
        throw new Error("Issue not found.");
    }

    await verifyIssueAdminPermission(
        administrator.id,
        issue.journalId,
    );

    if (!issue.isPublished) {
        throw new Error(
            "This issue is already unpublished.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.issue.update({
            where: {
                id: issueId,
            },
            data: {
                isPublished: false,
                isCurrent: false,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Issue",
                entityId: issueId,
                metadata: {
                    event: "ISSUE_UNPUBLISHED",
                    journalId: issue.journalId,
                    volumeId: issue.volumeId,
                    issueNumber: issue.number,
                    wasCurrent: issue.isCurrent,
                },
            },
        });
    });

    refreshIssuePages();
}

export async function setCurrentIssue(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const issueId = String(
        formData.get("issueId") || "",
    ).trim();

    if (!issueId) {
        throw new Error("Issue ID is missing.");
    }

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId,
        },
        select: {
            id: true,
            journalId: true,
            volumeId: true,
            number: true,
            isPublished: true,
            isCurrent: true,
        },
    });

    if (!issue) {
        throw new Error("Issue not found.");
    }

    await verifyIssueAdminPermission(
        administrator.id,
        issue.journalId,
    );

    if (!issue.isPublished) {
        throw new Error(
            "Only a published issue can be marked as current.",
        );
    }

    if (issue.isCurrent) {
        throw new Error(
            "This issue is already the current issue.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.issue.updateMany({
            where: {
                journalId: issue.journalId,
                isCurrent: true,
            },
            data: {
                isCurrent: false,
            },
        });

        await tx.issue.update({
            where: {
                id: issueId,
            },
            data: {
                isCurrent: true,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Issue",
                entityId: issueId,
                metadata: {
                    event: "ISSUE_MARKED_CURRENT",
                    journalId: issue.journalId,
                    volumeId: issue.volumeId,
                    issueNumber: issue.number,
                },
            },
        });
    });

    refreshIssuePages();
}

export async function clearCurrentIssue(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const issueId = String(
        formData.get("issueId") || "",
    ).trim();

    if (!issueId) {
        throw new Error("Issue ID is missing.");
    }

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId,
        },
        select: {
            id: true,
            journalId: true,
            volumeId: true,
            number: true,
            isCurrent: true,
        },
    });

    if (!issue) {
        throw new Error("Issue not found.");
    }

    await verifyIssueAdminPermission(
        administrator.id,
        issue.journalId,
    );

    if (!issue.isCurrent) {
        throw new Error(
            "This issue is not currently marked as the current issue.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.issue.update({
            where: {
                id: issueId,
            },
            data: {
                isCurrent: false,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Issue",
                entityId: issueId,
                metadata: {
                    event: "CURRENT_ISSUE_CLEARED",
                    journalId: issue.journalId,
                    volumeId: issue.volumeId,
                    issueNumber: issue.number,
                },
            },
        });
    });

    refreshIssuePages();
}

export async function deleteIssue(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const issueId = String(
        formData.get("issueId") || "",
    ).trim();

    if (!issueId) {
        throw new Error("Issue ID is missing.");
    }

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId,
        },
        include: {
            articles: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!issue) {
        throw new Error("Issue not found.");
    }

    await verifyIssueAdminPermission(
        administrator.id,
        issue.journalId,
    );

    if (issue.isPublished) {
        throw new Error(
            "A published issue cannot be deleted. Unpublish it first.",
        );
    }

    if (issue.isCurrent) {
        throw new Error(
            "The current issue cannot be deleted. Clear the current issue first.",
        );
    }

    if (issue.articles.length > 0) {
        throw new Error(
            "This issue cannot be deleted because articles are assigned to it.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.issue.delete({
            where: {
                id: issueId,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "DELETE",
                entity: "Issue",
                entityId: issueId,
                metadata: {
                    event: "ISSUE_DELETED",
                    journalId: issue.journalId,
                    volumeId: issue.volumeId,
                    issueNumber: issue.number,
                },
            },
        });
    });

    refreshIssuePages();
}
