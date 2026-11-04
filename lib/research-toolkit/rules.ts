import type {
    DegreeLevelInput,
    TopicBreakdown,
} from "@/lib/ai/formulation-checker";

export type FindingSeverity = "ERROR" | "WARNING";

export type FindingCode =
    | "MISSING_IV"
    | "MISSING_DV"
    | "VAGUE_PHRASING"
    | "UNMEASURABLE_VARIABLE"
    | "SCOPE_TOO_BROAD"
    | "SUBVARIABLE_MISMATCH";

export type Finding = {
    code: FindingCode;
    severity: FindingSeverity;
    message: string;
    suggestion: string;
};

const LOCATION_TIER_RANK: Record<string, number> = {
    UNSPECIFIED: 0,
    ORGANIZATION: 1,
    CITY_LGA: 2,
    STATE: 3,
    REGION: 4,
    COUNTRY: 5,
    MULTI_COUNTRY: 6,
};

/**
 * Highest location-tier rank each degree level may reasonably claim
 * to cover in a single project — e.g. an MSc student scoping a study
 * "in Nigeria" (COUNTRY) is over scope, which is the exact complaint
 * supervisors raise most often at proposal stage.
 */
export const DEGREE_LEVEL_MAX_SCOPE_RANK: Record<DegreeLevelInput, number> = {
    ND: LOCATION_TIER_RANK.ORGANIZATION,
    HND: LOCATION_TIER_RANK.ORGANIZATION,
    BSC: LOCATION_TIER_RANK.CITY_LGA,
    PGD: LOCATION_TIER_RANK.CITY_LGA,
    MSC: LOCATION_TIER_RANK.STATE,
    MPHIL: LOCATION_TIER_RANK.REGION,
    PHD: LOCATION_TIER_RANK.COUNTRY,
};

const DEGREE_LEVEL_LABEL: Record<DegreeLevelInput, string> = {
    ND: "ND",
    HND: "HND",
    BSC: "BSc",
    PGD: "PGD",
    MSC: "MSc",
    MPHIL: "MPhil",
    PHD: "PhD",
};

/**
 * Runs the formulation checklist against an AI-extracted breakdown.
 * The AI's job is extraction only; pass/fail judgment stays here, in
 * auditable, tunable code rather than inside a prompt.
 */
export function runFormulationChecks(
    breakdown: TopicBreakdown,
    degreeLevel: DegreeLevelInput,
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

    const scopeRank = LOCATION_TIER_RANK[breakdown.location.tier] ?? 0;
    const maxScopeRank = DEGREE_LEVEL_MAX_SCOPE_RANK[degreeLevel];

    if (scopeRank > maxScopeRank) {
        findings.push({
            code: "SCOPE_TOO_BROAD",
            severity: "ERROR",
            message: `"${breakdown.location.raw || "the stated location"}" is too broad a scope for a ${DEGREE_LEVEL_LABEL[degreeLevel]} study.`,
            suggestion:
                "Narrow the location to a single organization, city/LGA, or state appropriate for this degree level — a national or multi-state scope is rarely achievable within an ND/HND/BSc/PGD/MSc project.",
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
