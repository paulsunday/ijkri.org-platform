import { describe, expect, it } from "vitest";

import {
    normalizeFormulationPlan,
    parseObjectiveCount,
    type FormulationPlan,
} from "./formulation-plan";

function objective(n: number) {
    return {
        objective: ` To examine effect ${n} `,
        independentProxy: `IV ${n}`,
        dependentProxy: "Performance",
        researchQuestion: `RQ ${n}`,
        nullHypothesis: `H0 ${n}`,
    };
}

describe("normalizeFormulationPlan", () => {
    it("caps specific objectives at the requested count and trims text", () => {
        const plan = normalizeFormulationPlan(
            {
                generalObjective: " General ",
                specificObjectives: [1, 2, 3, 4, 5].map(objective),
            },
            3,
        );

        expect(plan.generalObjective).toBe("General");
        expect(plan.specificObjectives).toHaveLength(3);
        expect(plan.specificObjectives[0].objective).toBe(
            "To examine effect 1",
        );
    });

    it("marks any scale not explicitly established as needing verification", () => {
        const plan = normalizeFormulationPlan(
            {
                variables: [
                    {
                        role: "INDEPENDENT",
                        name: "Leadership",
                        proxies: [
                            {
                                name: "Idealized influence",
                                definition: "d",
                                scaleName: "MLQ",
                                scaleSource: "Bass & Avolio (1995)",
                                confidence: "ESTABLISHED",
                            },
                            {
                                name: "Made-up dimension",
                                definition: "d",
                                scaleName: "Unknown",
                                scaleSource: "",
                                confidence:
                                    "MAYBE" as unknown as "VERIFY",
                            },
                        ],
                    },
                ],
            },
            2,
        );

        expect(plan.variables[0].proxies.map((p) => p.confidence)).toEqual([
            "ESTABLISHED",
            "VERIFY",
        ]);
    });

    it("tolerates missing sections", () => {
        const plan = normalizeFormulationPlan(
            {} as Partial<FormulationPlan>,
            4,
        );

        expect(plan.variables).toEqual([]);
        expect(plan.specificObjectives).toEqual([]);
        expect(plan.methodology.analysisTechnique).toBe("");
    });
});

describe("parseObjectiveCount", () => {
    it("clamps to the allowed range", () => {
        expect(parseObjectiveCount("12", 2, 8, 4)).toBe(8);
        expect(parseObjectiveCount("1", 2, 8, 4)).toBe(2);
        expect(parseObjectiveCount("5", 2, 8, 4)).toBe(5);
    });

    it("falls back when the value is missing", () => {
        expect(parseObjectiveCount(null, 2, 8, 4)).toBe(4);
    });
});
