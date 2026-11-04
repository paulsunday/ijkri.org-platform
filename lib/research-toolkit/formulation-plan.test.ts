import { describe, expect, it } from "vitest";

import {
    getMeasurementType,
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

describe("measurement types", () => {
    const proxy = (overrides: Record<string, unknown>) => ({
        name: "ROA",
        definition: "d",
        scaleName: "",
        scaleSource: "",
        confidence: "ESTABLISHED",
        ...overrides,
    });

    function normalize(proxies: Record<string, unknown>[]) {
        return normalizeFormulationPlan(
            {
                variables: [
                    {
                        role: "DEPENDENT",
                        name: "Financial performance",
                        proxies: proxies as never,
                    },
                ],
            },
            2,
        ).variables[0].proxies;
    }

    it("keeps secondary-data proxies with their source and formula", () => {
        const [roa] = normalize([
            proxy({
                measurementType: "SECONDARY_DATA",
                dataSource: " Audited annual reports ",
                formula: "ROA = Net income ÷ Total assets",
            }),
        ]);

        expect(roa.measurementType).toBe("SECONDARY_DATA");
        expect(roa.dataSource).toBe("Audited annual reports");
        expect(roa.formula).toBe("ROA = Net income ÷ Total assets");
    });

    it("treats older plans without a type as validated scales", () => {
        const [legacy] = normalize([proxy({ scaleName: "MLQ" })]);

        expect(getMeasurementType(legacy)).toBe("VALIDATED_SCALE");
    });

    it("always flags researcher-developed items for verification", () => {
        const [item] = normalize([
            proxy({
                measurementType: "RESEARCHER_DEVELOPED",
                confidence: "ESTABLISHED",
            }),
        ]);

        expect(item.confidence).toBe("VERIFY");
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
