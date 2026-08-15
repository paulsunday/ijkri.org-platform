"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";

const MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

const INSIGHT_CATEGORIES = [
    "RESEARCH_METHODS",
    "ACADEMIC_WRITING",
    "STATISTICS",
    "PUBLISHING",
    "RESEARCH_ETHICS",
    "INNOVATION",
    "MANAGEMENT",
    "BUSINESS",
    "TECHNOLOGY",
] as const;

const InsightSchema = z.object({
    journalId: z.string().min(1),

    category: z.enum(INSIGHT_CATEGORIES),

    title: z.string().trim().min(3).max(200),

    excerpt: z.string().trim().min(3).max(500),

    body: z.string().trim().min(3),

    authorName: z.string().trim().optional(),

    coverImage: z.string().trim().optional(),

    isPublished: z.coerce.boolean().default(false),
});

function refreshPages(slug?: string) {
    revalidatePath("/admin/insights");
    revalidatePath("/insights");

    if (slug) {
        revalidatePath(`/insights/${slug}`);
    }
}

function normalize(formData: FormData) {
    return InsightSchema.parse({
        journalId: formData.get("journalId"),
        category: formData.get("category"),
        title: formData.get("title"),
        excerpt: formData.get("excerpt"),
        body: formData.get("body"),
        authorName: formData.get("authorName"),
        coverImage: formData.get("coverImage"),
        isPublished: formData.get("isPublished"),
    });
}

async function ensureJournalManager(journalId: string) {
    const user = await requireAnyActionRole([...MANAGER_ROLES]);

    if (!isSuperAdmin(user)) {
        const access = await prisma.userJournalRole.findFirst({
            where: {
                userId: user.id,
                journalId,
                role: {
                    in: [...MANAGER_ROLES],
                },
            },
        });

        if (!access) {
            throw new Error("Permission denied.");
        }
    }

    return user;
}

function validatedCoverImage(value?: string) {
    const normalized = value?.trim() || null;

    if (normalized) {
        try {
            new URL(normalized);
        } catch {
            throw new Error("Enter a valid cover image URL.");
        }
    }

    return normalized;
}

export async function createInsight(formData: FormData) {
    const data = normalize(formData);

    const manager = await ensureJournalManager(data.journalId);

    const journal = await prisma.journal.findUnique({
        where: { id: data.journalId },
        select: { id: true, name: true, isActive: true },
    });

    if (!journal) {
        throw new Error("The selected journal could not be found.");
    }

    if (!journal.isActive) {
        throw new Error(
            "Insights cannot be added to an inactive journal.",
        );
    }

    const coverImage = validatedCoverImage(data.coverImage);

    const slug = await generateUniqueSlug(
        data.title,
        async (candidate) =>
            !!(await prisma.insight.findUnique({
                where: {
                    journalId_slug: {
                        journalId: data.journalId,
                        slug: candidate,
                    },
                },
            })),
    );

    await prisma.$transaction(async (tx) => {
        const insight = await tx.insight.create({
            data: {
                journalId: data.journalId,
                category: data.category,
                title: data.title,
                slug,
                excerpt: data.excerpt,
                body: data.body,
                authorName: data.authorName?.trim() || null,
                coverImage,
                isPublished: data.isPublished,
                publishedAt: data.isPublished ? new Date() : null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "CREATE",
                entity: "Insight",
                entityId: insight.id,
                metadata: {
                    event: "INSIGHT_CREATED",
                    journalId: journal.id,
                    journalName: journal.name,
                    insightTitle: insight.title,
                    insightCategory: insight.category,
                    isPublished: insight.isPublished,
                },
            },
        });
    });

    refreshPages(slug);
}

export async function updateInsight(formData: FormData) {
    const insightId = String(formData.get("insightId") || "").trim();

    if (!insightId) {
        throw new Error("Insight ID is missing.");
    }

    const data = normalize(formData);

    const manager = await ensureJournalManager(data.journalId);

    const existingInsight = await prisma.insight.findUnique({
        where: { id: insightId },
        include: {
            journal: {
                select: { id: true, name: true, isActive: true },
            },
        },
    });

    if (!existingInsight) {
        throw new Error("Insight not found.");
    }

    if (existingInsight.journalId !== data.journalId) {
        throw new Error(
            "The selected journal does not match this insight.",
        );
    }

    if (!existingInsight.journal.isActive) {
        throw new Error(
            "Insights cannot be updated for an inactive journal.",
        );
    }

    const coverImage = validatedCoverImage(data.coverImage);

    const publishedAt =
        !existingInsight.publishedAt && data.isPublished
            ? new Date()
            : existingInsight.publishedAt;

    await prisma.$transaction(async (tx) => {
        const updatedInsight = await tx.insight.update({
            where: { id: insightId },
            data: {
                category: data.category,
                title: data.title,
                excerpt: data.excerpt,
                body: data.body,
                authorName: data.authorName?.trim() || null,
                coverImage,
                isPublished: data.isPublished,
                publishedAt,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "Insight",
                entityId: updatedInsight.id,
                metadata: {
                    event: "INSIGHT_UPDATED",
                    journalId: existingInsight.journal.id,
                    journalName: existingInsight.journal.name,
                    insightTitle: updatedInsight.title,
                    insightCategory: updatedInsight.category,
                    isPublished: updatedInsight.isPublished,
                },
            },
        });
    });

    refreshPages(existingInsight.slug);
}

export async function deleteInsight(formData: FormData) {
    const insightId = String(formData.get("insightId") || "").trim();

    if (!insightId) {
        throw new Error("Insight ID is missing.");
    }

    const insight = await prisma.insight.findUnique({
        where: { id: insightId },
        include: {
            journal: { select: { id: true, name: true } },
        },
    });

    if (!insight) {
        throw new Error("Insight not found.");
    }

    const manager = await ensureJournalManager(insight.journalId);

    await prisma.$transaction(async (tx) => {
        await tx.insight.delete({ where: { id: insightId } });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "DELETE",
                entity: "Insight",
                entityId: insightId,
                metadata: {
                    event: "INSIGHT_DELETED",
                    journalId: insight.journal.id,
                    journalName: insight.journal.name,
                    insightTitle: insight.title,
                    insightCategory: insight.category,
                },
            },
        });
    });

    refreshPages(insight.slug);
}
