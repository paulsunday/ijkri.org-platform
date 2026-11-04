import "server-only";

import { redirect } from "next/navigation";

import type {
    DegreeLevelInput,
    TopicBreakdown,
} from "@/lib/ai/formulation-checker";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";
import { recordStudiedSignature } from "@/lib/research-toolkit/gap-finder";
import { runFormulationChecks } from "@/lib/research-toolkit/rules";
import { buildSignatureKey } from "@/lib/research-toolkit/signature";

export const DEGREE_LEVELS: DegreeLevelInput[] = [
    "ND",
    "HND",
    "BSC",
    "PGD",
    "MSC",
    "MPHIL",
    "PHD",
];

export function isDegreeLevel(value: string): value is DegreeLevelInput {
    return DEGREE_LEVELS.includes(value as DegreeLevelInput);
}

/**
 * Returns the toolkit's journal id, or redirects to the unlock page when
 * the user hasn't paid for access.
 */
export async function requireToolkitJournal(userId: string): Promise<string> {
    const journal = await prisma.journal.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });

    if (!journal) {
        throw new Error(
            "The Research Topic Formulation Workbench is not currently available.",
        );
    }

    const access = await hasToolkitAccess({
        userId,
        journalId: journal.id,
    });

    if (!access) {
        redirect("/toolkit");
    }

    return journal.id;
}

/**
 * Saves a topic with its variable breakdown, runs the deterministic
 * formulation checks, and records it in the gap-finder corpus.
 */
export async function saveCheckedTopic({
    journalId,
    userId,
    topicText,
    degreeLevel,
    discipline,
    breakdown,
}: {
    journalId: string;
    userId: string;
    topicText: string;
    degreeLevel: DegreeLevelInput;
    discipline: string;
    breakdown: TopicBreakdown;
}): Promise<string> {
    const independentVariableNames = breakdown.independentVariables.map(
        (iv) => iv.name,
    );

    const topic = await prisma.researchTopic.create({
        data: {
            journalId,
            userId,
            rawTopicText: topicText,
            degreeLevel,
            discipline: discipline || null,
            breakdown,
            checkerFindings: runFormulationChecks(breakdown),
            signatureKey: buildSignatureKey({
                independentVariableNames,
                dependentVariableNames: breakdown.dependentVariables,
                sector: breakdown.sector,
                location: breakdown.location.raw,
            }),
        },
        select: { id: true },
    });

    await recordStudiedSignature({
        journalId,
        independentVariableNames,
        dependentVariableNames: breakdown.dependentVariables,
        sector: breakdown.sector,
        location: breakdown.location.raw,
    });

    return topic.id;
}
