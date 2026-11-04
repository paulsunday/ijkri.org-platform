"use server";

import {
    suggestTopics,
    type SuggestedTopic,
} from "@/lib/ai/suggest-topics";
import { requireActionUser } from "@/lib/auth/current-user";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";

export type SuggestTopicsState = {
    success: boolean;
    message: string;
    suggestions: SuggestedTopic[];
};

export const IDLE_SUGGEST_TOPICS_STATE: SuggestTopicsState = {
    success: false,
    message: "",
    suggestions: [],
};

export async function requestTopicSuggestions(
    _previousState: SuggestTopicsState,
    formData: FormData,
): Promise<SuggestTopicsState> {
    try {
        const user = await requireActionUser();

        const interestArea = String(
            formData.get("interestArea") || "",
        ).trim();

        const supervisorSpecialization = String(
            formData.get("supervisorSpecialization") || "",
        ).trim();

        const degreeLevel = String(
            formData.get("degreeLevel") || "",
        ).trim();

        if (interestArea.length < 3) {
            throw new Error(
                "Describe your area of interest in a few words.",
            );
        }

        const journal = await prisma.journal.findFirst({
            where: {
                isActive: true,
            },
            orderBy: {
                createdAt: "asc",
            },
            select: {
                id: true,
            },
        });

        if (!journal) {
            throw new Error(
                "The Research Topic Formulation Workbench is not currently available.",
            );
        }

        const access = await hasToolkitAccess({
            userId: user.id,
            journalId: journal.id,
        });

        if (!access) {
            throw new Error(
                "Unlock the toolkit to get AI topic suggestions.",
            );
        }

        const suggestions = await suggestTopics({
            interestArea,
            degreeLevel: degreeLevel || "MSC",
            supervisorSpecialization:
                supervisorSpecialization || undefined,
        });

        return {
            success: true,
            message: `${suggestions.length} suggestion(s) generated.`,
            suggestions,
        };
    } catch (error) {
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Something went wrong. Please try again.",
            suggestions: [],
        };
    }
}
