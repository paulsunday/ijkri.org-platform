"use server";

import { revalidatePath } from "next/cache";

import type { TopicBreakdown } from "@/lib/ai/formulation-checker";
import { requireActionUser } from "@/lib/auth/current-user";
import {
    runFormAction,
    type FormActionState,
} from "@/lib/forms/run-form-action";
import { Prisma } from "@/lib/generated/prisma";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";
import { generateFormulation } from "@/lib/research-toolkit/generate-objectives";

async function loadOwnedTopic(topicId: string, userId: string) {
    const topic = await prisma.researchTopic.findUnique({
        where: {
            id: topicId,
        },
    });

    if (!topic || topic.userId !== userId) {
        throw new Error("Topic not found.");
    }

    // Access can be revoked after a topic was created (e.g. a refund).
    const access = await hasToolkitAccess({
        userId,
        journalId: topic.journalId,
    });

    if (!access) {
        throw new Error(
            "Your access to the workbench is not active. Unlock it from the toolkit page.",
        );
    }

    return topic;
}

function getStringList(formData: FormData, name: string): string[] {
    return formData
        .getAll(name)
        .map((value) => String(value).trim())
        .filter(Boolean);
}

export async function generateObjectives(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const user = await requireActionUser();

        const topicId = String(formData.get("topicId") || "").trim();

        const topic = await loadOwnedTopic(topicId, user.id);

        if (!topic.breakdown) {
            throw new Error(
                "Run the formulation checker before generating objectives.",
            );
        }

        const formulation = generateFormulation(
            topic.breakdown as unknown as TopicBreakdown,
        );

        await prisma.researchTopic.update({
            where: {
                id: topic.id,
            },
            data: {
                objectives: {
                    general: formulation.generalObjective,
                    specific: formulation.specificObjectives,
                },
                researchQuestions: formulation.researchQuestions,
                hypotheses: formulation.nullHypotheses,
            },
        });

        revalidatePath(`/toolkit/${topic.id}`);

        return "Objectives, research questions, and hypotheses generated.";
    }, { action: "generateObjectives" });
}

export async function saveFormulation(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const user = await requireActionUser();

        const topicId = String(formData.get("topicId") || "").trim();

        const topic = await loadOwnedTopic(topicId, user.id);

        const generalObjective = String(
            formData.get("generalObjective") || "",
        ).trim();

        const specificObjectives = getStringList(
            formData,
            "specificObjectives",
        );

        const researchQuestions = getStringList(
            formData,
            "researchQuestions",
        );

        const hypotheses = getStringList(formData, "hypotheses");

        await prisma.researchTopic.update({
            where: {
                id: topic.id,
            },
            data: {
                objectives: {
                    general: generalObjective,
                    specific: specificObjectives,
                },
                researchQuestions,
                hypotheses,
            },
        });

        revalidatePath(`/toolkit/${topic.id}`);

        return "Your edits were saved.";
    }, { action: "saveFormulation" });
}

export async function reserveTopic(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const user = await requireActionUser();

        const topicId = String(formData.get("topicId") || "").trim();

        const topic = await loadOwnedTopic(topicId, user.id);

        if (!topic.signatureKey) {
            throw new Error(
                "Run the formulation checker before reserving this topic.",
            );
        }

        const existingReservation =
            await prisma.topicReservation.findUnique({
                where: {
                    topicId: topic.id,
                },
            });

        if (existingReservation) {
            throw new Error("This topic has already been reserved.");
        }

        const journal = await prisma.journal.findUnique({
            where: {
                id: topic.journalId,
            },
            select: {
                topicReservationMonths: true,
            },
        });

        if (!journal) {
            throw new Error("Journal not found.");
        }

        const expiresAt = new Date();

        expiresAt.setMonth(
            expiresAt.getMonth() + journal.topicReservationMonths,
        );

        try {
            await prisma.topicReservation.create({
                data: {
                    topicId: topic.id,
                    journalId: topic.journalId,
                    userId: user.id,
                    signatureKey: topic.signatureKey,
                    expiresAt,
                },
            });
        } catch (error) {
            if (
                error instanceof
                Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new Error(
                    "This exact combination of variables, sector, and location is already reserved by another student.",
                );
            }

            throw error;
        }

        revalidatePath(`/toolkit/${topic.id}`);

        return `Topic reserved until ${expiresAt.toLocaleDateString("en-GB")}.`;
    }, { action: "reserveTopic" });
}
