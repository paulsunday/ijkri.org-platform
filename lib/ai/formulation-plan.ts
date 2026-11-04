import "server-only";

import type {
    DegreeLevelInput,
    TopicBreakdown,
} from "@/lib/ai/formulation-checker";
import { generateStructuredJson } from "@/lib/ai/gemini";
import {
    normalizeFormulationPlan,
    type FormulationPlan,
} from "@/lib/research-toolkit/formulation-plan";

export const MIN_OBJECTIVES = 2;
export const MAX_OBJECTIVES = 8;

const PROXY_SCHEMA = {
    type: "object",
    properties: {
        name: { type: "string" },
        definition: { type: "string" },
        scaleName: { type: "string" },
        scaleSource: { type: "string" },
        confidence: { type: "string", enum: ["ESTABLISHED", "VERIFY"] },
    },
    required: ["name", "definition", "scaleName", "scaleSource", "confidence"],
    additionalProperties: false,
} as const;

function buildPlanSchema(objectiveCount: number) {
    return {
        type: "object",
        properties: {
            generalObjective: { type: "string" },
            variables: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        role: {
                            type: "string",
                            enum: [
                                "INDEPENDENT",
                                "DEPENDENT",
                                "MODERATING",
                                "MEDIATING",
                            ],
                        },
                        name: { type: "string" },
                        proxies: { type: "array", items: PROXY_SCHEMA },
                    },
                    required: ["role", "name", "proxies"],
                    additionalProperties: false,
                },
            },
            specificObjectives: {
                type: "array",
                minItems: objectiveCount,
                maxItems: objectiveCount,
                items: {
                    type: "object",
                    properties: {
                        objective: { type: "string" },
                        independentProxy: { type: "string" },
                        dependentProxy: { type: "string" },
                        researchQuestion: { type: "string" },
                        nullHypothesis: { type: "string" },
                    },
                    required: [
                        "objective",
                        "independentProxy",
                        "dependentProxy",
                        "researchQuestion",
                        "nullHypothesis",
                    ],
                    additionalProperties: false,
                },
            },
            theories: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        proponents: { type: "string" },
                        relevance: { type: "string" },
                    },
                    required: ["name", "proponents", "relevance"],
                    additionalProperties: false,
                },
            },
            conceptualFramework: { type: "string" },
            methodology: {
                type: "object",
                properties: {
                    researchDesign: { type: "string" },
                    populationAndSampling: { type: "string" },
                    instrument: { type: "string" },
                    validityAndReliability: { type: "string" },
                    analysisTechnique: { type: "string" },
                },
                required: [
                    "researchDesign",
                    "populationAndSampling",
                    "instrument",
                    "validityAndReliability",
                    "analysisTechnique",
                ],
                additionalProperties: false,
            },
            otherAssistance: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        advice: { type: "string" },
                    },
                    required: ["title", "advice"],
                    additionalProperties: false,
                },
            },
        },
        required: [
            "generalObjective",
            "variables",
            "specificObjectives",
            "theories",
            "conceptualFramework",
            "methodology",
            "otherAssistance",
        ],
        additionalProperties: false,
    };
}

function buildSystemPrompt(objectiveCount: number) {
    return `You are an experienced research methodology supervisor helping a student write Chapter One (and plan Chapter Three) of a quantitative research proposal.

You receive the student's topic, degree level, and its variable breakdown. Produce a complete, internally consistent formulation plan.

1. VARIABLES AND PROXIES (the core of the plan)
- Break down BOTH the independent and the dependent variable(s) into measurable proxies (dimensions/indicators). Add moderating/mediating variables only if the topic has them.
- Base each proxy on a validated measurement scale from the literature wherever one exists (e.g. transformational leadership → Multifactor Leadership Questionnaire, Bass & Avolio; job satisfaction → Job Descriptive Index, Smith, Kendall & Hulin; organisational commitment → Allen & Meyer three-component model).
- "scaleName" = the instrument's name; "scaleSource" = author(s) and year as usually cited.
- Integrity rule: NEVER invent an instrument, author or year. Set "confidence" to "ESTABLISHED" only for widely used instruments you are certain exist with that authorship. Otherwise set "confidence" to "VERIFY". If no validated scale exists, set "scaleName" to "Researcher-developed items adapted from literature", "scaleSource" to "" and "confidence" to "VERIFY".
- "definition" = a one-sentence operational definition of the proxy as it would be measured.

2. SPECIFIC OBJECTIVES — exactly ${objectiveCount}
- Produce exactly ${objectiveCount} specific objectives. Each pairs ONE independent-variable proxy with the dependent variable or ONE dependent-variable proxy, and names both in "independentProxy" and "dependentProxy" exactly as they appear in the variables list.
- Spread the objectives across the independent-variable proxies. If there are fewer proxies than objectives, pair proxies with different dependent-variable proxies rather than repeating a pair. Never repeat the same pair.
- Phrase each objective as "To examine/determine/ascertain the effect of … on … among … in …", keeping the topic's population and location.
- For each objective give the matching research question and null hypothesis (H0), worded consistently with it.
- "generalObjective": one sentence for the whole study.

3. OTHER ASSISTANCE
- "theories": 1-3 underpinning theories that genuinely explain the relationship, with proponents and one sentence on relevance. Same integrity rule — only well-known theories.
- "conceptualFramework": a short description of how the proxies link (IV proxies → DV, plus any moderator/mediator), suitable for drawing the diagram.
- "methodology": brief, practical guidance on research design, population and sampling (e.g. Taro Yamane or Krejcie & Morgan where appropriate), the instrument (structured questionnaire built from the scales above, Likert scale), validity and reliability (e.g. pilot test, Cronbach's alpha ≥ 0.7), and the analysis technique that fits the objectives and hypotheses (e.g. multiple regression).
- "otherAssistance": 3-6 short, specific tips the student will need next (e.g. scope delimitation, significance of the study, operational definition of terms, likely limitations, common supervisor objections to this kind of topic).

Write for the student's degree level. Be concise and practical. Do not use markdown.`;
}

export async function generateFormulationPlan({
    topicText,
    degreeLevel,
    discipline,
    breakdown,
    objectiveCount,
}: {
    topicText: string;
    degreeLevel: DegreeLevelInput;
    discipline: string | null;
    breakdown: TopicBreakdown;
    objectiveCount: number;
}): Promise<FormulationPlan> {
    const prompt = `TOPIC: ${topicText}
DEGREE LEVEL: ${degreeLevel}
DISCIPLINE: ${discipline || "(not specified)"}
NUMBER OF SPECIFIC OBJECTIVES NEEDED: ${objectiveCount}

VARIABLE BREAKDOWN (JSON):
${JSON.stringify(breakdown, null, 2)}`;

    const plan = await generateStructuredJson<FormulationPlan>({
        system: buildSystemPrompt(objectiveCount),
        prompt,
        schema: buildPlanSchema(objectiveCount),
        feature: "formulation-plan",
    });

    return normalizeFormulationPlan(plan, objectiveCount);
}
