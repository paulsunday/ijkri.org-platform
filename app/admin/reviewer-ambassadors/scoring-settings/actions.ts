"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const WEIGHT_FIELDS = [
  "reviewQualityWeight",
  "completionTimeWeight",
  "editorialRatingWeight",
  "completedReviewsWeight",
  "invitationAcceptanceWeight",
  "referralPublicationWeight",
  "latePenaltyWeight",
  "recommendationAccuracyWeight",
  "withdrawalPenaltyWeight",
] as const;

export async function updateScoringSettings(formData: FormData) {
  const admin = await requireActionRole("SUPER_ADMIN");

  const journalId = String(formData.get("journalId") || "").trim();

  if (!journalId) {
    throw new Error("Journal ID is missing.");
  }

  const weights: Record<(typeof WEIGHT_FIELDS)[number], number> = {} as never;

  for (const field of WEIGHT_FIELDS) {
    const value = Number(formData.get(field));

    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error("Each weight must be a number between 0 and 100.");
    }

    weights[field] = value;
  }

  const total = WEIGHT_FIELDS.reduce((sum, field) => sum + weights[field], 0);

  if (total !== 100) {
    throw new Error(`Weights must sum to 100 (currently ${total}).`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewerScoringSettings.upsert({
      where: { journalId },
      update: { ...weights, updatedById: admin.id },
      create: { journalId, ...weights, updatedById: admin.id },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "ReviewerScoringSettings",
        entityId: journalId,
        metadata: { event: "SCORING_WEIGHTS_UPDATED", weights },
      },
    });
  });

  revalidatePath("/admin/reviewer-ambassadors/scoring-settings");
}
