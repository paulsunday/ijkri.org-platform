import { prisma } from "@/lib/prisma";

export type RewardSettings = {
  reviewReward: number;
  submissionReward: number;
  publicationReward: number;
  referralBonus: number;
  currency: string;
};

const ZERO_REWARD_SETTINGS: RewardSettings = {
  reviewReward: 0,
  submissionReward: 0,
  publicationReward: 0,
  referralBonus: 0,
  currency: "USD",
};

/**
 * Loads the admin-configurable reward amounts for a journal. Never
 * hardcodes a fallback amount — if no settings row exists yet, every
 * reward resolves to 0 (a no-op credit) until an admin configures it via
 * /admin/reviewer-ambassadors/settings.
 */
export async function getRewardSettings(
  journalId: string,
): Promise<RewardSettings> {
  const settings = await prisma.ambassadorRewardSetting.findUnique({
    where: { journalId },
  });

  if (!settings) {
    return ZERO_REWARD_SETTINGS;
  }

  return {
    reviewReward: Number(settings.reviewReward),
    submissionReward: Number(settings.submissionReward),
    publicationReward: Number(settings.publicationReward),
    referralBonus: Number(settings.referralBonus),
    currency: settings.currency,
  };
}
