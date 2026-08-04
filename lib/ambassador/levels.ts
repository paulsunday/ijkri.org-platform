import type { AmbassadorLevel } from "@/lib/generated/prisma";

/**
 * Published-referral thresholds required to reach each ambassador level.
 * Ordered highest first so calculateAmbassadorLevel can short-circuit.
 */
export const LEVEL_THRESHOLDS: {
  level: AmbassadorLevel;
  publishedReferrals: number;
}[] = [
  { level: "PLATINUM", publishedReferrals: 30 },
  { level: "GOLD", publishedReferrals: 15 },
  { level: "SILVER", publishedReferrals: 8 },
  { level: "BRONZE", publishedReferrals: 3 },
];

/**
 * Pure function mapping a published-referral count to the ambassador
 * level it qualifies for. Levels only ever go up (recalculated at
 * publish-time, never re-lowered by an editor's later decision).
 */
export function calculateAmbassadorLevel(
  publishedReferralCount: number,
): AmbassadorLevel {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (publishedReferralCount >= threshold.publishedReferrals) {
      return threshold.level;
    }
  }

  return "NONE";
}

export const LEVEL_LABELS: Record<AmbassadorLevel, string> = {
  NONE: "Unranked",
  BRONZE: "Bronze Ambassador",
  SILVER: "Silver Ambassador",
  GOLD: "Gold Ambassador",
  PLATINUM: "Platinum Ambassador",
};
