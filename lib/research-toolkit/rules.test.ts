import { describe, expect, it } from "vitest";

import type { TopicBreakdown } from "@/lib/ai/formulation-checker";

import { runFormulationChecks } from "./rules";

function breakdown(overrides: Partial<TopicBreakdown> = {}): TopicBreakdown {
    return {
        generalTopic: "",
        independentVariables: [
            {
                name: "Green HRM practices",
                subVariables: [
                    "green recruitment",
                    "green training",
                    "green compensation",
                ],
            },
        ],
        dependentVariables: ["employee retention"],
        moderatingVariables: [],
        population: "bank employees",
        sector: "banking",
        location: { raw: "Enugu State", tier: "STATE" },
        vagueTermsFound: [],
        unmeasurableConstructs: [],
        ...overrides,
    };
}

describe("runFormulationChecks", () => {
    it("passes a well-formed topic with no findings", () => {
        const findings = runFormulationChecks(breakdown());

        expect(findings).toHaveLength(0);
    });

    it("flags a missing independent variable", () => {
        const findings = runFormulationChecks(
            breakdown({ independentVariables: [] }),
        );

        expect(findings.map((f) => f.code)).toContain("MISSING_IV");
    });

    it("flags a missing dependent variable", () => {
        const findings = runFormulationChecks(
            breakdown({ dependentVariables: [] }),
        );

        expect(findings.map((f) => f.code)).toContain("MISSING_DV");
    });

    it("flags vague phrasing found by the extractor", () => {
        const findings = runFormulationChecks(
            breakdown({ vagueTermsFound: ["role of"] }),
        );

        expect(findings.map((f) => f.code)).toContain("VAGUE_PHRASING");
    });

    it("flags unmeasurable constructs", () => {
        const findings = runFormulationChecks(
            breakdown({ unmeasurableConstructs: ["organizational culture"] }),
        );

        expect(findings.map((f) => f.code)).toContain(
            "UNMEASURABLE_VARIABLE",
        );
    });

    it("never flags location breadth", () => {
        const findings = runFormulationChecks(
            breakdown({ location: { raw: "Nigeria", tier: "COUNTRY" } }),
        );

        expect(findings.map((f) => f.code)).not.toContain("SCOPE_TOO_BROAD");
    });

    it("flags mismatched sub-variable counts across independent variables", () => {
        const findings = runFormulationChecks(
            breakdown({
                independentVariables: [
                    { name: "Green HRM", subVariables: ["a", "b", "c"] },
                    { name: "Leadership style", subVariables: ["x"] },
                ],
            }),
        );

        expect(findings.map((f) => f.code)).toContain(
            "SUBVARIABLE_MISMATCH",
        );
    });

    it("does not flag a sub-variable mismatch when counts match", () => {
        const findings = runFormulationChecks(
            breakdown({
                independentVariables: [
                    { name: "Green HRM", subVariables: ["a", "b"] },
                    { name: "Leadership style", subVariables: ["x", "y"] },
                ],
            }),
        );

        expect(findings.map((f) => f.code)).not.toContain(
            "SUBVARIABLE_MISMATCH",
        );
    });
});
