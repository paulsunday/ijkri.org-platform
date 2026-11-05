import "server-only";

import { generateStructuredJson } from "@/lib/ai/gemini";
import {
    normalizeGuideContent,
    type VariableGuideContent,
} from "@/lib/research-toolkit/variable-guide";

export type VariableGuideDraft = {
    name: string;
    discipline: string;
    summary: string;
    content: VariableGuideContent;
};

const DRAFT_SCHEMA = {
    type: "object",
    properties: {
        name: { type: "string" },
        discipline: { type: "string" },
        summary: { type: "string" },
        definition: { type: "string" },
        measurementType: {
            type: "string",
            enum: ["VALIDATED_SCALE", "SECONDARY_DATA", "BOTH"],
        },
        dimensions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    definition: { type: "string" },
                },
                required: ["name", "definition"],
                additionalProperties: false,
            },
        },
        scales: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    source: { type: "string" },
                    confidence: { type: "string", enum: ["ESTABLISHED", "VERIFY"] },
                },
                required: ["name", "source", "confidence"],
                additionalProperties: false,
            },
        },
        secondaryIndicators: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    formula: { type: "string" },
                    dataSource: { type: "string" },
                },
                required: ["name", "formula", "dataSource"],
                additionalProperties: false,
            },
        },
        relatedVariables: { type: "array", items: { type: "string" } },
        exampleTopics: { type: "array", items: { type: "string" } },
        researchTips: { type: "array", items: { type: "string" } },
    },
    required: [
        "name",
        "discipline",
        "summary",
        "definition",
        "measurementType",
        "dimensions",
        "scales",
        "secondaryIndicators",
        "relatedVariables",
        "exampleTopics",
        "researchTips",
    ],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You write reference pages for a research-methods library used by undergraduate and postgraduate students (many in Nigeria) who are formulating research topics. Each page explains ONE research variable: what it is, how it is broken into measurable dimensions/proxies, and how it is measured.

Write for students, in clear, plain English. Be accurate and specific. No markdown.

Fields:
- "name": the variable's standard name in Title Case (correct the spelling if needed).
- "discipline": the main field (e.g. "Management", "Accounting & Finance", "Economics", "Education", "Public Health").
- "summary": one or two sentences (max ~155 characters) answering "what is X and how is it measured" — this becomes the Google search snippet.
- "definition": a 2-4 sentence conceptual definition, as found in the literature.
- "measurementType": "VALIDATED_SCALE" if measured by questionnaire, "SECONDARY_DATA" if measured from records (financial ratios, macroeconomic data, official statistics), "BOTH" if either is common.
- "dimensions": the standard dimensions/proxies used in research (3-7), each with a one-sentence operational definition.
- "scales": validated measurement instruments (name + author(s) and year as usually cited). Empty if the variable is secondary data only.
- "secondaryIndicators": for secondary-data variables, each indicator with its formula and typical data source (e.g. audited annual reports, CBN Statistical Bulletin, NBS, World Bank WDI). Empty for questionnaire-only variables.
- "relatedVariables": 4-8 variables it is commonly studied with.
- "exampleTopics": 6-10 well-formulated example research topics using this variable, mostly in Nigerian and African contexts, framed as "Effect of X on Y among/of [population] in [location]".
- "researchTips": 3-6 practical tips (common mistakes, how supervisors judge topics with this variable, which analysis fits).

Integrity rule: NEVER invent an instrument, author, year or data source. Set "confidence" to "ESTABLISHED" only for widely used instruments you are certain exist with that authorship; otherwise "VERIFY". If unsure whether any validated scale exists, return fewer scales rather than guessing.`;

export async function draftVariableGuide(
    variableName: string,
): Promise<VariableGuideDraft> {
    const raw = await generateStructuredJson<
        Record<string, unknown> & {
            name?: string;
            discipline?: string;
            summary?: string;
        }
    >({
        system: SYSTEM_PROMPT,
        prompt: `VARIABLE: ${variableName}`,
        schema: DRAFT_SCHEMA,
        feature: "variable-guide",
    });

    const content = normalizeGuideContent(raw);

    return {
        name: (raw.name || variableName).trim().slice(0, 120),
        discipline: (raw.discipline || "").trim().slice(0, 80),
        summary: (raw.summary || content.definition).trim().slice(0, 300),
        content,
    };
}
