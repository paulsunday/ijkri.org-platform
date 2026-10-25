"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import {
  runFormAction,
  type FormActionState,
} from "@/lib/forms/run-form-action";

function parseAmount(value: FormDataEntryValue | null, label: string) {
  const amount = Number(String(value || "").trim());

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return amount;
}

export async function updateRewardSettings(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return runFormAction(async () => {
    const admin = await requireAnyActionRole(ADMIN_ROLES);

    const journalId = String(formData.get("journalId") || "").trim();

    if (!journalId) {
      throw new Error("Journal ID is missing.");
    }

    const reviewReward = parseAmount(formData.get("reviewReward"), "Review reward");
    const submissionReward = parseAmount(
      formData.get("submissionReward"),
      "Submission reward",
    );
    const publicationReward = parseAmount(
      formData.get("publicationReward"),
      "Publication reward",
    );
    const referralBonus = parseAmount(formData.get("referralBonus"), "Referral bonus");

    await prisma.$transaction(async (tx) => {
      await tx.ambassadorRewardSetting.upsert({
        where: { journalId },
        update: {
          reviewReward,
          submissionReward,
          publicationReward,
          referralBonus,
          updatedById: admin.id,
        },
        create: {
          journalId,
          reviewReward,
          submissionReward,
          publicationReward,
          referralBonus,
          updatedById: admin.id,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: admin.id,
          action: "UPDATE",
          entity: "AmbassadorRewardSetting",
          entityId: journalId,
          metadata: {
            event: "REWARD_SETTINGS_UPDATED",
            reviewReward,
            submissionReward,
            publicationReward,
            referralBonus,
          },
        },
      });
    });

    revalidatePath("/admin/reviewer-ambassadors/settings");

    return "Reward settings saved.";
  }, { action: "updateRewardSettings" });
}
