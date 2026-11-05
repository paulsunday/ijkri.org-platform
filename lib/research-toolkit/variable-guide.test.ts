import { describe, expect, it } from "vitest";

import {
    formatDimensions,
    formatIndicators,
    formatScales,
    normalizeGuideContent,
    parseDimensions,
    parseIndicators,
    parseScales,
} from "./variable-guide";

describe("line-based editing format", () => {
    it("round-trips dimensions, scales and indicators", () => {
        const dimensions = [{ name: "Idealized influence", definition: "Role modelling" }];
        const scales = [
            { name: "MLQ-5X", source: "Bass & Avolio (1995)", confidence: "ESTABLISHED" as const },
        ];
        const indicators = [
            { name: "ROA", formula: "Net income ÷ Total assets", dataSource: "Annual reports" },
        ];

        expect(parseDimensions(formatDimensions(dimensions))).toEqual(dimensions);
        expect(parseScales(formatScales(scales))).toEqual(scales);
        expect(parseIndicators(formatIndicators(indicators))).toEqual(indicators);
    });

    it("treats anything but ESTABLISHED as needing verification", () => {
        expect(parseScales("Some scale | Smith (2001) | maybe")[0].confidence).toBe(
            "VERIFY",
        );
        expect(parseScales("Some scale")[0]).toEqual({
            name: "Some scale",
            source: "",
            confidence: "VERIFY",
        });
    });

    it("keeps extra | characters inside the last field and skips blank lines", () => {
        expect(parseDimensions("\nA | uses | pipes\n\n")).toEqual([
            { name: "A", definition: "uses | pipes" },
        ]);
    });
});

describe("normalizeGuideContent", () => {
    it("fills a complete, safe shape from partial data", () => {
        const content = normalizeGuideContent({
            definition: " X is Y. ",
            measurementType: "NONSENSE",
            scales: [{ name: "S", source: "", confidence: "ESTABLISHED" }, { name: "" }],
        });

        expect(content.definition).toBe("X is Y.");
        expect(content.measurementType).toBe("VALIDATED_SCALE");
        expect(content.scales).toHaveLength(1);
        expect(content.exampleTopics).toEqual([]);
    });
});
