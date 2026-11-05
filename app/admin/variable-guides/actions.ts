"use server";

import { revalidatePath } from "next/cache";

import { draftVariableGuide } from "@/lib/ai/variable-guide";
import { AiUnavailableError } from "@/lib/ai/gemini";
import { isSuperAdmin, requireAnyActionRole } from "@/lib/auth/permissions";
import { runFormAction, type FormActionState } from "@/lib/forms/run-form-action";
import { prisma } from "@/lib/prisma";
import { getToolkitJournalId } from "@/lib/research-toolkit/topics";
import {
    normalizeGuideContent,
    parseDimensions,
    parseIndicators,
    parseLines,
    parseScales,
} from "@/lib/research-toolkit/variable-guide";
import { generateUniqueSlug } from "@/lib/slug";

const MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

const MAX_DRAFTS_PER_REQUEST = 5;

async function requireManager() {
    const user = await requireAnyActionRole([...MANAGER_ROLES]);
    const journalId = await getToolkitJournalId();

    if (!isSuperAdmin(user)) {
        const access = await prisma.userJournalRole.findFirst({
            where: {
                userId: user.id,
                journalId,
                role: { in: [...MANAGER_ROLES] },
            },
        });

        if (!access) {
            throw new Error("Permission denied.");
        }
    }

    return { user, journalId };
}

function refresh(slug?: string) {
    revalidatePath("/admin/variable-guides");
    revalidatePath("/variables");
    if (slug) revalidatePath(`/variables/${slug}`);
}

/** Drafts up to 5 unpublished guides from a list of variable names. */
export async function draftVariableGuides(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const { journalId } = await requireManager();

        const names = [
            ...new Set(
                parseLines(String(formData.get("names") || "")).map((name) =>
                    name.slice(0, 120),
                ),
            ),
        ];

        if (names.length === 0) {
            throw new Error("Enter at least one variable name, one per line.");
        }

        if (names.length > MAX_DRAFTS_PER_REQUEST) {
            throw new Error(
                `Draft at most ${MAX_DRAFTS_PER_REQUEST} variables at a time.`,
            );
        }

        const created: string[] = [];
        const skipped: string[] = [];
        const failed: string[] = [];

        for (const name of names) {
            const existing = await prisma.variableGuide.findFirst({
                where: {
                    journalId,
                    name: { equals: name, mode: "insensitive" },
                },
                select: { id: true },
            });

            if (existing) {
                skipped.push(name);
                continue;
            }

            try {
                const draft = await draftVariableGuide(name);

                const slug = await generateUniqueSlug(
                    draft.name,
                    async (candidate) =>
                        Boolean(
                            await prisma.variableGuide.findUnique({
                                where: {
                                    journalId_slug: { journalId, slug: candidate },
                                },
                                select: { id: true },
                            }),
                        ),
                    "variable",
                );

                await prisma.variableGuide.create({
                    data: {
                        journalId,
                        slug,
                        name: draft.name,
                        discipline: draft.discipline,
                        summary: draft.summary,
                        content: draft.content,
                    },
                });

                created.push(draft.name);
            } catch (error) {
                if (error instanceof AiUnavailableError) {
                    failed.push(name);
                    continue;
                }

                throw error;
            }
        }

        refresh();

        const parts = [
            created.length ? `Drafted: ${created.join(", ")}.` : "",
            skipped.length ? `Already exists: ${skipped.join(", ")}.` : "",
            failed.length
                ? `AI busy, try again: ${failed.join(", ")}.`
                : "",
        ].filter(Boolean);

        return `${parts.join(" ")} Review each draft below before publishing.`;
    }, { action: "draftVariableGuides" });
}

export async function saveVariableGuide(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const { journalId } = await requireManager();

        const id = String(formData.get("id") || "");
        const get = (key: string) => String(formData.get(key) || "").trim();

        const guide = await prisma.variableGuide.findFirst({
            where: { id, journalId },
            select: { slug: true, publishedAt: true },
        });

        if (!guide) {
            throw new Error("Guide not found.");
        }

        const name = get("name");
        const summary = get("summary");

        if (name.length < 2) throw new Error("Name is required.");
        if (summary.length < 10) throw new Error("Write a short summary.");

        const content = normalizeGuideContent({
            definition: get("definition"),
            measurementType: get("measurementType"),
            dimensions: parseDimensions(get("dimensions")),
            scales: parseScales(get("scales")),
            secondaryIndicators: parseIndicators(get("secondaryIndicators")),
            relatedVariables: parseLines(get("relatedVariables")),
            exampleTopics: parseLines(get("exampleTopics")),
            researchTips: parseLines(get("researchTips")),
        });

        const isPublished = formData.get("isPublished") === "on";

        await prisma.variableGuide.update({
            where: { id },
            data: {
                name: name.slice(0, 120),
                discipline: get("discipline").slice(0, 80),
                summary: summary.slice(0, 300),
                content,
                isPublished,
                publishedAt: isPublished
                    ? (guide.publishedAt ?? new Date())
                    : guide.publishedAt,
            },
        });

        refresh(guide.slug);

        return isPublished ? "Saved and published." : "Saved as draft.";
    }, { action: "saveVariableGuide" });
}

export async function deleteVariableGuide(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const { journalId } = await requireManager();

        const id = String(formData.get("id") || "");

        const guide = await prisma.variableGuide.findFirst({
            where: { id, journalId },
            select: { slug: true },
        });

        if (!guide) {
            throw new Error("Guide not found.");
        }

        await prisma.variableGuide.delete({ where: { id } });

        refresh(guide.slug);

        return "Guide deleted.";
    }, { action: "deleteVariableGuide" });
}
