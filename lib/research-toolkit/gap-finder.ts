import "server-only";

import { prisma } from "@/lib/prisma";

import {
    buildLocationKey,
    buildSectorKey,
    buildVariableKey,
} from "./signature";

export type StudiedLocation = {
    locationKey: string;
    count: number;
};

export type GapFinderResult = {
    variableKey: string;
    sectorKey: string;
    studiedLocations: StudiedLocation[];
};

/**
 * Looks up which location keys have already been checked/reserved on
 * this platform for a given variable+sector combination, so the UI
 * can show "studied here, not yet logged there" — or, since the
 * corpus starts empty, an honest "nothing recorded yet" state.
 */
export async function findStudiedLocations({
    journalId,
    independentVariableNames,
    dependentVariableNames,
    sector,
}: {
    journalId: string;
    independentVariableNames: string[];
    dependentVariableNames: string[];
    sector: string;
}): Promise<GapFinderResult> {
    const variableKey = buildVariableKey(
        independentVariableNames,
        dependentVariableNames,
    );

    const sectorKey = buildSectorKey(sector);

    const rows = await prisma.studiedTopicSignature.findMany({
        where: {
            journalId,
            variableKey,
            sector: sectorKey,
        },
        orderBy: {
            locationKey: "asc",
        },
        select: {
            locationKey: true,
            count: true,
        },
    });

    return {
        variableKey,
        sectorKey,
        studiedLocations: rows,
    };
}

/**
 * Upserts the gap-finder ledger. Called after every formulation check
 * and every reservation so the corpus grows from real activity —
 * there is no seed dataset.
 */
export async function recordStudiedSignature({
    journalId,
    independentVariableNames,
    dependentVariableNames,
    sector,
    location,
}: {
    journalId: string;
    independentVariableNames: string[];
    dependentVariableNames: string[];
    sector: string;
    location: string;
}): Promise<void> {
    const variableKey = buildVariableKey(
        independentVariableNames,
        dependentVariableNames,
    );

    const sectorKey = buildSectorKey(sector);
    const locationKey = buildLocationKey(location);

    await prisma.studiedTopicSignature.upsert({
        where: {
            journalId_variableKey_sector_locationKey: {
                journalId,
                variableKey,
                sector: sectorKey,
                locationKey,
            },
        },
        create: {
            journalId,
            variableKey,
            sector: sectorKey,
            locationKey,
            count: 1,
        },
        update: {
            count: {
                increment: 1,
            },
        },
    });
}
