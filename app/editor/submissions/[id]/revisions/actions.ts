"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

const REVIEW_PERIOD_DAYS = 14;

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

export async function sendRevisionToReviewers(
  formData: FormData,
) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const submissionId = String(
    formData.get("submissionId") || "",
  ).trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },

      reviewAssignments: {
        orderBy: [
          {
            reviewRound: "desc",
          },
          {
            createdAt: "asc",
          },
        ],
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
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

  if (
    submission.status === "ACCEPTED" ||
    submission.status === "REJECTED" ||
    submission.status === "PUBLISHED" ||
    submission.status === "WITHDRAWN"
  ) {
    throw new Error(
      `This submission cannot be sent for re-review because its current status is ${submission.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    );
  }

  const latestVersion = submission.versions[0];

  if (!latestVersion) {
    throw new Error(
      "No revised manuscript version was found. The author must upload a revision before it can be sent to reviewers.",
    );
  }

  const previousRound =
    submission.currentReviewRound || 1;

  const nextRound = previousRound + 1;

  const previousRoundAssignments =
    submission.reviewAssignments.filter(
      (assignment) =>
        assignment.reviewRound === previousRound,
    );

  if (previousRoundAssignments.length === 0) {
    throw new Error(
      `No reviewers were found for review round ${previousRound}. Assign reviewers before starting the next round.`,
    );
  }

  const activeReviewers =
    previousRoundAssignments.filter(
      (assignment) =>
        assignment.reviewer.isActive,
    );

  if (activeReviewers.length === 0) {
    throw new Error(
      "None of the previous reviewers currently has an active account.",
    );
  }

  const existingNextRoundAssignments =
    await prisma.reviewAssignment.count({
      where: {
        submissionId,
        reviewRound: nextRound,
      },
    });

  if (existingNextRoundAssignments > 0) {
    throw new Error(
      `Review round ${nextRound} has already been created for this submission.`,
    );
  }

  const invitedAt = new Date();
  const dueDate = new Date(invitedAt);

  dueDate.setDate(
    dueDate.getDate() + REVIEW_PERIOD_DAYS,
  );

  await prisma.$transaction(async (tx) => {
    for (const previousAssignment of activeReviewers) {
      const newAssignment =
        await tx.reviewAssignment.create({
          data: {
            submissionId,
            reviewerId:
              previousAssignment.reviewerId,
            submissionVersionId:
              latestVersion.id,
            reviewRound: nextRound,
            status: "INVITED",
            invitedAt,
            dueDate,
            blindType:
              previousAssignment.blindType ||
              "DOUBLE_BLIND",
          },
        });

      await tx.notification.create({
        data: {
          userId:
            previousAssignment.reviewerId,
          type: "REVIEW",
          title: `Re-review invitation — Round ${nextRound}`,
          message:
            `A revised version of "${submission.title}" ` +
            `has been submitted. You are invited to review ` +
            `Version ${latestVersion.versionNumber} in review round ${nextRound}.`,
          link: `/reviewer/reviews/${newAssignment.id}`,
        },
      });
    }

    await tx.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        currentReviewRound: nextRound,
        status: "UNDER_PEER_REVIEW",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "ASSIGN_REVIEWER",
        entity: "Submission",
        entityId: submissionId,
        metadata: {
          event: "SEND_REVISION_TO_REVIEWERS",
          previousRound,
          newRound: nextRound,
          versionId: latestVersion.id,
          versionNumber:
            latestVersion.versionNumber,
          reviewerCount:
            activeReviewers.length,
          reviewerIds: activeReviewers.map(
            (assignment) =>
              assignment.reviewerId,
          ),
          dueDate: dueDate.toISOString(),
        },
      },
    });
  });

  revalidatePath(
    `/editor/submissions/${submissionId}`,
  );

  revalidatePath(
    `/editor/submissions/${submissionId}/revisions`,
  );

  revalidatePath(
    `/editor/submissions/${submissionId}/reviewers`,
  );

  revalidatePath("/editor/dashboard");
  revalidatePath("/reviewer/dashboard");

  redirect(
    `/editor/submissions/${submissionId}/reviewers`,
  );
}