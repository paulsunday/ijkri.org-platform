import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { calculateReviewerScore } from "./calculate-score";
import type { Prisma } from "@/lib/generated/prisma";

/**
 * Recalculates and persists a new ReviewerPerformanceSnapshot for an
 * ambassador. Never throws — callers invoke this as a best-effort,
 * non-fatal side effect (same doctrine as Phase 1's publication reward
 * hook), so a scoring failure never blocks the action that triggered it.
 */
export async function recalculateReviewerScore(ambassadorId: string): Promise<void> {
  try {
    const score = await calculateReviewerScore(ambassadorId);

    await prisma.reviewerPerformanceSnapshot.create({
      data: {
        ambassadorId,
        overallScore: score.overallScore,
        grade: score.grade,
        trend: score.trend,
        breakdown: score.breakdown as unknown as Prisma.InputJsonValue,
        strengths: score.strengths as unknown as Prisma.InputJsonValue,
        improvements: score.improvements as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.error("Reviewer performance score recalculation failed", error, {
      event: "REVIEWER_SCORE_RECALC_FAILED",
      ambassadorId,
    });
  }
}
