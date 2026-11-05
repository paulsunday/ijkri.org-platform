/*
 * Content of a public Research Variable Library page (VariableGuide.content),
 * plus helpers that turn it into the simple line-based text the admin
 * edits ("Name | definition" per line) and back.
 */

export type GuideConfidence = "ESTABLISHED" | "VERIFY";

export type GuideMeasurementType = "VALIDATED_SCALE" | "SECONDARY_DATA" | "BOTH";

export type VariableGuideContent = {
    definition: string;
    measurementType: GuideMeasurementType;
    dimensions: { name: string; definition: string }[];
    scales: { name: string; source: string; confidence: GuideConfidence }[];
    secondaryIndicators: { name: string; formula: string; dataSource: string }[];
    relatedVariables: string[];
    exampleTopics: string[];
    researchTips: string[];
};

const MEASUREMENT_TYPES: GuideMeasurementType[] = [
    "VALIDATED_SCALE",
    "SECONDARY_DATA",
    "BOTH",
];

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

/** Cleans AI output or stored JSON into a safe, complete shape. */
export function normalizeGuideContent(raw: unknown): VariableGuideContent {
    const value = (raw ?? {}) as Partial<VariableGuideContent>;

    return {
        definition: text(value.definition),
        measurementType: MEASUREMENT_TYPES.includes(
            value.measurementType as GuideMeasurementType,
        )
            ? (value.measurementType as GuideMeasurementType)
            : "VALIDATED_SCALE",
        dimensions: list<VariableGuideContent["dimensions"][number]>(
            value.dimensions,
        )
            .map((d) => ({ name: text(d?.name), definition: text(d?.definition) }))
            .filter((d) => d.name),
        scales: list<VariableGuideContent["scales"][number]>(value.scales)
            .map((s) => ({
                name: text(s?.name),
                source: text(s?.source),
                // Anything not explicitly established must be verified.
                confidence:
                    s?.confidence === "ESTABLISHED"
                        ? ("ESTABLISHED" as const)
                        : ("VERIFY" as const),
            }))
            .filter((s) => s.name),
        secondaryIndicators: list<
            VariableGuideContent["secondaryIndicators"][number]
        >(value.secondaryIndicators)
            .map((i) => ({
                name: text(i?.name),
                formula: text(i?.formula),
                dataSource: text(i?.dataSource),
            }))
            .filter((i) => i.name),
        relatedVariables: list<string>(value.relatedVariables)
            .map(text)
            .filter(Boolean),
        exampleTopics: list<string>(value.exampleTopics).map(text).filter(Boolean),
        researchTips: list<string>(value.researchTips).map(text).filter(Boolean),
    };
}

/* ---------- Line-based editing format ---------- */

function splitLines(value: string): string[] {
    return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function splitParts(line: string, count: number): string[] {
    const parts = line.split("|").map((part) => part.trim());

    // Keep any extra "|" inside the last field.
    if (parts.length > count) {
        parts.splice(count - 1, parts.length, parts.slice(count - 1).join(" | "));
    }

    while (parts.length < count) parts.push("");

    return parts;
}

export function parseLines(value: string): string[] {
    return splitLines(value);
}

export function parseDimensions(value: string) {
    return splitLines(value).map((line) => {
        const [name, definition] = splitParts(line, 2);
        return { name, definition };
    });
}

export function parseScales(value: string) {
    return splitLines(value).map((line) => {
        const [name, source, confidence] = splitParts(line, 3);
        return {
            name,
            source,
            confidence:
                confidence.toUpperCase() === "ESTABLISHED"
                    ? ("ESTABLISHED" as const)
                    : ("VERIFY" as const),
        };
    });
}

export function parseIndicators(value: string) {
    return splitLines(value).map((line) => {
        const [name, formula, dataSource] = splitParts(line, 3);
        return { name, formula, dataSource };
    });
}

export function formatDimensions(items: VariableGuideContent["dimensions"]) {
    return items.map((d) => `${d.name} | ${d.definition}`).join("\n");
}

export function formatScales(items: VariableGuideContent["scales"]) {
    return items.map((s) => `${s.name} | ${s.source} | ${s.confidence}`).join("\n");
}

export function formatIndicators(
    items: VariableGuideContent["secondaryIndicators"],
) {
    return items
        .map((i) => `${i.name} | ${i.formula} | ${i.dataSource}`)
        .join("\n");
}
