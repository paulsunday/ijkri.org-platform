import type { TopicBreakdown } from "@/lib/ai/formulation-checker";

export type GeneratedFormulation = {
    generalObjective: string;
    specificObjectives: string[];
    researchQuestions: string[];
    nullHypotheses: string[];
};

type FlatVariable = {
    label: string;
};

function flattenIndependentVariables(
    breakdown: TopicBreakdown,
): FlatVariable[] {
    const flat: FlatVariable[] = [];

    for (const independentVariable of breakdown.independentVariables) {
        if (independentVariable.subVariables.length === 0) {
            flat.push({ label: independentVariable.name });

            continue;
        }

        for (const subVariable of independentVariable.subVariables) {
            flat.push({ label: subVariable });
        }
    }

    return flat;
}

function joinWithAnd(values: string[]): string {
    if (values.length === 0) return "";
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} and ${values[1]}`;

    return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function describeAudience(breakdown: TopicBreakdown): string {
    const parts: string[] = [];

    if (breakdown.population) parts.push(`among ${breakdown.population}`);
    if (breakdown.location.raw) parts.push(`in ${breakdown.location.raw}`);

    return parts.join(" ");
}

/**
 * Pure template generation from the confirmed variable breakdown —
 * deliberately not AI-written. Fixed phrasing per sub-variable is
 * what actually standardizes Chapter One quality across students; an
 * LLM would introduce wording drift between otherwise-identical
 * breakdowns.
 */
export function generateFormulation(
    breakdown: TopicBreakdown,
): GeneratedFormulation {
    const primaryDependentVariable =
        breakdown.dependentVariables[0] || "the stated outcome";

    const audience = describeAudience(breakdown);

    const audienceSuffix = audience ? ` ${audience}` : "";

    const independentVariableLabel =
        joinWithAnd(
            breakdown.independentVariables.map((iv) => iv.name),
        ) || "the stated independent variable";

    const generalObjective = `This study aims to examine the effect of ${independentVariableLabel} on ${primaryDependentVariable}${audienceSuffix}.`;

    const flatVariables = flattenIndependentVariables(breakdown);

    const effectiveVariables =
        flatVariables.length > 0
            ? flatVariables
            : [{ label: independentVariableLabel }];

    const specificObjectives = effectiveVariables.map(
        (variable) =>
            `To determine the effect of ${variable.label} on ${primaryDependentVariable}${audienceSuffix}.`,
    );

    const researchQuestions = effectiveVariables.map(
        (variable) =>
            `What is the effect of ${variable.label} on ${primaryDependentVariable}${audienceSuffix}?`,
    );

    const nullHypotheses = effectiveVariables.map(
        (variable) =>
            `H0: ${variable.label} has no significant effect on ${primaryDependentVariable}${audienceSuffix}.`,
    );

    return {
        generalObjective,
        specificObjectives,
        researchQuestions,
        nullHypotheses,
    };
}
