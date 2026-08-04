import { prisma } from "@/lib/prisma";

export type CampaignRewardType =
  | "REVIEW_REWARD"
  | "SUBMISSION_REWARD"
  | "PUBLICATION_REWARD"
  | "REFERRAL_BONUS";

type ResolveActiveCampaignInput = {
  journalId: string;
  rewardType: CampaignRewardType;
  baseAmount: number;
  manuscriptType?: string | null;
  referredCountry?: string | null;
  referredAffiliation?: string | null;
};

export type ResolvedCampaignBonus = {
  campaignId: string;
  bonusAmount: number;
};

function containsIgnoreCase(haystack: string | null | undefined, needle: string) {
  if (!haystack) {
    return false;
  }

  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function campaignBonusForType(
  campaign: { reviewBonus: unknown; submissionBonus: unknown; publicationBonus: unknown; referralBonus: unknown },
  rewardType: CampaignRewardType,
): number {
  switch (rewardType) {
    case "REVIEW_REWARD":
      return Number(campaign.reviewBonus);
    case "SUBMISSION_REWARD":
      return Number(campaign.submissionBonus);
    case "PUBLICATION_REWARD":
      return Number(campaign.publicationBonus);
    case "REFERRAL_BONUS":
      return Number(campaign.referralBonus);
    default:
      return 0;
  }
}

/**
 * Finds the single best-matching ACTIVE campaign for a reward event and
 * returns the additional bonus amount to credit on top of the base
 * Phase 1 reward. Never mutates state — the caller is responsible for
 * crediting the bonus and recording a CampaignRewardLog row inside its
 * own transaction (see lib/campaigns/apply-campaign-bonus.ts).
 */
export async function resolveActiveCampaignBonus(
  input: ResolveActiveCampaignInput,
): Promise<ResolvedCampaignBonus | null> {
  const now = new Date();

  const candidates = await prisma.referralCampaign.findMany({
    where: {
      journalId: input.journalId,
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const campaign of candidates) {
    if (campaign.targetCountry && !containsIgnoreCase(input.referredCountry, campaign.targetCountry)) {
      continue;
    }

    if (
      campaign.targetInstitution &&
      !containsIgnoreCase(input.referredAffiliation, campaign.targetInstitution)
    ) {
      continue;
    }

    if (
      campaign.targetDiscipline &&
      !containsIgnoreCase(input.manuscriptType, campaign.targetDiscipline)
    ) {
      continue;
    }

    const multiplier = Number(campaign.rewardMultiplier);
    const typeBonus = campaignBonusForType(campaign, input.rewardType);
    const multiplierBonus = input.baseAmount * Math.max(0, multiplier - 1);
    const totalBonus = multiplierBonus + typeBonus;

    if (totalBonus <= 0) {
      continue;
    }

    if (campaign.maxBudget !== null) {
      const remainingBudget = Number(campaign.maxBudget) - Number(campaign.spentBudget);

      if (remainingBudget <= 0) {
        continue;
      }

      if (totalBonus > remainingBudget) {
        // Pay out what's left of the budget rather than skipping entirely.
        return { campaignId: campaign.id, bonusAmount: remainingBudget };
      }
    }

    return { campaignId: campaign.id, bonusAmount: totalBonus };
  }

  return null;
}
