import { describe, expect, it } from "vitest";

import type { TopicBreakdown } from "@/lib/ai/formulation-checker";

import { generateFormulation } from "./generate-objectives";

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

describe("generateFormulation", () => {
    it("generates one specific objective/question/hypothesis per sub-variable", () => {
        const result = generateFormulation(breakdown());

        expect(result.specificObjectives).toHaveLength(3);
        expect(result.researchQuestions).toHaveLength(3);
        expect(result.nullHypotheses).toHaveLength(3);
    });

    it("includes the sub-variable, dependent variable, and audience in each objective", () => {
        const result = generateFormulation(breakdown());

        expect(result.specificObjectives[0]).toContain("green recruitment");
        expect(result.specificObjectives[0]).toContain("employee retention");
        expect(result.specificObjectives[0]).toContain("bank employees");
        expect(result.specificObjectives[0]).toContain("Enugu State");
    });

    it("phrases null hypotheses in the H0 form", () => {
        const result = generateFormulation(breakdown());

        for (const hypothesis of result.nullHypotheses) {
            expect(hypothesis).toMatch(/^H0: /);
            expect(hypothesis).toContain("no significant effect");
        }
    });

    it("falls back to one objective per independent variable when there are no sub-variables", () => {
        const result = generateFormulation(
            breakdown({
                independentVariables: [
                    { name: "Leadership style", subVariables: [] },
                ],
            }),
        );

        expect(result.specificObjectives).toHaveLength(1);
        expect(result.specificObjectives[0]).toContain("Leadership style");
    });

    it("never produces an empty objective/question/hypothesis list", () => {
        const result = generateFormulation(
            breakdown({ independentVariables: [], dependentVariables: [] }),
        );

        expect(result.specificObjectives.length).toBeGreaterThan(0);
        expect(result.researchQuestions.length).toBeGreaterThan(0);
        expect(result.nullHypotheses.length).toBeGreaterThan(0);
    });
});
