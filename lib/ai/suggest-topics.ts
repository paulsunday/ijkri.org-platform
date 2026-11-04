import "server-only";

import { generateStructuredJson } from "@/lib/ai/gemini";


export type SuggestedTopic = {
    title: string;
    independentVariable: string;
    dependentVariable: string;
    sector: string;
    location: string;
    rationale: string;
};

export type SuggestTopicsInput = {
    interestArea: string;
    degreeLevel: string;
    supervisorSpecialization?: string;
    knownCombinations?: string[];
};

const SUGGESTED_TOPIC_SCHEMA = {
    type: "object",
    properties: {
        title: { type: "string" },
        independentVariable: { type: "string" },
        dependentVariable: { type: "string" },
        sector: { type: "string" },
        location: { type: "string" },
        rationale: { type: "string" },
    },
    required: [
        "title",
        "independentVariable",
        "dependentVariable",
        "sector",
        "location",
        "rationale",
    ],
    additionalProperties: false,
} as const;

const SUGGEST_TOPICS_SCHEMA = {
    type: "object",
    properties: {
        suggestions: {
            type: "array",
            items: SUGGESTED_TOPIC_SCHEMA,
        },
    },
    required: ["suggestions"],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a research topic advisor for the International Journal of Knowledge, Research and Innovation (IJKRI).

Given a student's area of interest, their degree level, and (optionally) their supervisor's specialization, propose 3 to 5 distinct, specific, researchable topic ideas.

Rules:
- Each suggestion must name a clear independent variable, a clear measurable dependent variable, a sector, and a location whose breadth is appropriate for the stated degree level (ND/HND/BSc: a single organization or local government area; PGD/MSc: a state; MPhil/PhD: a region or country).
- Avoid vague framing ("the role of", "an assessment of") — title each suggestion as a clear effect/relationship ("Effect of X on Y among [population] in [location]").
- If a list of already-studied variable/sector/location combinations is supplied, do not repeat any of them — propose genuinely different combinations.
- "rationale" is one short sentence explaining why this combination is relevant to the student's stated interest and/or supervisor's specialization.
- Never fabricate a combination that contradicts the stated interest area; stay within it.`;

function buildUserPrompt(input: SuggestTopicsInput): string {
    const known =
        input.knownCombinations && input.knownCombinations.length > 0
            ? input.knownCombinations.join("\n")
            : "(none recorded)";

    return `STUDENT'S DEGREE LEVEL: ${input.degreeLevel}
STUDENT'S INTEREST AREA: ${input.interestArea}
SUPERVISOR'S SPECIALIZATION: ${input.supervisorSpecialization?.trim() || "(not specified)"}

ALREADY-STUDIED COMBINATIONS TO AVOID REPEATING:
${known}`;
}

export async function suggestTopics(
    input: SuggestTopicsInput,
): Promise<SuggestedTopic[]> {
    const result = await generateStructuredJson<{
        suggestions: SuggestedTopic[];
    }>({
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(input),
        schema: SUGGEST_TOPICS_SCHEMA,
        feature: "suggest-topics",
    });

    return result.suggestions ?? [];
}
