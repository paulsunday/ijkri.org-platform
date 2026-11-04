import type { TopicBreakdown } from "@/lib/ai/formulation-checker";

export type FindingSeverity = "ERROR" | "WARNING";

export type FindingCode =
    | "MISSING_IV"
    | "MISSING_DV"
    | "VAGUE_PHRASING"
    | "UNMEASURABLE_VARIABLE"
    // No longer raised; kept so findings saved before Nov 2026 still type-check.
    | "SCOPE_TOO_BROAD"
    | "SUBVARIABLE_MISMATCH";

export type Finding = {
    code: FindingCode;
    severity: FindingSeverity;
    message: string;
    suggestion: string;
};

/**
 * Runs the formulation checklist against an AI-extracted breakdown.
 * The AI's job is extraction only; pass/fail judgment stays here, in
 * auditable, tunable code rather than inside a prompt.
 */
export function runFormulationChecks(
    breakdown: TopicBreakdown,
): Finding[] {
    const findings: Finding[] = [];

    if (breakdown.independentVariables.length === 0) {
        findings.push({
            code: "MISSING_IV",
            severity: "ERROR",
            message:
                "No independent variable (the cause/driver) could be identified in this topic.",
            suggestion:
                'State what you believe is causing or driving the outcome you want to study, e.g. "Effect of [X] on [outcome]...".',
        });
    }

    if (breakdown.dependentVariables.length === 0) {
        findings.push({
            code: "MISSING_DV",
            severity: "ERROR",
            message:
                "No dependent variable (the measurable outcome) could be identified in this topic.",
            suggestion:
                "Name the specific outcome you expect to measure, e.g. employee retention, students' academic performance, loan default rate.",
        });
    }

    if (breakdown.vagueTermsFound.length > 0) {
        findings.push({
            code: "VAGUE_PHRASING",
            severity: "WARNING",
            message: `This phrasing reads as vague rather than measurable: ${breakdown.vagueTermsFound.join(", ")}.`,
            suggestion:
                'Replace open-ended phrases like "role of" or "assessment of" with a directional statement naming both variables, e.g. "Effect of X on Y".',
        });
    }

    if (breakdown.unmeasurableConstructs.length > 0) {
        findings.push({
            code: "UNMEASURABLE_VARIABLE",
            severity: "WARNING",
            message: `These variables are abstract constructs with no stated way to measure them: ${breakdown.unmeasurableConstructs.join(", ")}.`,
            suggestion:
                "Operationalize each construct — name the dimension, scale, or indicator you will use to measure it.",
        });
    }

    const subVariableCounts = breakdown.independentVariables
        .map((iv) => iv.subVariables.length)
        .filter((count) => count > 0);

    if (subVariableCounts.length > 1 && new Set(subVariableCounts).size > 1) {
        findings.push({
            code: "SUBVARIABLE_MISMATCH",
            severity: "WARNING",
            message:
                "Your independent variables break down into different numbers of sub-variables, which will produce an uneven set of objectives.",
            suggestion:
                "Make sure each independent variable is broken into a comparable, deliberately chosen set of sub-variables/dimensions before generating objectives.",
        });
    }

    return findings;
}
