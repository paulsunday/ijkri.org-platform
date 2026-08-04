import { prisma } from "@/lib/prisma";
import { calculateReviewerScore } from "./calculate-score";
import type { CalculatedScore } from "./calculate-score";

export type PerformanceView = {
  ambassadorId: string;
  reviewerName: string;
  score: CalculatedScore;
  calculatedAt: Date;
  isLive: boolean;
  history: { date: string; score: number }[];
};

/**
 * Loads the latest persisted ReviewerPerformanceSnapshot for display. If
 * none exists yet (a reviewer who hasn't been rated or had a referral
 * publish), computes one live (read-only, not persisted) so the page
 * isn't empty for a brand-new reviewer.
 */
export async function getPerformanceView(
  ambassadorId: string,
): Promise<PerformanceView | null> {
  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { id: ambassadorId },
    select: { user: { select: { name: true } } },
  });

  if (!ambassador) {
    return null;
  }

  const [latestSnapshot, historyRows] = await Promise.all([
    prisma.reviewerPerformanceSnapshot.findFirst({
      where: { ambassadorId },
      orderBy: { calculatedAt: "desc" },
    }),

    prisma.reviewerPerformanceSnapshot.findMany({
      where: { ambassadorId },
      orderBy: { calculatedAt: "desc" },
      take: 20,
      select: { overallScore: true, calculatedAt: true },
    }),
  ]);

  const history = historyRows
    .reverse()
    .map((row) => ({
      date: row.calculatedAt.toLocaleDateString(),
      score: row.overallScore,
    }));

  if (latestSnapshot) {
    return {
      ambassadorId,
      reviewerName: ambassador.user.name,
      score: {
        overallScore: latestSnapshot.overallScore,
        grade: latestSnapshot.grade,
        trend: latestSnapshot.trend,
        breakdown: latestSnapshot.breakdown as CalculatedScore["breakdown"],
        strengths: latestSnapshot.strengths as string[],
        improvements: latestSnapshot.improvements as string[],
      },
      calculatedAt: latestSnapshot.calculatedAt,
      isLive: false,
      history,
    };
  }

  const liveScore = await calculateReviewerScore(ambassadorId);

  return {
    ambassadorId,
    reviewerName: ambassador.user.name,
    score: liveScore,
    calculatedAt: new Date(),
    isLive: true,
    history,
  };
}
