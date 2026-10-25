"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import {
    runFormAction,
    type FormActionState,
} from "@/lib/forms/run-form-action";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";

const MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

const RESOURCE_CATEGORIES = [
    "RESEARCH_METHODOLOGY",
    "DATA_ANALYSIS",
    "ACADEMIC_WRITING",
    "PUBLISHING",
] as const;

const RESOURCE_FORMATS = [
    "ARTICLE",
    "GUIDE",
    "TEMPLATE",
    "VIDEO",
] as const;

const ResourceGuideSchema = z.object({
    journalId: z.string().min(1),

    category: z.enum(RESOURCE_CATEGORIES),

    format: z.enum(RESOURCE_FORMATS).default("GUIDE"),

    title: z.string().trim().min(3).max(200),

    summary: z.string().trim().min(3).max(500),

    body: z.string().trim().optional(),

    externalUrl: z.string().trim().optional(),

    sortOrder: z.coerce.number().int().default(0),

    isPublished: z.coerce.boolean().default(false),
});

function refreshPages() {
    revalidatePath("/admin/resources");
    revalidatePath("/resources");
}

function normalize(
    formData: FormData,
) {
    return ResourceGuideSchema.parse({
        journalId: formData.get("journalId"),

        category: formData.get("category"),

        format: formData.get("format"),

        title: formData.get("title"),

        summary: formData.get("summary"),

        body: formData.get("body"),

        externalUrl: formData.get("externalUrl"),

        sortOrder: formData.get("sortOrder"),

        isPublished: formData.get("isPublished"),
    });
}

async function ensureJournalManager(
    journalId: string,
) {
    const user =
        await requireAnyActionRole([
            ...MANAGER_ROLES,
        ]);

    if (!isSuperAdmin(user)) {
        const access =
            await prisma.userJournalRole.findFirst({
                where: {
                    userId: user.id,
                    journalId,
                    role: {
                        in: [...MANAGER_ROLES],
                    },
                },
            });

        if (!access) {
            throw new Error(
                "Permission denied.",
            );
        }
    }

    return user;
}

export async function createResourceGuide(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const data = normalize(formData);

    const manager = await ensureJournalManager(
        data.journalId,
    );

    const journal = await prisma.journal.findUnique({
        where: {
            id: data.journalId,
        },

        select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
        },
    });

    if (!journal) {
        throw new Error(
            "The selected journal could not be found.",
        );
    }

    if (!journal.isActive) {
        throw new Error(
            "Resource guides cannot be added to an inactive journal.",
        );
    }

    const normalizedBody = data.body?.trim() || null;

    const normalizedExternalUrl =
        data.externalUrl?.trim() || null;

    if (normalizedExternalUrl) {
        try {
            new URL(normalizedExternalUrl);
        } catch {
            throw new Error(
                "Enter a valid external URL.",
            );
        }
    }

    if (!normalizedBody && !normalizedExternalUrl) {
        throw new Error(
            "Provide either guide content or an external URL.",
        );
    }

    const slug = await generateUniqueSlug(
        data.title,
        async (candidate) =>
            !!(await prisma.resourceGuide.findUnique({
                where: {
                    journalId_slug: {
                        journalId: data.journalId,
                        slug: candidate,
                    },
                },
            })),
    );

    await prisma.$transaction(async (tx) => {
        const resource =
            await tx.resourceGuide.create({
                data: {
                    journalId: data.journalId,
                    category: data.category,
                    format: data.format,
                    title: data.title,
                    slug,
                    summary: data.summary,
                    body: normalizedBody,
                    externalUrl: normalizedExternalUrl,
                    sortOrder: data.sortOrder,
                    isPublished: data.isPublished,
                    publishedAt: data.isPublished
                        ? new Date()
                        : null,
                },
            });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "CREATE",
                entity: "ResourceGuide",
                entityId: resource.id,

                metadata: {
                    event: "RESOURCE_GUIDE_CREATED",
                    journalId: journal.id,
                    journalName: journal.name,
                    resourceTitle: resource.title,
                    resourceCategory: resource.category,
                    resourceFormat: resource.format,
                    isPublished: resource.isPublished,
                },
            },
        });
    });

    refreshPages();

    return "Resource guide added.";
    }, { action: "createResourceGuide" });
}

export async function updateResourceGuide(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const resourceId = String(
        formData.get("resourceId") || "",
    ).trim();

    if (!resourceId) {
        throw new Error(
            "Resource guide ID is missing.",
        );
    }

    const data = normalize(formData);

    const manager = await ensureJournalManager(
        data.journalId,
    );

    const existingResource =
        await prisma.resourceGuide.findUnique({
            where: {
                id: resourceId,
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        isActive: true,
                    },
                },
            },
        });

    if (!existingResource) {
        throw new Error(
            "Resource guide not found.",
        );
    }

    if (
        existingResource.journalId !==
        data.journalId
    ) {
        throw new Error(
            "The selected journal does not match this resource guide.",
        );
    }

    if (!existingResource.journal.isActive) {
        throw new Error(
            "Resource guides cannot be updated for an inactive journal.",
        );
    }

    const normalizedBody = data.body?.trim() || null;

    const normalizedExternalUrl =
        data.externalUrl?.trim() || null;

    if (normalizedExternalUrl) {
        try {
            new URL(normalizedExternalUrl);
        } catch {
            throw new Error(
                "Enter a valid external URL.",
            );
        }
    }

    if (!normalizedBody && !normalizedExternalUrl) {
        throw new Error(
            "Provide either guide content or an external URL.",
        );
    }

    const publishedAt =
        !existingResource.publishedAt &&
            data.isPublished
            ? new Date()
            : existingResource.publishedAt;

    await prisma.$transaction(async (tx) => {
        const updatedResource =
            await tx.resourceGuide.update({
                where: {
                    id: resourceId,
                },

                data: {
                    category: data.category,
                    format: data.format,
                    title: data.title,
                    summary: data.summary,
                    body: normalizedBody,
                    externalUrl: normalizedExternalUrl,
                    sortOrder: data.sortOrder,
                    isPublished: data.isPublished,
                    publishedAt,
                },
            });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "ResourceGuide",
                entityId: updatedResource.id,

                metadata: {
                    event: "RESOURCE_GUIDE_UPDATED",
                    journalId:
                        existingResource.journal.id,
                    journalName:
                        existingResource.journal.name,
                    resourceTitle:
                        updatedResource.title,
                    resourceCategory:
                        updatedResource.category,
                    resourceFormat:
                        updatedResource.format,
                    isPublished:
                        updatedResource.isPublished,
                },
            },
        });
    });

    refreshPages();

    return "Resource guide updated.";
    }, { action: "updateResourceGuide" });
}

export async function deleteResourceGuide(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
    const resourceId = String(
        formData.get("resourceId") || "",
    ).trim();

    if (!resourceId) {
        throw new Error(
            "Resource guide ID is missing.",
        );
    }

    const resource =
        await prisma.resourceGuide.findUnique({
            where: {
                id: resourceId,
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

    if (!resource) {
        throw new Error(
            "Resource guide not found.",
        );
    }

    const manager = await ensureJournalManager(
        resource.journalId,
    );

    await prisma.$transaction(async (tx) => {
        await tx.resourceGuide.delete({
            where: {
                id: resourceId,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "DELETE",
                entity: "ResourceGuide",
                entityId: resourceId,

                metadata: {
                    event: "RESOURCE_GUIDE_DELETED",
                    journalId: resource.journal.id,
                    journalName: resource.journal.name,
                    resourceTitle: resource.title,
                    resourceCategory: resource.category,
                    resourceFormat: resource.format,
                },
            },
        });
    });

    refreshPages();

    return "Resource guide deleted.";
    }, { action: "deleteResourceGuide" });
}
