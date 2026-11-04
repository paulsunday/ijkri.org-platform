"use server";

import { redirect } from "next/navigation";

import {
    extractTopicBreakdown,
    type DegreeLevelInput,
} from "@/lib/ai/formulation-checker";
import { requireActionUser } from "@/lib/auth/current-user";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";
import { recordStudiedSignature } from "@/lib/research-toolkit/gap-finder";
import { runFormulationChecks } from "@/lib/research-toolkit/rules";
import { buildSignatureKey } from "@/lib/research-toolkit/signature";

const DEGREE_LEVELS: DegreeLevelInput[] = [
    "ND",
    "HND",
    "BSC",
    "PGD",
    "MSC",
    "MPHIL",
    "PHD",
];

export async function checkFormulation(formData: FormData) {
    const user = await requireActionUser();

    const topicText = String(formData.get("topicText") || "").trim();
    const degreeLevel = String(formData.get("degreeLevel") || "").trim();
    const discipline = String(formData.get("discipline") || "").trim();

    if (topicText.length < 15) {
        throw new Error(
            "Enter your working topic/title in full (at least 15 characters).",
        );
    }

    if (!DEGREE_LEVELS.includes(degreeLevel as DegreeLevelInput)) {
        throw new Error("Select a valid degree level.");
    }

    const journal = await prisma.journal.findFirst({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: "asc",
        },
        select: {
            id: true,
        },
    });

    if (!journal) {
        throw new Error(
            "The Research Topic Formulation Workbench is not currently available.",
        );
    }

    const access = await hasToolkitAccess({
        userId: user.id,
        journalId: journal.id,
    });

    if (!access) {
        redirect("/toolkit");
    }

    const breakdown = await extractTopicBreakdown({
        topicText,
        degreeLevel: degreeLevel as DegreeLevelInput,
        discipline: discipline || undefined,
    });

    const checkerFindings = runFormulationChecks(
        breakdown,
        degreeLevel as DegreeLevelInput,
    );

    const signatureKey = buildSignatureKey({
        independentVariableNames: breakdown.independentVariables.map(
            (iv) => iv.name,
        ),
        dependentVariableNames: breakdown.dependentVariables,
        sector: breakdown.sector,
        location: breakdown.location.raw,
    });

    const topic = await prisma.researchTopic.create({
        data: {
            journalId: journal.id,
            userId: user.id,
            rawTopicText: topicText,
            degreeLevel: degreeLevel as DegreeLevelInput,
            discipline: discipline || null,
            breakdown,
            checkerFindings,
            signatureKey,
        },
    });

    await recordStudiedSignature({
        journalId: journal.id,
        independentVariableNames: breakdown.independentVariables.map(
            (iv) => iv.name,
        ),
        dependentVariableNames: breakdown.dependentVariables,
        sector: breakdown.sector,
        location: breakdown.location.raw,
    });

    redirect(`/toolkit/${topic.id}`);
}
