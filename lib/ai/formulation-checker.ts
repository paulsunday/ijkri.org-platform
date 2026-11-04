import "server-only";

import { generateStructuredJson } from "@/lib/ai/gemini";


export type LocationTier =
    | "ORGANIZATION"
    | "CITY_LGA"
    | "STATE"
    | "REGION"
    | "COUNTRY"
    | "MULTI_COUNTRY"
    | "UNSPECIFIED";

export type TopicIndependentVariable = {
    name: string;
    subVariables: string[];
};

export type TopicLocation = {
    raw: string;
    tier: LocationTier;
};

export type TopicBreakdown = {
    generalTopic: string;
    independentVariables: TopicIndependentVariable[];
    dependentVariables: string[];
    moderatingVariables: string[];
    population: string;
    sector: string;
    location: TopicLocation;
    vagueTermsFound: string[];
    unmeasurableConstructs: string[];
};

export type DegreeLevelInput =
    | "ND"
    | "HND"
    | "BSC"
    | "PGD"
    | "MSC"
    | "MPHIL"
    | "PHD";

export type ExtractTopicBreakdownInput = {
    topicText: string;
    degreeLevel: DegreeLevelInput;
    discipline?: string;
};

const INDEPENDENT_VARIABLE_SCHEMA = {
    type: "object",
    properties: {
        name: { type: "string" },
        subVariables: {
            type: "array",
            items: { type: "string" },
        },
    },
    required: ["name", "subVariables"],
    additionalProperties: false,
} as const;

const LOCATION_SCHEMA = {
    type: "object",
    properties: {
        raw: { type: "string" },
        tier: {
            type: "string",
            enum: [
                "ORGANIZATION",
                "CITY_LGA",
                "STATE",
                "REGION",
                "COUNTRY",
                "MULTI_COUNTRY",
                "UNSPECIFIED",
            ],
        },
    },
    required: ["raw", "tier"],
    additionalProperties: false,
} as const;

const TOPIC_BREAKDOWN_SCHEMA = {
    type: "object",
    properties: {
        generalTopic: { type: "string" },
        independentVariables: {
            type: "array",
            items: INDEPENDENT_VARIABLE_SCHEMA,
        },
        dependentVariables: {
            type: "array",
            items: { type: "string" },
        },
        moderatingVariables: {
            type: "array",
            items: { type: "string" },
        },
        population: { type: "string" },
        sector: { type: "string" },
        location: LOCATION_SCHEMA,
        vagueTermsFound: {
            type: "array",
            items: { type: "string" },
        },
        unmeasurableConstructs: {
            type: "array",
            items: { type: "string" },
        },
    },
    required: [
        "generalTopic",
        "independentVariables",
        "dependentVariables",
        "moderatingVariables",
        "population",
        "sector",
        "location",
        "vagueTermsFound",
        "unmeasurableConstructs",
    ],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a research methodology assistant for the International Journal of Knowledge, Research and Innovation (IJKRI), helping students formulate well-structured research topics.

You will be given a student's working research topic/title, their degree level, and optionally their discipline. Extract its structure EXACTLY as implied by the wording — never invent a variable, population, sector, or location detail that is not stated or clearly implied.

Rules you must follow exactly:
- "independentVariables": the cause-side variable(s). If the topic names dimensions/components of an independent variable (e.g. "recruitment, training and compensation" as parts of "HR practices"), list them as that variable's "subVariables". If no sub-variables are named, return an empty array for "subVariables" — do not invent a breakdown that was not implied.
- "dependentVariables": the effect-side/outcome variable(s). Leave empty if the topic states no measurable outcome.
- "moderatingVariables": any variable explicitly described as moderating/mediating the IV-DV relationship. Usually empty.
- "population": who/what is being studied (e.g. "small and medium enterprises", "secondary school teachers"). Empty string if not stated.
- "sector": the industry/sector named (e.g. "banking", "healthcare"). Empty string if not stated.
- "location": "raw" is the location phrase exactly as written (empty string if none). "tier" classifies its geographic breadth: ORGANIZATION (a single named organization/case), CITY_LGA (a city or local government area), STATE (a state/province), REGION (a geopolitical region or multiple states), COUNTRY (a whole country), MULTI_COUNTRY (more than one country), or UNSPECIFIED (no location given).
- "vagueTermsFound": list any phrase in the topic that signals an unclear IV-DV relationship rather than a measurable effect — for example "role of", "assessment of", "a study of", "an overview of" used WITHOUT the topic also naming a clear outcome variable. Do not flag "effect of X on Y" or "impact of X on Y" phrasing — those already name a direction.
- "unmeasurableConstructs": list any named variable that is an abstract construct with no implied operational definition or measurable indicator (e.g. bare "culture", "morale", "attitude" with no scale/dimension named). Leave empty if every named variable is reasonably operationalizable.
- Never fabricate content. If a field has nothing to report, return an empty string or empty array as appropriate.`;

function buildUserPrompt(input: ExtractTopicBreakdownInput): string {
    return `Extract the structure of this research topic.

DEGREE LEVEL: ${input.degreeLevel}
DISCIPLINE: ${input.discipline?.trim() || "(not specified)"}

TOPIC:
${input.topicText}`;
}

export async function extractTopicBreakdown(
    input: ExtractTopicBreakdownInput,
): Promise<TopicBreakdown> {
    return generateStructuredJson<TopicBreakdown>({
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(input),
        schema: TOPIC_BREAKDOWN_SCHEMA,
        feature: "formulation-checker",
    });
}
