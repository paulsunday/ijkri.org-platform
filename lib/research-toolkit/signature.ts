/**
 * Deterministic string fingerprints for a research topic's variable/
 * sector/location combination. Plain normalized strings — not a
 * crypto hash — matching the WalletTransaction.idempotencyKey
 * convention rather than the Paystack webhook's createHash one,
 * since these need to be human-readable for debugging and do not
 * need cryptographic properties.
 */

export function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function buildVariableKey(
    independentVariableNames: string[],
    dependentVariableNames: string[],
): string {
    const ivPart = independentVariableNames
        .map(slugify)
        .filter(Boolean)
        .sort()
        .join("+");

    const dvPart = dependentVariableNames
        .map(slugify)
        .filter(Boolean)
        .sort()
        .join("+");

    return `iv:${ivPart || "unspecified"}|dv:${dvPart || "unspecified"}`;
}

export function buildSectorKey(sector: string): string {
    return slugify(sector) || "unspecified";
}

export function buildLocationKey(location: string): string {
    return slugify(location) || "unspecified";
}

export type SignatureInput = {
    independentVariableNames: string[];
    dependentVariableNames: string[];
    sector: string;
    location: string;
};

/**
 * The full combined fingerprint stored on ResearchTopic/
 * TopicReservation.signatureKey, and what the reservation's partial
 * unique index (one ACTIVE reservation per journal+signatureKey)
 * enforces "first claim" against.
 */
export function buildSignatureKey(input: SignatureInput): string {
    const variableKey = buildVariableKey(
        input.independentVariableNames,
        input.dependentVariableNames,
    );

    return `${variableKey}|sector:${buildSectorKey(input.sector)}|loc:${buildLocationKey(input.location)}`;
}
