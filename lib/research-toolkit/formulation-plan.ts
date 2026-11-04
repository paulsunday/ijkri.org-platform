/*
 * The AI-built "formulation plan" stored on a ResearchTopic: variables
 * broken into measurable proxies (validated scales or secondary data), N specific
 * objectives aligned with research questions and hypotheses, plus
 * theory, framework and methodology guidance.
 */

export type ScaleConfidence = "ESTABLISHED" | "VERIFY";

export type VariableRole =
    | "INDEPENDENT"
    | "DEPENDENT"
    | "MODERATING"
    | "MEDIATING";

export type MeasurementType =
    | "VALIDATED_SCALE"
    | "SECONDARY_DATA"
    | "RESEARCHER_DEVELOPED";

export type VariableProxy = {
    name: string;
    definition: string;
    /** Missing on plans generated before secondary-data support. */
    measurementType?: MeasurementType;
    scaleName: string;
    scaleSource: string;
    /** Secondary data only: where the figures come from. */
    dataSource?: string;
    /** Secondary data only: how the proxy is computed. */
    formula?: string;
    confidence: ScaleConfidence;
};

const MEASUREMENT_TYPES: MeasurementType[] = [
    "VALIDATED_SCALE",
    "SECONDARY_DATA",
    "RESEARCHER_DEVELOPED",
];

/** How a proxy is measured, defaulting older plans to a scale. */
export function getMeasurementType(proxy: VariableProxy): MeasurementType {
    if (proxy.measurementType && MEASUREMENT_TYPES.includes(proxy.measurementType)) {
        return proxy.measurementType;
    }

    return proxy.scaleName.startsWith("Researcher-developed")
        ? "RESEARCHER_DEVELOPED"
        : "VALIDATED_SCALE";
}

export type PlanVariable = {
    role: VariableRole;
    name: string;
    proxies: VariableProxy[];
};

export type PlanObjective = {
    objective: string;
    independentProxy: string;
    dependentProxy: string;
    researchQuestion: string;
    nullHypothesis: string;
};

export type FormulationPlan = {
    generalObjective: string;
    variables: PlanVariable[];
    specificObjectives: PlanObjective[];
    theories: { name: string; proponents: string; relevance: string }[];
    conceptualFramework: string;
    methodology: {
        researchDesign: string;
        populationAndSampling: string;
        instrument: string;
        validityAndReliability: string;
        analysisTechnique: string;
    };
    otherAssistance: { title: string; advice: string }[];
};

const ROLES: VariableRole[] = [
    "INDEPENDENT",
    "DEPENDENT",
    "MODERATING",
    "MEDIATING",
];

const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

/**
 * Cleans an AI response before it is stored: trims strings, drops empty
 * entries, coerces unknown enum values to the cautious option, and caps
 * the specific objectives at the number the student asked for.
 */
export function normalizeFormulationPlan(
    raw: Partial<FormulationPlan>,
    objectiveCount: number,
): FormulationPlan {
    const variables = list<PlanVariable>(raw.variables)
        .map((variable) => ({
            role: ROLES.includes(variable?.role)
                ? variable.role
                : ("INDEPENDENT" as const),
            name: text(variable?.name),
            proxies: list<VariableProxy>(variable?.proxies)
                .map((proxy) => {
                    const cleaned: VariableProxy = {
                        name: text(proxy?.name),
                        definition: text(proxy?.definition),
                        scaleName: text(proxy?.scaleName),
                        scaleSource: text(proxy?.scaleSource),
                        dataSource: text(proxy?.dataSource),
                        formula: text(proxy?.formula),
                        // Anything not explicitly "ESTABLISHED" must be verified.
                        confidence:
                            proxy?.confidence === "ESTABLISHED"
                                ? "ESTABLISHED"
                                : "VERIFY",
                    };

                    cleaned.measurementType = getMeasurementType({
                        ...cleaned,
                        measurementType: proxy?.measurementType,
                    });

                    // Researcher-developed items always need checking.
                    if (cleaned.measurementType === "RESEARCHER_DEVELOPED") {
                        cleaned.confidence = "VERIFY";
                    }

                    return cleaned;
                })
                .filter((proxy) => proxy.name),
        }))
        .filter((variable) => variable.name);

    const specificObjectives = list<PlanObjective>(raw.specificObjectives)
        .map((item) => ({
            objective: text(item?.objective),
            independentProxy: text(item?.independentProxy),
            dependentProxy: text(item?.dependentProxy),
            researchQuestion: text(item?.researchQuestion),
            nullHypothesis: text(item?.nullHypothesis),
        }))
        .filter((item) => item.objective)
        .slice(0, objectiveCount);

    const methodology = raw.methodology ?? ({} as FormulationPlan["methodology"]);

    return {
        generalObjective: text(raw.generalObjective),
        variables,
        specificObjectives,
        theories: list<FormulationPlan["theories"][number]>(raw.theories)
            .map((theory) => ({
                name: text(theory?.name),
                proponents: text(theory?.proponents),
                relevance: text(theory?.relevance),
            }))
            .filter((theory) => theory.name),
        conceptualFramework: text(raw.conceptualFramework),
        methodology: {
            researchDesign: text(methodology.researchDesign),
            populationAndSampling: text(methodology.populationAndSampling),
            instrument: text(methodology.instrument),
            validityAndReliability: text(methodology.validityAndReliability),
            analysisTechnique: text(methodology.analysisTechnique),
        },
        otherAssistance: list<FormulationPlan["otherAssistance"][number]>(
            raw.otherAssistance,
        )
            .map((tip) => ({
                title: text(tip?.title),
                advice: text(tip?.advice),
            }))
            .filter((tip) => tip.title && tip.advice),
    };
}

/** Clamp a requested objective count into the supported range. */
export function parseObjectiveCount(
    value: FormDataEntryValue | null,
    min: number,
    max: number,
    fallback: number,
): number {
    const parsed = Number.parseInt(String(value ?? ""), 10);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}
