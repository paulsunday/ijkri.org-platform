import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ambassadorFindUniqueOrThrow,
  scoringSettingsFindUnique,
  reviewAssignmentFindMany,
  submissionGroupBy,
  snapshotFindFirst,
} = vi.hoisted(() => ({
  ambassadorFindUniqueOrThrow: vi.fn(),
  scoringSettingsFindUnique: vi.fn(),
  reviewAssignmentFindMany: vi.fn(),
  submissionGroupBy: vi.fn(),
  snapshotFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewerAmbassador: { findUniqueOrThrow: ambassadorFindUniqueOrThrow },
    reviewerScoringSettings: { findUnique: scoringSettingsFindUnique },
    reviewAssignment: { findMany: reviewAssignmentFindMany },
    submission: { groupBy: submissionGroupBy },
    reviewerPerformanceSnapshot: { findFirst: snapshotFindFirst },
  },
}));

const { calculateReviewerScore } = await import("./calculate-score");

beforeEach(() => {
  vi.clearAllMocks();
  ambassadorFindUniqueOrThrow.mockResolvedValue({
    userId: "reviewer_1",
    journalId: "journal_1",
  });
  scoringSettingsFindUnique.mockResolvedValue(null); // use defaults
  reviewAssignmentFindMany.mockResolvedValue([]);
  submissionGroupBy.mockResolvedValue([]);
  snapshotFindFirst.mockResolvedValue(null);
});

describe("calculateReviewerScore", () => {
  it("scores below the neutral baseline when there is no data at all (0 completed reviews is a real, not missing, data point)", async () => {
    const result = await calculateReviewerScore("ambassador_1");

    // All 8 "no data yet" factors default to the neutral score (70), but
    // completedReviews is 0/20 = a real 0, not a missing-data neutral —
    // weighted average: (70*90 + 0*10) / 100 = 63.
    expect(result.overallScore).toBe(63);
    expect(result.grade).toBe("B");
    expect(result.trend).toBe("STABLE");
  });

  it("raises the score when editorial ratings are high", async () => {
    reviewAssignmentFindMany.mockResolvedValue([
      {
        status: "SUBMITTED",
        acceptedAt: null,
        dueDate: null,
        completedAt: null,
        editorialRating: 5,
        editorialRatedAt: new Date(),
        review: null,
        submission: { decisions: [] },
      },
    ]);

    const result = await calculateReviewerScore("ambassador_1");

    expect(result.breakdown.reviewQuality.normalizedScore).toBe(100);
    expect(result.breakdown.editorialRating.normalizedScore).toBe(100);
    expect(result.overallScore).toBeGreaterThan(70);
  });

  it("reports an UP trend when the score improved over the previous snapshot", async () => {
    snapshotFindFirst.mockResolvedValue({ overallScore: 50 });

    const result = await calculateReviewerScore("ambassador_1");

    expect(result.overallScore).toBe(63);
    expect(result.trend).toBe("UP");
  });

  it("reports a DOWN trend when the score dropped", async () => {
    snapshotFindFirst.mockResolvedValue({ overallScore: 90 });

    const result = await calculateReviewerScore("ambassador_1");

    expect(result.trend).toBe("DOWN");
  });

  it("penalizes a high late-review rate", async () => {
    const dueDate = new Date("2026-01-01T00:00:00Z");
    const completedLate = new Date("2026-01-10T00:00:00Z");

    reviewAssignmentFindMany.mockResolvedValue([
      {
        status: "SUBMITTED",
        acceptedAt: new Date("2025-12-20T00:00:00Z"),
        dueDate,
        completedAt: completedLate,
        editorialRating: null,
        editorialRatedAt: null,
        review: null,
        submission: { decisions: [] },
      },
    ]);

    const result = await calculateReviewerScore("ambassador_1");

    expect(result.breakdown.latePenalty.normalizedScore).toBe(0);
  });
});
