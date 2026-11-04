"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { extractTopicBreakdown } from "@/lib/ai/formulation-checker";
import { requireActionUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
    isDegreeLevel,
    getToolkitJournalId,
    saveCheckedTopic,
} from "@/lib/research-toolkit/topics";

export type CheckFormulationState = {
    message: string;
    values: {
        topicText: string;
        degreeLevel: string;
        discipline: string;
    };
};

/**
 * Form wrapper: shows failures on the page (keeping what the student
 * typed) instead of crashing to the error screen. Redirects on success.
 */
export async function checkFormulation(
    _previousState: CheckFormulationState,
    formData: FormData,
): Promise<CheckFormulationState> {
    const values = {
        topicText: String(formData.get("topicText") || "").trim(),
        degreeLevel: String(formData.get("degreeLevel") || "").trim(),
        discipline: String(formData.get("discipline") || "").trim(),
    };

    let topicId: string;

    try {
        topicId = await runFormulationCheck(values);
    } catch (error) {
        // Let Next.js redirects (e.g. no toolkit access) through.
        unstable_rethrow(error);

        logger.error("Formulation check failed", error, {
            event: "FORMULATION_CHECK_FAILED",
        });

        return {
            message:
                error instanceof Error
                    ? error.message
                    : "Something went wrong. Please try again.",
            values,
        };
    }

    redirect(`/toolkit/${topicId}`);
}

async function runFormulationCheck({
    topicText,
    degreeLevel,
    discipline,
}: CheckFormulationState["values"]): Promise<string> {
    const user = await requireActionUser();

    if (topicText.length < 15) {
        throw new Error(
            "Enter your working topic/title in full (at least 15 characters).",
        );
    }

    if (!isDegreeLevel(degreeLevel)) {
        throw new Error("Select a valid degree level.");
    }

    const journalId = await getToolkitJournalId();

    await enforceRateLimit("toolkit-ai", user.id);

    const breakdown = await extractTopicBreakdown({
        topicText,
        degreeLevel,
        discipline: discipline || undefined,
    });

    return saveCheckedTopic({
        journalId,
        userId: user.id,
        topicText,
        degreeLevel,
        discipline,
        breakdown,
    });
}
