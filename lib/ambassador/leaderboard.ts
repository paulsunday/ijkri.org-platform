import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { AmbassadorLevel } from "@/lib/generated/prisma";

export type LeaderboardEntry = {
  userId: string;
  name: string;
  affiliation: string | null;
  country: string | null;
  reviewsCompleted: number;
  publishedReferrals: number;
  totalEarnings: number;
  level: AmbassadorLevel;
};

function yearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

async function computeLeaderboard(year?: number): Promise<LeaderboardEntry[]> {
  const ambassadors = await prisma.reviewerAmbassador.findMany({
    where: { status: "ACTIVE" },
    select: {
      userId: true,
      level: true,
      user: {
        select: { name: true, affiliation: true, country: true },
      },
      wallet: { select: { id: true } },
    },
  });

  if (ambassadors.length === 0) {
    return [];
  }

  const reviewerIds = ambassadors.map((ambassador) => ambassador.userId);
  const walletIds = ambassadors
    .map((ambassador) => ambassador.wallet?.id)
    .filter((id): id is string => Boolean(id));

  const completedAtFilter = year ? yearRange(year) : undefined;
  const publishedAtFilter = year ? yearRange(year) : undefined;
  const earningsFilter = year ? yearRange(year) : undefined;

  const [reviewCounts, referralCounts, earningsSums] = await Promise.all([
    prisma.reviewAssignment.groupBy({
      by: ["reviewerId"],
      where: {
        reviewerId: { in: reviewerIds },
        status: "SUBMITTED",
        ...(completedAtFilter ? { completedAt: completedAtFilter } : {}),
      },
      _count: { _all: true },
    }),

    prisma.submission.groupBy({
      by: ["referrerReviewerId"],
      where: {
        referrerReviewerId: { in: reviewerIds },
        status: "PUBLISHED",
        ...(publishedAtFilter
          ? { article: { publishedAt: publishedAtFilter } }
          : {}),
      },
      _count: { _all: true },
    }),

    walletIds.length > 0
      ? prisma.walletTransaction.groupBy({
        by: ["walletId"],
        where: {
          walletId: { in: walletIds },
          direction: "CREDIT",
          ...(earningsFilter ? { createdAt: earningsFilter } : {}),
        },
        _sum: { amount: true },
      })
      : Promise.resolve([]),
  ]);

  const reviewCountByReviewer = new Map(
    reviewCounts.map((row) => [row.reviewerId, row._count._all]),
  );

  const referralCountByReviewer = new Map(
    referralCounts
      .filter((row) => row.referrerReviewerId)
      .map((row) => [row.referrerReviewerId as string, row._count._all]),
  );

  const earningsByWallet = new Map(
    earningsSums.map((row) => [row.walletId, Number(row._sum.amount ?? 0)]),
  );

  const entries: LeaderboardEntry[] = ambassadors.map((ambassador) => ({
    userId: ambassador.userId,
    name: ambassador.user.name,
    affiliation: ambassador.user.affiliation,
    country: ambassador.user.country,
    reviewsCompleted: reviewCountByReviewer.get(ambassador.userId) ?? 0,
    publishedReferrals: referralCountByReviewer.get(ambassador.userId) ?? 0,
    totalEarnings: ambassador.wallet
      ? (earningsByWallet.get(ambassador.wallet.id) ?? 0)
      : 0,
    level: ambassador.level,
  }));

  entries.sort((a, b) => {
    if (b.publishedReferrals !== a.publishedReferrals) {
      return b.publishedReferrals - a.publishedReferrals;
    }

    return b.reviewsCompleted - a.reviewsCompleted;
  });

  return entries;
}

/**
 * Public + reviewer-dashboard leaderboard, cached for 15 minutes and
 * tag-invalidated ("leaderboard") from review/publication/adjustment
 * mutations. Data volume is small (one journal, low-hundreds of
 * reviewers) so a groupBy-based live computation avoids N+1 without
 * needing a snapshot table.
 */
export async function getLeaderboard(
  year?: number,
): Promise<LeaderboardEntry[]> {
  const cached = unstable_cache(
    () => computeLeaderboard(year),
    ["ambassador-leaderboard", String(year ?? "all")],
    { revalidate: 900, tags: ["leaderboard"] },
  );

  return cached();
}

export async function getAmbassadorRank(
  userId: string,
  year?: number,
): Promise<number | null> {
  const leaderboard = await getLeaderboard(year);
  const index = leaderboard.findIndex((entry) => entry.userId === userId);

  return index === -1 ? null : index + 1;
}
