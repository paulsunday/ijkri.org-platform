import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAnyActionRoleMock,
  isSuperAdminMock,
  userFindUniqueMock,
  submissionFindUniqueMock,
  reviewAssignmentFindUniqueMock,
  reviewAssignmentCountMock,
  reviewerApplicationFindFirstMock,
  submissionAuthorFindManyMock,
  editorialDecisionCountMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAnyActionRoleMock: vi.fn(),
  isSuperAdminMock: vi.fn(() => true),
  userFindUniqueMock: vi.fn(),
  submissionFindUniqueMock: vi.fn(),
  reviewAssignmentFindUniqueMock: vi.fn(),
  reviewAssignmentCountMock: vi.fn(),
  reviewerApplicationFindFirstMock: vi.fn(),
  submissionAuthorFindManyMock: vi.fn(),
  editorialDecisionCountMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireAnyActionRole: requireAnyActionRoleMock,
  isSuperAdmin: isSuperAdminMock,
}));

vi.mock("@/lib/auth/role-groups", () => ({
  EDITORIAL_ROLES: ["SUPER_ADMIN", "ADMIN", "EDITOR_IN_CHIEF"],
}));

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/email/templates", () => ({
  reviewerInvitationEmail: vi.fn(() => ({
    subject: "s",
    html: "h",
    text: "t",
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/ambassador/referral-events", () => ({
  recordReferralEvent: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    submission: { findUnique: submissionFindUniqueMock },
    reviewAssignment: {
      findUnique: reviewAssignmentFindUniqueMock,
      count: reviewAssignmentCountMock,
    },
    reviewerApplication: { findFirst: reviewerApplicationFindFirstMock },
    submissionAuthor: { findMany: submissionAuthorFindManyMock },
    editorialDecision: { count: editorialDecisionCountMock },
    $transaction: transactionMock,
  },
}));

const { assignReviewer, reassignReviewer } = await import("./actions");

const REFERRING_REVIEWER_ID = "reviewer_who_referred";

function buildFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  isSuperAdminMock.mockReturnValue(true);

  requireAnyActionRoleMock.mockResolvedValue({
    id: "editor_1",
    isActive: true,
    roles: [{ role: "EDITOR_IN_CHIEF", journalId: "journal_1" }],
  });

  // Defaults for the COI engine's own lookups (Phase 2) — no conflicts found.
  reviewAssignmentCountMock.mockResolvedValue(0);
  reviewerApplicationFindFirstMock.mockResolvedValue(null);
  submissionAuthorFindManyMock.mockResolvedValue([]);
  editorialDecisionCountMock.mockResolvedValue(0);
});

describe("assignReviewer — conflict of interest", () => {
  it("rejects assigning the reviewer who referred the manuscript's author", async () => {
    submissionFindUniqueMock.mockResolvedValue({
      id: "submission_1",
      title: "A referred manuscript",
      journalId: "journal_1",
      status: "UNDER_INITIAL_REVIEW",
      currentReviewRound: 1,
      referrerReviewerId: REFERRING_REVIEWER_ID,
      journal: { id: "journal_1", name: "IJKRI", shortName: "IJKRI" },
      versions: [],
    });

    userFindUniqueMock.mockResolvedValue({
      id: REFERRING_REVIEWER_ID,
      name: "Referring Reviewer",
      email: "referrer@example.com",
      isActive: true,
      roles: [{ id: "role_1" }],
    });

    const formData = buildFormData({
      submissionId: "submission_1",
      reviewerId: REFERRING_REVIEWER_ID,
    });

    await expect(assignReviewer(formData)).rejects.toThrow(
      /referred this manuscript/i,
    );

    // Never even reaches the point of writing a ReviewAssignment.
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("allows assigning a reviewer who did not refer the manuscript", async () => {
    submissionFindUniqueMock.mockResolvedValue({
      id: "submission_1",
      title: "A referred manuscript",
      journalId: "journal_1",
      status: "UNDER_INITIAL_REVIEW",
      currentReviewRound: 1,
      referrerReviewerId: REFERRING_REVIEWER_ID,
      journal: { id: "journal_1", name: "IJKRI", shortName: "IJKRI" },
      versions: [],
      // Read by detectConflicts' own internal submission lookup.
      authorId: "author_1",
      author: {
        id: "author_1",
        name: "Some Author",
        email: "author@author-university.edu",
        affiliation: "Author University",
        orcid: null,
      },
    });

    userFindUniqueMock.mockResolvedValue({
      id: "unrelated_reviewer",
      name: "Unrelated Reviewer",
      email: "unrelated@reviewer-institute.edu",
      isActive: true,
      roles: [{ id: "role_1" }],
      // Read by detectConflicts' own internal reviewer lookup.
      affiliation: "Unrelated University",
      orcid: null,
    });

    reviewAssignmentFindUniqueMock.mockResolvedValue(null);

    transactionMock.mockImplementation(async (callback) =>
      callback({
        reviewAssignment: {
          create: vi.fn().mockResolvedValue({
            id: "assignment_1",
            submissionId: "submission_1",
            reviewerId: "unrelated_reviewer",
            reviewRound: 1,
            invitedAt: new Date(),
            dueDate: null,
            status: "INVITED",
          }),
        },
        submission: { update: vi.fn() },
        notification: { create: vi.fn() },
        activityLog: { create: vi.fn() },
        conflictOfInterestCheck: { create: vi.fn() },
      }),
    );

    const formData = buildFormData({
      submissionId: "submission_1",
      reviewerId: "unrelated_reviewer",
    });

    await expect(assignReviewer(formData)).resolves.toBeUndefined();
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});

describe("reassignReviewer — conflict of interest", () => {
  it("rejects reassigning to the reviewer who referred the manuscript's author", async () => {
    reviewAssignmentFindUniqueMock.mockResolvedValue({
      id: "assignment_1",
      status: "INVITED",
      reviewerId: "current_reviewer",
      reviewRound: 1,
      submissionId: "submission_1",
      submissionVersionId: null,
      dueDate: null,
      blindType: "DOUBLE_BLIND",
      reviewer: {
        id: "current_reviewer",
        name: "Current Reviewer",
        email: "current@example.com",
      },
      submission: {
        id: "submission_1",
        title: "A referred manuscript",
        journalId: "journal_1",
        referrerReviewerId: REFERRING_REVIEWER_ID,
        journal: { name: "IJKRI" },
      },
    });

    const formData = buildFormData({
      assignmentId: "assignment_1",
      newReviewerId: REFERRING_REVIEWER_ID,
    });

    await expect(reassignReviewer(formData)).rejects.toThrow(
      /referred this manuscript/i,
    );

    expect(transactionMock).not.toHaveBeenCalled();
  });
});
