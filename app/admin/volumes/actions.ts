"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import {
    runFormAction,
    type FormActionState,
} from "@/lib/forms/run-form-action";

function refreshVolumePages() {
    revalidatePath("/admin/volumes");
    revalidatePath("/admin/issues");
    revalidatePath("/archives");
    revalidatePath("/current-issue");
}

async function verifyVolumeAdminPermission(
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

    // Global administrators can manage every journal
    const isGlobalAdministrator = administrator.roles.some(
        (roleRecord) =>
            roleRecord.role === "SUPER_ADMIN" ||
            roleRecord.role === "ADMIN",
    );

    if (isGlobalAdministrator) {
        return;
    }

    // Otherwise, require admin permission for the specific journal
    const hasJournalPermission = administrator.roles.some(
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

export async function createVolume(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const journalId = String(
        formData.get("journalId") || "",
    ).trim();

    const number = Number(
        formData.get("number"),
    );

    const year = Number(
        formData.get("year"),
    );

    const title = String(
        formData.get("title") || "",
    ).trim();

    const description = String(
        formData.get("description") || "",
    ).trim();

    if (!journalId) {
        throw new Error("Select a journal.");
    }

    if (!Number.isInteger(number) || number < 1) {
        throw new Error(
            "Volume number must be a positive whole number.",
        );
    }

    if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > 2200
    ) {
        throw new Error("Enter a valid volume year.");
    }

    const journal = await prisma.journal.findUnique({
        where: {
            id: journalId,
        },
        select: {
            id: true,
            name: true,
            isActive: true,
        },
    });

    if (!journal) {
        throw new Error(
            "The selected journal no longer exists. Please refresh the page and select an active journal."
        );
    }

    await verifyVolumeAdminPermission(
        administrator.id,
        journalId,
    );

    if (!journal.isActive) {
        throw new Error(
            "A volume cannot be created for an inactive journal.",
        );
    }

    const existingVolume =
        await prisma.volume.findUnique({
            where: {
                journalId_number_year: {
                    journalId,
                    number,
                    year,
                },
            },
            select: {
                id: true,
            },
        });

    if (existingVolume) {
        throw new Error(
            `Volume ${number} for ${year} already exists.`,
        );
    }

    await prisma.$transaction(async (tx) => {
        const volume = await tx.volume.create({
            data: {
                journalId,
                number,
                year,
                title: title || null,
                description: description || null,
                isPublished: false,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "CREATE",
                entity: "Volume",
                entityId: volume.id,
                metadata: {
                    event: "VOLUME_CREATED",
                    journalId,
                    journalName: journal.name,
                    volumeNumber: number,
                    year,
                },
            },
        });
    });

    refreshVolumePages();

    return `Volume ${number} (${year}) created.`;
    });
}

export async function updateVolume(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const volumeId = String(
        formData.get("volumeId") || "",
    ).trim();

    const number = Number(
        formData.get("number"),
    );

    const year = Number(
        formData.get("year"),
    );

    const title = String(
        formData.get("title") || "",
    ).trim();

    const description = String(
        formData.get("description") || "",
    ).trim();

    if (!volumeId) {
        throw new Error("Volume ID is missing.");
    }

    if (!Number.isInteger(number) || number < 1) {
        throw new Error(
            "Volume number must be a positive whole number.",
        );
    }

    if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > 2200
    ) {
        throw new Error("Enter a valid volume year.");
    }

    const volume = await prisma.volume.findUnique({
        where: {
            id: volumeId,
        },
        select: {
            id: true,
            journalId: true,
            number: true,
            year: true,
            title: true,
            description: true,
        },
    });

    if (!volume) {
        throw new Error("Volume not found.");
    }

    await verifyVolumeAdminPermission(
        administrator.id,
        volume.journalId,
    );

    if (
        number !== volume.number ||
        year !== volume.year
    ) {
        const existingVolume =
            await prisma.volume.findUnique({
                where: {
                    journalId_number_year: {
                        journalId: volume.journalId,
                        number,
                        year,
                    },
                },
                select: {
                    id: true,
                },
            });

        if (
            existingVolume &&
            existingVolume.id !== volumeId
        ) {
            throw new Error(
                `Volume ${number} for ${year} already exists.`,
            );
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.volume.update({
            where: {
                id: volumeId,
            },
            data: {
                number,
                year,
                title: title || null,
                description: description || null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Volume",
                entityId: volumeId,
                metadata: {
                    event: "VOLUME_UPDATED",
                    journalId: volume.journalId,
                    previousNumber: volume.number,
                    number,
                    previousYear: volume.year,
                    year,
                    previousTitle: volume.title,
                    title: title || null,
                    previousDescription:
                        volume.description,
                    description:
                        description || null,
                },
            },
        });
    });

    refreshVolumePages();

    return "Volume updated.";
    });
}

export async function toggleVolumePublished(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const volumeId = String(
        formData.get("volumeId") || "",
    ).trim();

    if (!volumeId) {
        throw new Error("Volume ID is missing.");
    }

    const volume = await prisma.volume.findUnique({
        where: {
            id: volumeId,
        },
        include: {
            issues: {
                select: {
                    id: true,
                    isPublished: true,
                },
            },
        },
    });

    if (!volume) {
        throw new Error("Volume not found.");
    }

    await verifyVolumeAdminPermission(
        administrator.id,
        volume.journalId,
    );

    if (
        !volume.isPublished &&
        volume.issues.length === 0
    ) {
        throw new Error(
            "Create at least one issue before publishing this volume.",
        );
    }

    if (
        volume.isPublished &&
        volume.issues.some(
            (issue) => issue.isPublished,
        )
    ) {
        throw new Error(
            "A volume containing published issues cannot be unpublished.",
        );
    }

    let nextIsPublished = !volume.isPublished;

    await prisma.$transaction(async (tx) => {
        const updatedVolume =
            await tx.volume.update({
                where: {
                    id: volumeId,
                },
                data: {
                    isPublished:
                        !volume.isPublished,
                },
            });

        nextIsPublished = updatedVolume.isPublished;

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Volume",
                entityId: volumeId,
                metadata: {
                    event: updatedVolume.isPublished
                        ? "VOLUME_PUBLISHED"
                        : "VOLUME_UNPUBLISHED",
                    journalId: volume.journalId,
                    previousIsPublished:
                        volume.isPublished,
                    isPublished:
                        updatedVolume.isPublished,
                },
            },
        });
    });

    refreshVolumePages();

    return nextIsPublished
        ? "Volume published."
        : "Volume unpublished.";
    });
}

export async function deleteVolume(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const volumeId = String(
        formData.get("volumeId") || "",
    ).trim();

    if (!volumeId) {
        throw new Error("Volume ID is missing.");
    }

    const volume = await prisma.volume.findUnique({
        where: {
            id: volumeId,
        },
        include: {
            issues: {
                include: {
                    articles: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
    });

    if (!volume) {
        throw new Error("Volume not found.");
    }

    await verifyVolumeAdminPermission(
        administrator.id,
        volume.journalId,
    );

    if (volume.isPublished) {
        throw new Error(
            "A published volume cannot be deleted. Unpublish it first.",
        );
    }

    const articleCount = volume.issues.reduce(
        (total, issue) =>
            total + issue.articles.length,
        0,
    );

    if (articleCount > 0) {
        throw new Error(
            "This volume cannot be deleted because it contains assigned articles.",
        );
    }

    if (
        volume.issues.some(
            (issue) =>
                issue.isPublished ||
                issue.isCurrent,
        )
    ) {
        throw new Error(
            "This volume cannot be deleted while it contains a published or current issue.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.issue.deleteMany({
            where: {
                volumeId,
            },
        });

        await tx.volume.delete({
            where: {
                id: volumeId,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "DELETE",
                entity: "Volume",
                entityId: volumeId,
                metadata: {
                    event: "VOLUME_DELETED",
                    journalId: volume.journalId,
                    volumeNumber: volume.number,
                    year: volume.year,
                    deletedIssueCount:
                        volume.issues.length,
                },
            },
        });
    });

    refreshVolumePages();

    return "Volume deleted.";
    });
}
