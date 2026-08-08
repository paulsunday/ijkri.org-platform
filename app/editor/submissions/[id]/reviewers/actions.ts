"use server";

import { revalidatePath } from "next/cache";

import { isSuperAdmin, requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { sendEmail } from "@/lib/email/send-email";
import { reviewerInvitationEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordReferralEvent } from "@/lib/ambassador/referral-events";
import { detectConflicts, type ConflictFinding } from "@/lib/coi/detect";
import type { Prisma } from "@/lib/generated/prisma";

/**
 * Runs the advanced COI engine and persists every finding as an audit
 * row (spec: "Log every COI decision" — not just conflicts that block).
 * Throws if any HIGH finding is present. For MEDIUM/LOW findings, the
 * caller must have already collected the editor's acknowledgement
 * (defense in depth mirrors the Phase 1 referral-conflict guard).
 *
 * Super admins are exempt from the block (bypassBlock: true): findings
 * are still detected and persisted for audit purposes, but they never
 * prevent the assignment — a super admin is trusted to make that call.
 */
async function enforceConflictOfInterest(
  tx: Prisma.TransactionClient,
  input: {
    submissionId: string;
    reviewerId: string;
    acknowledgedConflicts: boolean;
    bypassBlock?: boolean;
  },
): Promise<void> {
  const report = await detectConflicts({
    submissionId: input.submissionId,
    reviewerId: input.reviewerId,
  });

  const persistFinding = (finding: ConflictFinding) =>
    tx.conflictOfInterestCheck.create({
      data: {
        submissionId: input.submissionId,
        reviewerId: input.reviewerId,
        conflictType: finding.conflictType,
        severity: finding.severity,
        reason: finding.reason,
        recommendation: finding.recommendation,
        blocked: finding.severity === "HIGH" && !input.bypassBlock,
      },
    });

  await Promise.all(report.findings.map(persistFinding));

  if (input.bypassBlock) {
    return;
  }

  if (report.highestSeverity === "HIGH") {
    throw new Error(
      "This reviewer cannot be assigned due to a high-severity conflict of interest.",
    );
  }

  if (report.findings.length > 0 && !input.acknowledgedConflicts) {
    throw new Error(
      "Please acknowledge the flagged conflict(s) of interest before assigning this reviewer.",
    );
  }
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

async function verifyEditorialPermission(
  editor: {
    id: string;
    roles: {
      role: import("@/lib/generated/prisma").UserRole;
    }[];
  },
  journalId: string,
) {
  if (isSuperAdmin(editor)) {
    return;
  }

  const editorJournalRole = await prisma.userJournalRole.findFirst({
    where: {
      userId: editor.id,
      journalId,
      role: {
        in: EDITORIAL_ROLES,
      },
    },
    select: {
      id: true,
    },
  });

  if (!editorJournalRole) {
    throw new Error(
      "You do not have permission to assign reviewers for this journal.",
    );
  }
}

const REASSIGNABLE_STATUSES = [
  "INVITED",
  "ACCEPTED",
  "DECLINED",
] as const;

export async function removeReviewerAssignment(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const assignmentId = String(formData.get("assignmentId") || "").trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  const assignment = await prisma.reviewAssignment.findUnique({
    where: {
      id: assignmentId,
    },

    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      submission: {
        select: {
          id: true,
          title: true,
          journalId: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new Error("Review assignment not found.");
  }

  await verifyEditorialPermission(editor, assignment.submission.journalId);

  if (
    !REASSIGNABLE_STATUSES.includes(
      assignment.status as (typeof REASSIGNABLE_STATUSES)[number],
    )
  ) {
    throw new Error(
      "Only an invited, accepted, or declined review assignment can be removed.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.reviewAssignment.updateMany({
      where: {
        id: assignmentId,
        status: {
          in: [...REASSIGNABLE_STATUSES],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (result.count !== 1) {
      throw new Error(
        "This review assignment has already changed status. Refresh and try again.",
      );
    }

    await tx.notification.create({
      data: {
        userId: assignment.reviewer.id,
        type: "REVIEW",
        title: "Review assignment removed",
        message: `Your assignment to review "${assignment.submission.title}" (round ${assignment.reviewRound}) has been removed by the editor.`,
        link: "/reviewer/dashboard",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "UPDATE",
        entity: "ReviewAssignment",
        entityId: assignment.id,

        metadata: {
          event: "REVIEW_ASSIGNMENT_REMOVED",
          submissionId: assignment.submission.id,
          reviewerId: assignment.reviewer.id,
          reviewerEmail: assignment.reviewer.email,
          reviewRound: assignment.reviewRound,
          previousStatus: assignment.status,
        },
      },
    });
  });

  revalidatePath(`/editor/submissions/${assignment.submission.id}/reviewers`);

  revalidatePath(
    `/editor/submissions/${assignment.submission.id}/review-rounds`,
  );

  revalidatePath(`/editor/submissions/${assignment.submission.id}`);

  revalidatePath("/editor/dashboard");

  revalidatePath("/reviewer/dashboard");

  revalidatePath(`/reviewer/reviews/${assignment.id}`);

  revalidatePath("/admin/reviews");

  revalidatePath("/admin/submissions");
}

export async function reassignReviewer(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const assignmentId = String(formData.get("assignmentId") || "").trim();

  const newReviewerId = String(formData.get("newReviewerId") || "").trim();

  const acknowledgedConflicts =
    String(formData.get("acknowledgedConflicts") || "") === "true";

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  if (!newReviewerId) {
    throw new Error("Select a reviewer to reassign this review to.");
  }

  const assignment = await prisma.reviewAssignment.findUnique({
    where: {
      id: assignmentId,
    },

    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      submission: {
        select: {
          id: true,
          title: true,
          journalId: true,
          referrerReviewerId: true,

          journal: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    throw new Error("Review assignment not found.");
  }

  await verifyEditorialPermission(editor, assignment.submission.journalId);

  const bypassConflicts = isSuperAdmin(editor);

  if (
    !REASSIGNABLE_STATUSES.includes(
      assignment.status as (typeof REASSIGNABLE_STATUSES)[number],
    )
  ) {
    throw new Error(
      "Only an invited, accepted, or declined review assignment can be reassigned.",
    );
  }

  if (newReviewerId === assignment.reviewerId) {
    throw new Error(
      "Select a different reviewer to reassign this review to.",
    );
  }

  if (
    newReviewerId === assignment.submission.referrerReviewerId &&
    !bypassConflicts
  ) {
    throw new Error(
      "This reviewer referred this manuscript's author and cannot be assigned to review it.",
    );
  }

  const newReviewer = await prisma.user.findUnique({
    where: {
      id: newReviewerId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,

      roles: {
        where: {
          journalId: assignment.submission.journalId,
          role: "REVIEWER",
        },

        select: {
          id: true,
        },
      },
    },
  });

  if (!newReviewer) {
    throw new Error("Reviewer account not found.");
  }

  if (!newReviewer.isActive) {
    throw new Error(
      "This reviewer account is inactive and cannot receive assignments.",
    );
  }

  if (newReviewer.roles.length === 0) {
    throw new Error(
      "The selected user does not have the REVIEWER role for this journal.",
    );
  }

  const existingAssignment = await prisma.reviewAssignment.findUnique({
    where: {
      submissionId_reviewerId_reviewRound: {
        submissionId: assignment.submissionId,
        reviewerId: newReviewerId,
        reviewRound: assignment.reviewRound,
      },
    },

    select: {
      id: true,
    },
  });

  if (existingAssignment) {
    throw new Error(
      "This reviewer is already assigned to this review round.",
    );
  }

  const newAssignment = await prisma.$transaction(async (tx) => {
    await enforceConflictOfInterest(tx, {
      submissionId: assignment.submissionId,
      reviewerId: newReviewerId,
      acknowledgedConflicts,
      bypassBlock: bypassConflicts,
    });

    const cancelResult = await tx.reviewAssignment.updateMany({
      where: {
        id: assignmentId,
        status: {
          in: [...REASSIGNABLE_STATUSES],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (cancelResult.count !== 1) {
      throw new Error(
        "This review assignment has already changed status. Refresh and try again.",
      );
    }

    const createdAssignment = await tx.reviewAssignment.create({
      data: {
        submissionId: assignment.submissionId,
        reviewerId: newReviewerId,
        submissionVersionId: assignment.submissionVersionId,
        reviewRound: assignment.reviewRound,
        status: "INVITED",
        invitedAt: new Date(),
        dueDate: assignment.dueDate,
        blindType: assignment.blindType,
      },

      select: {
        id: true,
        dueDate: true,
      },
    });

    await tx.notification.create({
      data: {
        userId: assignment.reviewer.id,
        type: "REVIEW",
        title: "Review assignment removed",
        message: `Your assignment to review "${assignment.submission.title}" (round ${assignment.reviewRound}) has been reassigned to another reviewer.`,
        link: "/reviewer/dashboard",
      },
    });

    await tx.notification.create({
      data: {
        userId: newReviewerId,
        type: "REVIEW",
        title: "New Review Invitation",
        message: `You have been invited to review "${assignment.submission.title}" for review round ${assignment.reviewRound}.`,
        link: `/reviewer/reviews/${createdAssignment.id}`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "UPDATE",
        entity: "ReviewAssignment",
        entityId: createdAssignment.id,

        metadata: {
          event: "REVIEWER_REASSIGNED",
          submissionId: assignment.submissionId,
          previousReviewerId: assignment.reviewer.id,
          previousReviewerEmail: assignment.reviewer.email,
          newReviewerId,
          newReviewerEmail: newReviewer.email,
          reviewRound: assignment.reviewRound,
        },
      },
    });

    return createdAssignment;
  });

  const appUrl = getAppUrl();

  const invitationUrl = `${appUrl}/reviewer/reviews/${newAssignment.id}`;

  const emailContent = reviewerInvitationEmail({
    reviewerName: newReviewer.name,
    journalName: assignment.submission.journal.name,
    manuscriptTitle: assignment.submission.title,
    reviewRound: assignment.reviewRound,
    dueDate: newAssignment.dueDate,
    invitationUrl,
  });

  try {
    await sendEmail({
      to: newReviewer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (error) {
    logger.error("Reviewer invitation email failed", error, {
      event: "REVIEWER_INVITATION_EMAIL_FAILED",
      assignmentId: newAssignment.id,
      submissionId: assignment.submissionId,
      reviewerId: newReviewerId,
      reviewerEmail: newReviewer.email,
    });
  }

  revalidatePath(`/editor/submissions/${assignment.submissionId}/reviewers`);

  revalidatePath(
    `/editor/submissions/${assignment.submissionId}/review-rounds`,
  );

  revalidatePath(`/editor/submissions/${assignment.submissionId}`);

  revalidatePath("/editor/dashboard");

  revalidatePath("/reviewer/dashboard");

  revalidatePath(`/reviewer/reviews/${assignment.id}`);

  revalidatePath(`/reviewer/reviews/${newAssignment.id}`);

  revalidatePath("/admin/reviews");

  revalidatePath("/admin/submissions");
}

export async function assignReviewer(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const submissionId = String(formData.get("submissionId") || "").trim();

  const reviewerId = String(formData.get("reviewerId") || "").trim();

  const dueDateValue = String(formData.get("dueDate") || "").trim();

  const acknowledgedConflicts =
    String(formData.get("acknowledgedConflicts") || "") === "true";

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  if (!reviewerId) {
    throw new Error("Reviewer ID is missing.");
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },

    select: {
      id: true,
      title: true,
      journalId: true,
      status: true,
      currentReviewRound: true,
      referrerReviewerId: true,

      journal: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },

      versions: {
        orderBy: {
          versionNumber: "desc",
        },

        take: 1,

        select: {
          id: true,
          versionNumber: true,
        },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  await verifyEditorialPermission(editor, submission.journalId);

  const bypassConflicts = isSuperAdmin(editor);

  const blockedStatuses = [
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ] as const;

  if (
    blockedStatuses.includes(
      submission.status as (typeof blockedStatuses)[number],
    )
  ) {
    throw new Error(
      `Reviewers cannot be assigned because this submission is currently ${submission.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    );
  }

  const reviewer = await prisma.user.findUnique({
    where: {
      id: reviewerId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,

      roles: {
        where: {
          journalId: submission.journalId,
          role: "REVIEWER",
        },

        select: {
          id: true,
        },
      },
    },
  });

  if (!reviewer) {
    throw new Error("Reviewer account not found.");
  }

  if (!reviewer.isActive) {
    throw new Error(
      "This reviewer account is inactive and cannot receive assignments.",
    );
  }

  if (reviewer.roles.length === 0) {
    throw new Error(
      "The selected user does not have the REVIEWER role for this journal.",
    );
  }

  if (reviewerId === submission.referrerReviewerId && !bypassConflicts) {
    throw new Error(
      "This reviewer referred this manuscript's author and cannot be assigned to review it.",
    );
  }

  const reviewRound = submission.currentReviewRound || 1;

  const submissionVersionId = submission.versions[0]?.id || null;

  let dueDate: Date | null = null;

  if (dueDateValue) {
    dueDate = new Date(`${dueDateValue}T23:59:59`);

    if (Number.isNaN(dueDate.getTime())) {
      throw new Error("The review due date is invalid.");
    }

    if (dueDate <= new Date()) {
      throw new Error("The review due date must be in the future.");
    }
  }

  const existingAssignment = await prisma.reviewAssignment.findUnique({
    where: {
      submissionId_reviewerId_reviewRound: {
        submissionId,
        reviewerId,
        reviewRound,
      },
    },

    select: {
      id: true,
      status: true,
    },
  });

  if (existingAssignment) {
    throw new Error(
      `This reviewer is already assigned to review round ${reviewRound}.`,
    );
  }

  const assignment = await prisma.$transaction(async (tx) => {
    await enforceConflictOfInterest(tx, {
      submissionId,
      reviewerId,
      acknowledgedConflicts,
      bypassBlock: bypassConflicts,
    });

    const createdAssignment = await tx.reviewAssignment.create({
      data: {
        submissionId,
        reviewerId,
        submissionVersionId,
        reviewRound,
        status: "INVITED",
        invitedAt: new Date(),
        dueDate,
        blindType: "DOUBLE_BLIND",
      },

      select: {
        id: true,
        submissionId: true,
        reviewerId: true,
        reviewRound: true,
        invitedAt: true,
        dueDate: true,
        status: true,
      },
    });

    await tx.submission.update({
      where: {
        id: submissionId,
      },

      data: {
        status: "UNDER_PEER_REVIEW",
      },
    });

    if (
      submission.referrerReviewerId &&
      submission.status !== "UNDER_PEER_REVIEW"
    ) {
      await recordReferralEvent(tx, {
        reviewerId: submission.referrerReviewerId,
        submissionId,
        stage: "PEER_REVIEW",
      });
    }

    await tx.notification.create({
      data: {
        userId: reviewerId,
        type: "REVIEW",
        title: "New Review Invitation",
        message: `You have been invited to review "${submission.title}" for review round ${reviewRound}.`,
        link: `/reviewer/reviews/${createdAssignment.id}`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "ASSIGN_REVIEWER",
        entity: "ReviewAssignment",
        entityId: createdAssignment.id,

        metadata: {
          event: "REVIEWER_INVITED",
          submissionId,
          submissionTitle: submission.title,
          journalId: submission.journalId,
          journalName: submission.journal.name,
          reviewerId,
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
          reviewRound,
          submissionVersionId,
          dueDate: dueDate?.toISOString() || null,
        },
      },
    });

    return createdAssignment;
  });

  const appUrl = getAppUrl();

  const invitationUrl = `${appUrl}/reviewer/reviews/${assignment.id}`;

  const emailContent = reviewerInvitationEmail({
    reviewerName: reviewer.name,
    journalName: submission.journal.name,
    manuscriptTitle: submission.title,
    reviewRound,
    dueDate,
    invitationUrl,
  });

  try {
    await sendEmail({
      to: reviewer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (error) {
    logger.error("Reviewer invitation email failed", error, {
      event: "REVIEWER_INVITATION_EMAIL_FAILED",
      assignmentId: assignment.id,
      submissionId: submission.id,
      reviewerId: reviewer.id,
      reviewerEmail: reviewer.email,
    });
  }
  revalidatePath(`/editor/submissions/${submissionId}/reviewers`);

  revalidatePath(`/editor/submissions/${submissionId}`);

  revalidatePath(`/editor/submissions/${submissionId}/revisions`);

  revalidatePath("/editor/dashboard");

  revalidatePath("/reviewer/dashboard");

  revalidatePath(`/reviewer/reviews/${assignment.id}`);

  revalidatePath("/admin/submissions");
}
