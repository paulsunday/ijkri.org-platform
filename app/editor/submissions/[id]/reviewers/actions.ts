"use server";

import { revalidatePath } from "next/cache";

import { isSuperAdmin, requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { sendEmail } from "@/lib/email/send-email";
import { reviewerInvitationEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

export async function assignReviewer(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const submissionId = String(formData.get("submissionId") || "").trim();

  const reviewerId = String(formData.get("reviewerId") || "").trim();

  const dueDateValue = String(formData.get("dueDate") || "").trim();

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
