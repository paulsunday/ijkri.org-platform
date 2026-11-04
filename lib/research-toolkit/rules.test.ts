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
        const findings = runFormulationChecks(breakdown(), "MSC");

        expect(findings).toHaveLength(0);
    });

    it("flags a missing independent variable", () => {
        const findings = runFormulationChecks(
            breakdown({ independentVariables: [] }),
            "MSC",
        );

        expect(findings.map((f) => f.code)).toContain("MISSING_IV");
    });

    it("flags a missing dependent variable", () => {
        const findings = runFormulationChecks(
            breakdown({ dependentVariables: [] }),
            "MSC",
        );

        expect(findings.map((f) => f.code)).toContain("MISSING_DV");
    });

    it("flags vague phrasing found by the extractor", () => {
        const findings = runFormulationChecks(
            breakdown({ vagueTermsFound: ["role of"] }),
            "MSC",
        );

        expect(findings.map((f) => f.code)).toContain("VAGUE_PHRASING");
    });

    it("flags unmeasurable constructs", () => {
        const findings = runFormulationChecks(
            breakdown({ unmeasurableConstructs: ["organizational culture"] }),
            "MSC",
        );

        expect(findings.map((f) => f.code)).toContain(
            "UNMEASURABLE_VARIABLE",
        );
    });

    it("flags a country-wide scope for an MSc study", () => {
        const findings = runFormulationChecks(
            breakdown({ location: { raw: "Nigeria", tier: "COUNTRY" } }),
            "MSC",
        );

        expect(findings.map((f) => f.code)).toContain("SCOPE_TOO_BROAD");
    });

    it("allows a country-wide scope for a PhD study", () => {
        const findings = runFormulationChecks(
            breakdown({ location: { raw: "Nigeria", tier: "COUNTRY" } }),
            "PHD",
        );

        expect(findings.map((f) => f.code)).not.toContain("SCOPE_TOO_BROAD");
    });

    it("allows an organization-level scope for a BSc study", () => {
        const findings = runFormulationChecks(
            breakdown({
                location: { raw: "First Bank Enugu", tier: "ORGANIZATION" },
            }),
            "BSC",
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
            "MSC",
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
            "MSC",
        );

        expect(findings.map((f) => f.code)).not.toContain(
            "SUBVARIABLE_MISMATCH",
        );
    });
});
