import "server-only";

import {
    TOPIC_BREAKDOWN_SCHEMA,
    type DegreeLevelInput,
    type TopicBreakdown,
} from "@/lib/ai/formulation-checker";
import { generateStructuredJson } from "@/lib/ai/gemini";

export type TopicCandidate = {
    title: string;
    rationale: string;
    breakdown: TopicBreakdown;
};

export type BuildTopicsInput = {
    independentVariables: string;
    dependentVariables: string;
    otherVariables?: string;
    population?: string;
    sector?: string;
    location?: string;
    degreeLevel: DegreeLevelInput;
    discipline?: string;
};

const TOPIC_CANDIDATES_SCHEMA = {
    type: "object",
    properties: {
        candidates: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    rationale: { type: "string" },
                    breakdown: TOPIC_BREAKDOWN_SCHEMA,
                },
                required: ["title", "rationale", "breakdown"],
                additionalProperties: false,
            },
        },
    },
    required: ["candidates"],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a research methodology supervisor for the International Journal of Knowledge, Research and Innovation (IJKRI). Students (mostly in Nigeria) give you the variables they want to study; you turn them into well-formulated research topics.

Write exactly 3 alternative topic titles built ONLY from the variables the student supplied.

Rules for every title:
- Use clear relationship framing: "Effect of [independent variable] on [dependent variable] among/of [population] in [location]" (or "Influence of…", "Relationship between… and…" where more accurate). Never use vague framing such as "the role of", "an assessment of", "a study of".
- Keep the student's independent and dependent variables. You may vary the population, sector and wording between the three alternatives, but do not swap in different variables.
- Keep the student's location exactly as given (a state, city, organization or country are all acceptable). Never narrow or replace it. If no location was given, you may suggest a suitable one.
- If the student named a moderating or mediating variable, include it in the title.

For each title also return its "breakdown" exactly as a topic-structure extraction of that title would:
- "independentVariables": each with "subVariables" = its standard measurable proxies. For questionnaire constructs, use the dimensions of a validated literature scale (e.g. transformational leadership → idealized influence, inspirational motivation, intellectual stimulation, individualized consideration). For variables measured with secondary data, use the standard indicators (e.g. capital structure → debt-to-equity ratio, debt-to-assets ratio; financial performance → ROA, ROE). Use 2-6. Leave "subVariables" empty only if there are no accepted proxies.
- "dependentVariables", "moderatingVariables", "population", "sector", "location" ("raw" + "tier"): from the title.
- "vagueTermsFound" and "unmeasurableConstructs": empty arrays unless genuinely present.
- "rationale": one or two sentences on why this formulation is clear and researchable.

Never invent facts about the student's context. Never cite sources here.`;

function line(label: string, value?: string) {
    return `${label}: ${value?.trim() || "(not specified)"}`;
}

export async function buildTopicsFromVariables(
    input: BuildTopicsInput,
): Promise<TopicCandidate[]> {
    const prompt = [
        line("DEGREE LEVEL", input.degreeLevel),
        line("DISCIPLINE", input.discipline),
        line("INDEPENDENT VARIABLE(S)", input.independentVariables),
        line("DEPENDENT VARIABLE(S)", input.dependentVariables),
        line("MODERATING/MEDIATING VARIABLE(S)", input.otherVariables),
        line("POPULATION", input.population),
        line("SECTOR", input.sector),
        line("LOCATION", input.location),
    ].join("\n");

    const result = await generateStructuredJson<{
        candidates: TopicCandidate[];
    }>({
        system: SYSTEM_PROMPT,
        prompt,
        schema: TOPIC_CANDIDATES_SCHEMA,
        feature: "topic-builder",
    });

    return (result.candidates ?? []).slice(0, 3);
}
