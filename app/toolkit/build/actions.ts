"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import {
    buildTopicsFromVariables,
    type TopicCandidate,
} from "@/lib/ai/topic-builder";
import { requireActionUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
    isDegreeLevel,
    getToolkitJournalId,
    saveCheckedTopic,
} from "@/lib/research-toolkit/topics";

const FIELDS = [
    "independentVariables",
    "dependentVariables",
    "otherVariables",
    "population",
    "sector",
    "location",
    "degreeLevel",
    "discipline",
] as const;

export type BuildTopicValues = Record<(typeof FIELDS)[number], string>;

export type BuildTopicState = {
    message: string;
    values: BuildTopicValues;
    candidates: TopicCandidate[];
};

function readValues(formData: FormData): BuildTopicValues {
    return Object.fromEntries(
        FIELDS.map((field) => [
            field,
            String(formData.get(field) || "").trim().slice(0, 300),
        ]),
    ) as BuildTopicValues;
}

/** Step 1: turn the student's variables into candidate topics. */
export async function generateTopicCandidates(
    _previousState: BuildTopicState,
    formData: FormData,
): Promise<BuildTopicState> {
    const values = readValues(formData);

    try {
        const user = await requireActionUser();

        if (values.independentVariables.length < 3) {
            throw new Error("Enter at least one independent variable.");
        }

        if (values.dependentVariables.length < 3) {
            throw new Error("Enter at least one dependent variable.");
        }

        if (!isDegreeLevel(values.degreeLevel)) {
            throw new Error("Select a valid degree level.");
        }

        await getToolkitJournalId();

        await enforceRateLimit("toolkit-ai", user.id);

        const candidates = await buildTopicsFromVariables({
            ...values,
            degreeLevel: values.degreeLevel,
        });

        if (candidates.length === 0) {
            throw new Error(
                "No topics could be built from these variables. Try describing them differently.",
            );
        }

        return { message: "", values, candidates };
    } catch (error) {
        unstable_rethrow(error);

        logger.error("Topic builder failed", error, {
            event: "TOPIC_BUILDER_FAILED",
        });

        return {
            message:
                error instanceof Error
                    ? error.message
                    : "Something went wrong. Please try again.",
            values,
            candidates: [],
        };
    }
}

const breakdownSchema = z.object({
    generalTopic: z.string(),
    independentVariables: z
        .array(
            z.object({
                name: z.string().min(1),
                subVariables: z.array(z.string()),
            }),
        )
        .min(1),
    dependentVariables: z.array(z.string()).min(1),
    moderatingVariables: z.array(z.string()),
    population: z.string(),
    sector: z.string(),
    location: z.object({
        raw: z.string(),
        tier: z.enum([
            "ORGANIZATION",
            "CITY_LGA",
            "STATE",
            "REGION",
            "COUNTRY",
            "MULTI_COUNTRY",
            "UNSPECIFIED",
        ]),
    }),
    vagueTermsFound: z.array(z.string()),
    unmeasurableConstructs: z.array(z.string()),
});

const candidateSchema = z.object({
    title: z.string().min(15).max(400),
    breakdown: breakdownSchema,
});

/** Step 2: save the candidate the student picked as a new topic. */
export async function chooseTopicCandidate(formData: FormData) {
    const user = await requireActionUser();

    const degreeLevel = String(formData.get("degreeLevel") || "");
    const discipline = String(formData.get("discipline") || "").trim();

    if (!isDegreeLevel(degreeLevel)) {
        throw new Error("Select a valid degree level.");
    }

    let parsed: z.infer<typeof candidateSchema>;

    try {
        parsed = candidateSchema.parse(
            JSON.parse(String(formData.get("candidate") || "")),
        );
    } catch {
        throw new Error("That topic could not be saved. Please build it again.");
    }

    const journalId = await getToolkitJournalId();

    const topicId = await saveCheckedTopic({
        journalId,
        userId: user.id,
        topicText: parsed.title,
        degreeLevel,
        discipline,
        breakdown: parsed.breakdown,
    });

    redirect(`/toolkit/${topicId}`);
}
