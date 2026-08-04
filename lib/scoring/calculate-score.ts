import { prisma } from "@/lib/prisma";
import { gradeForScore } from "./grades";
import type { ScoreTrend } from "@/lib/generated/prisma";

const TARGET_COMPLETION_DAYS = 14;
const COMPLETED_REVIEWS_TARGET = 20;

/**
 * Score used for any factor with insufficient data yet, so a reviewer
 * who is simply new (no ratings, no referrals) isn't unfairly scored
 * near zero on factors they haven't had a chance to demonstrate.
 */
const NEUTRAL_SCORE = 70;

const FACTOR_LABELS: Record<string, string> = {
  reviewQuality: "Review quality",
  completionTime: "Review completion speed",
  editorialRating: "Recent editorial ratings",
  completedReviews: "Volume of completed reviews",
  invitationAcceptance: "Acceptance of review invitations",
  referralPublication: "Referral publication rate",
  latePenalty: "On-time delivery",
  recommendationAccuracy: "Recommendation accuracy",
  withdrawalPenalty: "Assignment reliability",
};

type FactorKey = keyof typeof FACTOR_LABELS;

type WeightSettings = Record<`${FactorKey}Weight`, number>;

const DEFAULT_WEIGHTS: WeightSettings = {
  reviewQualityWeight: 20,
  completionTimeWeight: 15,
  editorialRatingWeight: 15,
  completedReviewsWeight: 10,
  invitationAcceptanceWeight: 10,
  referralPublicationWeight: 10,
  latePenaltyWeight: 10,
  recommendationAccuracyWeight: 5,
  withdrawalPenaltyWeight: 5,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export type ScoreBreakdown = Record<
  FactorKey,
  { raw: number | null; normalizedScore: number; weight: number; contribution: number }
>;

export type CalculatedScore = {
  overallScore: number;
  grade: ReturnType<typeof gradeForScore>;
  trend: ScoreTrend;
  breakdown: ScoreBreakdown;
  strengths: string[];
  improvements: string[];
};

/**
 * Computes a reviewer's 0-100 performance score from the 9 configured
 * factors. Read-only — the caller (lib/scoring/record-score.ts) is
 * responsible for persisting the result as a new
 * ReviewerPerformanceSnapshot row.
 */
export async function calculateReviewerScore(
  ambassadorId: string,
): Promise<CalculatedScore> {
  const ambassador = await prisma.reviewerAmbassador.findUniqueOrThrow({
    where: { id: ambassadorId },
    select: { userId: true, journalId: true },
  });

  const reviewerId = ambassador.userId;

  const settings = await prisma.reviewerScoringSettings.findUnique({
    where: { journalId: ambassador.journalId },
  });

  const weights: WeightSettings = settings ?? DEFAULT_WEIGHTS;

  const assignments = await prisma.reviewAssignment.findMany({
    where: { reviewerId },
    select: {
      status: true,
      acceptedAt: true,
      dueDate: true,
      completedAt: true,
      editorialRating: true,
      editorialRatedAt: true,
      review: { select: { recommendation: true } },
      submission: {
        select: {
          decisions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { decision: true },
          },
        },
      },
    },
  });

  const submittedAssignments = assignments.filter((a) => a.status === "SUBMITTED");

  // 1. Review quality — lifetime average editorial rating (1-5) scaled to 0-100.
  const allRatings = assignments
    .map((a) => a.editorialRating)
    .filter((rating): rating is number => rating !== null);

  const reviewQualityRaw = average(allRatings);
  const reviewQualityScore =
    reviewQualityRaw === null ? NEUTRAL_SCORE : (reviewQualityRaw / 5) * 100;

  // 2. Average review completion time (acceptedAt -> completedAt), faster is better.
  const completionDurationsDays = submittedAssignments
    .filter((a) => a.acceptedAt && a.completedAt)
    .map(
      (a) =>
        (a.completedAt!.getTime() - a.acceptedAt!.getTime()) / (1000 * 60 * 60 * 24),
    );

  const avgCompletionDays = average(completionDurationsDays);
  const completionTimeScore =
    avgCompletionDays === null
      ? NEUTRAL_SCORE
      : clamp(
        100 - ((avgCompletionDays - TARGET_COMPLETION_DAYS) / TARGET_COMPLETION_DAYS) * 100,
        0,
        100,
      );

  // 3. Editorial rating — recency-weighted (last 5 rated reviews), distinct
  // from the lifetime "review quality" average above.
  const recentRatings = assignments
    .filter((a) => a.editorialRating !== null && a.editorialRatedAt)
    .sort((a, b) => b.editorialRatedAt!.getTime() - a.editorialRatedAt!.getTime())
    .slice(0, 5)
    .map((a) => a.editorialRating as number);

  const editorialRatingRaw = average(recentRatings);
  const editorialRatingScore =
    editorialRatingRaw === null ? NEUTRAL_SCORE : (editorialRatingRaw / 5) * 100;

  // 4. Number of completed reviews, normalized against a target volume.
  const completedReviewsRaw = submittedAssignments.length;
  const completedReviewsScore = clamp(
    (completedReviewsRaw / COMPLETED_REVIEWS_TARGET) * 100,
    0,
    100,
  );

  // 5. Acceptance of editorial invitations — of invitations responded to
  // (excludes still-pending INVITED), how many were accepted or completed.
  const respondedAssignments = assignments.filter((a) =>
    ["ACCEPTED", "DECLINED", "SUBMITTED"].includes(a.status),
  );

  const invitationAcceptanceRaw =
    respondedAssignments.length === 0
      ? null
      : (respondedAssignments.filter((a) => a.status !== "DECLINED").length /
        respondedAssignments.length) *
      100;

  const invitationAcceptanceScore = invitationAcceptanceRaw ?? NEUTRAL_SCORE;

  // 6. Referral publication rate — of this reviewer's referred submissions
  // that reached a final outcome, how many were published.
  const referredOutcomes = await prisma.submission.groupBy({
    by: ["status"],
    where: { referrerReviewerId: reviewerId, status: { in: ["PUBLISHED", "REJECTED"] } },
    _count: { _all: true },
  });

  const publishedCount =
    referredOutcomes.find((row) => row.status === "PUBLISHED")?._count._all ?? 0;
  const referredTotal = referredOutcomes.reduce((sum, row) => sum + row._count._all, 0);

  const referralPublicationRaw =
    referredTotal === 0 ? null : (publishedCount / referredTotal) * 100;
  const referralPublicationScore = referralPublicationRaw ?? NEUTRAL_SCORE;

  // 7. Late reviews (penalty) — of completed reviews with a due date, what
  // share were completed after it.
  const dueAssignments = submittedAssignments.filter((a) => a.dueDate && a.completedAt);
  const lateCount = dueAssignments.filter(
    (a) => a.completedAt!.getTime() > a.dueDate!.getTime(),
  ).length;

  const latePenaltyRaw =
    dueAssignments.length === 0 ? null : (lateCount / dueAssignments.length) * 100;
  const latePenaltyScore = latePenaltyRaw === null ? NEUTRAL_SCORE : 100 - latePenaltyRaw;

  // 8. Recommendation accuracy — how often the reviewer's recommendation
  // matched the submission's most recent editorial decision.
  const decidedAssignments = submittedAssignments.filter(
    (a) => a.review?.recommendation && a.submission.decisions[0],
  );

  const matchedCount = decidedAssignments.filter((a) => {
    const decision = a.submission.decisions[0]!.decision;
    const recommendation = a.review!.recommendation;

    if (decision === "ACCEPTED") return recommendation === "ACCEPT";
    if (decision === "REJECTED") return recommendation === "REJECT";
    if (decision === "REVISION_REQUIRED") {
      return recommendation === "MINOR_REVISION" || recommendation === "MAJOR_REVISION";
    }

    return false;
  }).length;

  const recommendationAccuracyRaw =
    decidedAssignments.length === 0
      ? null
      : (matchedCount / decidedAssignments.length) * 100;
  const recommendationAccuracyScore = recommendationAccuracyRaw ?? NEUTRAL_SCORE;

  // 9. Withdrawal rate (penalty) — of assignments the reviewer accepted,
  // how many were later cancelled (editor had to remove them).
  const acceptedOrBeyond = assignments.filter((a) =>
    ["ACCEPTED", "SUBMITTED", "CANCELLED"].includes(a.status),
  );
  const cancelledCount = acceptedOrBeyond.filter((a) => a.status === "CANCELLED").length;

  const withdrawalPenaltyRaw =
    acceptedOrBeyond.length === 0 ? null : (cancelledCount / acceptedOrBeyond.length) * 100;
  const withdrawalPenaltyScore =
    withdrawalPenaltyRaw === null ? NEUTRAL_SCORE : 100 - withdrawalPenaltyRaw;

  const factors: Record<FactorKey, { raw: number | null; normalizedScore: number }> = {
    reviewQuality: { raw: reviewQualityRaw, normalizedScore: reviewQualityScore },
    completionTime: { raw: avgCompletionDays, normalizedScore: completionTimeScore },
    editorialRating: { raw: editorialRatingRaw, normalizedScore: editorialRatingScore },
    completedReviews: { raw: completedReviewsRaw, normalizedScore: completedReviewsScore },
    invitationAcceptance: {
      raw: invitationAcceptanceRaw,
      normalizedScore: invitationAcceptanceScore,
    },
    referralPublication: {
      raw: referralPublicationRaw,
      normalizedScore: referralPublicationScore,
    },
    latePenalty: { raw: latePenaltyRaw, normalizedScore: latePenaltyScore },
    recommendationAccuracy: {
      raw: recommendationAccuracyRaw,
      normalizedScore: recommendationAccuracyScore,
    },
    withdrawalPenalty: { raw: withdrawalPenaltyRaw, normalizedScore: withdrawalPenaltyScore },
  };

  const breakdown = {} as ScoreBreakdown;
  let overallScore = 0;

  for (const key of Object.keys(FACTOR_LABELS) as FactorKey[]) {
    const weight = weights[`${key}Weight`];
    const contribution = (factors[key].normalizedScore * weight) / 100;

    breakdown[key] = {
      raw: factors[key].raw,
      normalizedScore: Math.round(factors[key].normalizedScore),
      weight,
      contribution,
    };

    overallScore += contribution;
  }

  overallScore = clamp(Math.round(overallScore), 0, 100);

  const previousSnapshot = await prisma.reviewerPerformanceSnapshot.findFirst({
    where: { ambassadorId },
    orderBy: { calculatedAt: "desc" },
    select: { overallScore: true },
  });

  const trend: ScoreTrend =
    previousSnapshot === null
      ? "STABLE"
      : overallScore > previousSnapshot.overallScore
        ? "UP"
        : overallScore < previousSnapshot.overallScore
          ? "DOWN"
          : "STABLE";

  const rankedFactors = (Object.keys(FACTOR_LABELS) as FactorKey[])
    .map((key) => ({ key, score: breakdown[key].normalizedScore }))
    .sort((a, b) => b.score - a.score);

  const strengths = rankedFactors
    .slice(0, 3)
    .filter((f) => f.score >= 70)
    .map((f) => FACTOR_LABELS[f.key]);

  const improvements = rankedFactors
    .slice(-3)
    .filter((f) => f.score < 70)
    .map((f) => FACTOR_LABELS[f.key]);

  return {
    overallScore,
    grade: gradeForScore(overallScore),
    trend,
    breakdown,
    strengths,
    improvements,
  };
}
