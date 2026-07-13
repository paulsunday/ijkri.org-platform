"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

async function verifyEditorialPermission(
  userId: string,
  journalId: string,
) {
  const role = await prisma.userJournalRole.findFirst({
    where: {
      userId,
      journalId,
      role: {
        in: EDITORIAL_ROLES,
      },
    },
    select: {
      id: true,
    },
  });

  if (!role) {
    throw new Error(
      "You do not have editorial permission for this journal.",
    );
  }
}

export async function assignReviewer(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const submissionId = String(
    formData.get("submissionId") || "",
  ).trim();

  const reviewerId = String(
    formData.get("reviewerId") || "",
  ).trim();

  const dueDateValue = String(
    formData.get("dueDate") || "",
  ).trim();

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

  await verifyEditorialPermission(
    editor.id,
    submission.journalId,
  );

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

  const submissionVersionId =
    submission.versions[0]?.id || null;

  let dueDate: Date | null = null;

  if (dueDateValue) {
    dueDate = new Date(
      `${dueDateValue}T23:59:59`,
    );

    if (Number.isNaN(dueDate.getTime())) {
      throw new Error(
        "The review due date is invalid.",
      );
    }

    if (dueDate <= new Date()) {
      throw new Error(
        "The review due date must be in the future.",
      );
    }
  }

  const existingAssignment =
    await prisma.reviewAssignment.findUnique({
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

  await prisma.$transaction(async (tx) => {
    const assignment =
      await tx.reviewAssignment.create({
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
        title: "New review invitation",
        message: `You have been invited to review "${submission.title}" for review round ${reviewRound}.`,
        link: `/reviewer/reviews/${assignment.id}`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "ASSIGN_REVIEWER",
        entity: "ReviewAssignment",
        entityId: assignment.id,
        metadata: {
          submissionId,
          reviewerId,
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
          reviewRound,
          submissionVersionId,
          dueDate: dueDate?.toISOString() || null,
        },
      },
    });
  });

  revalidatePath(
    `/editor/submissions/${submissionId}/reviewers`,
  );
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath(
    `/editor/submissions/${submissionId}/revisions`,
  );
  revalidatePath("/editor/dashboard");
  revalidatePath("/reviewer/dashboard");
  revalidatePath("/admin/submissions");
}