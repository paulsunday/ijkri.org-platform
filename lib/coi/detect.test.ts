import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  submissionFindUnique,
  userFindUnique,
  reviewerApplicationFindFirst,
  submissionAuthorFindMany,
  reviewAssignmentCount,
  editorialDecisionCount,
} = vi.hoisted(() => ({
  submissionFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  reviewerApplicationFindFirst: vi.fn(),
  submissionAuthorFindMany: vi.fn(),
  reviewAssignmentCount: vi.fn(),
  editorialDecisionCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submission: { findUnique: submissionFindUnique },
    user: { findUnique: userFindUnique },
    reviewerApplication: { findFirst: reviewerApplicationFindFirst },
    submissionAuthor: { findMany: submissionAuthorFindMany },
    reviewAssignment: { count: reviewAssignmentCount },
    editorialDecision: { count: editorialDecisionCount },
  },
}));

const { detectConflicts } = await import("./detect");

const baseSubmission = {
  id: "submission_1",
  authorId: "author_1",
  referrerReviewerId: null,
  author: {
    id: "author_1",
    name: "Author Person",
    email: "author@university.edu",
    affiliation: "State University",
    orcid: null,
  },
};

const baseReviewer = {
  id: "reviewer_1",
  name: "Reviewer Person",
  email: "reviewer@othermail.edu",
  affiliation: "Other University",
  orcid: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  submissionFindUnique.mockResolvedValue(baseSubmission);
  userFindUnique.mockResolvedValue(baseReviewer);
  reviewerApplicationFindFirst.mockResolvedValue(null);
  submissionAuthorFindMany.mockResolvedValue([]);
  reviewAssignmentCount.mockResolvedValue(0);
  editorialDecisionCount.mockResolvedValue(0);
});

describe("detectConflicts", () => {
  it("returns no findings when nothing overlaps", async () => {
    const report = await detectConflicts({
      submissionId: "submission_1",
      reviewerId: "reviewer_1",
    });

    expect(report.highestSeverity).toBeNull();
    expect(report.findings).toHaveLength(0);
  });

  it("flags REFERRAL_CONFLICT as HIGH when the reviewer referred the author", async () => {
    submissionFindUnique.mockResolvedValue({
      ...baseSubmission,
      referrerReviewerId: "reviewer_1",
    });

    const report = await detectConflicts({
      submissionId: "submission_1",
      reviewerId: "reviewer_1",
    });

    expect(report.highestSeverity).toBe("HIGH");
    expect(report.findings.map((f) => f.conflictType)).toContain("REFERRAL_CONFLICT");
  });

  it("flags SAME_INSTITUTION as HIGH on exact affiliation match", async () => {
    userFindUnique.mockResolvedValue({ ...baseReviewer, affiliation: "State University" });

    const report = await detectConflicts({
      submissionId: "submission_1",
      reviewerId: "reviewer_1",
    });

    expect(report.highestSeverity).toBe("HIGH");
    expect(report.findings.map((f) => f.conflictType)).toContain("SAME_INSTITUTION");
  });

  it("flags SAME_EMAIL_DOMAIN as LOW for a shared non-free domain", async () => {
    userFindUnique.mockResolvedValue({
      ...baseReviewer,
      email: "reviewer@university.edu",
    });

    const report = await detectConflicts({
      submissionId: "submission_1",
      reviewerId: "reviewer_1",
    });

    const finding = report.findings.find((f) => f.conflictType === "SAME_EMAIL_DOMAIN");
    expect(finding?.severity).toBe("LOW");
  });

  it("does not flag a shared free-mail domain (e.g. gmail.com)", async () => {
    submissionFindUnique.mockResolvedValue({
      ...baseSubmission,
      author: { ...baseSubmission.author, email: "author@gmail.com" },
    });

    userFindUnique.mockResolvedValue({ ...baseReviewer, email: "reviewer@gmail.com" });

    const report = await detectConflicts({
      submissionId: "submission_1",
      reviewerId: "reviewer_1",
    });

    expect(report.findings.map((f) => f.conflictType)).not.toContain("SAME_EMAIL_DOMAIN");
  });

  it("flags SAME_ORCID_COLLABORATION as HIGH over PREVIOUS_COAUTHOR when both would match", async () => {
    userFindUnique.mockResolvedValue({ ...baseReviewer, orcid: "0000-0001-2345-6789" });

    submissionAuthorFindMany.mockResolvedValue([
      { fullName: "Reviewer Person", orcid: "0000-0001-2345-6789" },
    ]);

    const report = await detectConflicts({
      submissionId: "submission_1",
      reviewerId: "reviewer_1",
    });

    const types = report.findings.map((f) => f.conflictType);
    expect(types).toContain("SAME_ORCID_COLLABORATION");
    expect(types).not.toContain("PREVIOUS_COAUTHOR");
  });

  it("flags PREVIOUS_REVIEWER_OF_AUTHOR as MEDIUM when history exists", async () => {
    reviewAssignmentCount.mockResolvedValue(2);

    const report = await detectConflicts({
      submissionId: "submission_1",
      reviewerId: "reviewer_1",
    });

    const finding = report.findings.find(
      (f) => f.conflictType === "PREVIOUS_REVIEWER_OF_AUTHOR",
    );
    expect(finding?.severity).toBe("MEDIUM");
    expect(report.highestSeverity).toBe("MEDIUM");
  });

  it("returns no findings and does not throw when the submission is missing", async () => {
    submissionFindUnique.mockResolvedValue(null);

    const report = await detectConflicts({
      submissionId: "missing",
      reviewerId: "reviewer_1",
    });

    expect(report).toEqual({ highestSeverity: null, findings: [] });
  });
});
