"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function refreshReviewPages(
  assignmentId: string,
  submissionId?: string,
) {
  revalidatePath(`/reviewer/reviews/${assignmentId}`);
  revalidatePath("/reviewer/dashboard");

  if (submissionId) {
    revalidatePath(`/editor/submissions/${submissionId}`);
    revalidatePath(
      `/editor/submissions/${submissionId}/reviewers`,
    );
    revalidatePath(
      `/editor/submissions/${submissionId}/revisions`,
    );
    revalidatePath("/editor/dashboard");
  }
}

export async function acceptReview(formData: FormData) {
  const assignmentId = String(
    formData.get("assignmentId") || "",
  ).trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  const assignment =
    await prisma.reviewAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        submission: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

  if (!assignment) {
    throw new Error("Review assignment not found.");
  }

  if (assignment.status !== "INVITED") {
    throw new Error(
      `This invitation cannot be accepted because its current status is ${assignment.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: assignment.reviewerId,
        action: "UPDATE",
        entity: "ReviewAssignment",
        entityId: assignmentId,
        metadata: {
          event: "REVIEW_INVITATION_ACCEPTED",
          submissionId: assignment.submissionId,
          reviewRound: assignment.reviewRound,
        },
      },
    });
  });

  refreshReviewPages(
    assignmentId,
    assignment.submissionId,
  );
}

export async function declineReview(formData: FormData) {
  const assignmentId = String(
    formData.get("assignmentId") || "",
  ).trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  const assignment =
    await prisma.reviewAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        submission: {
          include: {
            decisions: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                editorId: true,
              },
            },
          },
        },
      },
    });

  if (!assignment) {
    throw new Error("Review assignment not found.");
  }

  if (assignment.status !== "INVITED") {
    throw new Error(
      `This invitation cannot be declined because its current status is ${assignment.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    );
  }

  const editorId =
    assignment.submission.decisions[0]?.editorId;

  await prisma.$transaction(async (tx) => {
    await tx.reviewAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        status: "DECLINED",
        completedAt: new Date(),
      },
    });

    if (editorId) {
      await tx.notification.create({
        data: {
          userId: editorId,
          type: "REVIEW",
          title: "Reviewer declined invitation",
          message:
            `A reviewer declined the invitation for ` +
            `"${assignment.submission.title}" in review round ` +
            `${assignment.reviewRound}.`,
          link: `/editor/submissions/${assignment.submissionId}/reviewers`,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: assignment.reviewerId,
        action: "UPDATE",
        entity: "ReviewAssignment",
        entityId: assignmentId,
        metadata: {
          event: "REVIEW_INVITATION_DECLINED",
          submissionId: assignment.submissionId,
          reviewRound: assignment.reviewRound,
        },
      },
    });
  });

  refreshReviewPages(
    assignmentId,
    assignment.submissionId,
  );
}

export async function submitReview(formData: FormData) {
  const assignmentId = String(
    formData.get("assignmentId") || "",
  ).trim();

  const scoreValue = String(
    formData.get("score") || "",
  ).trim();

  const recommendation = String(
    formData.get("recommendation") || "",
  ).trim();

  const commentsToAuthor = String(
    formData.get("commentsToAuthor") || "",
  ).trim();

  const commentsToEditor = String(
    formData.get("commentsToEditor") || "",
  ).trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  const score = Number(scoreValue);

  if (
    !Number.isInteger(score) ||
    score < 1 ||
    score > 10
  ) {
    throw new Error(
      "Overall score must be a whole number between 1 and 10.",
    );
  }

  const validRecommendations = [
    "ACCEPT",
    "MINOR_REVISION",
    "MAJOR_REVISION",
    "REJECT",
  ];

  if (!validRecommendations.includes(recommendation)) {
    throw new Error(
      "Please select a valid recommendation.",
    );
  }

  if (!commentsToAuthor) {
    throw new Error(
      "Please enter comments to the author.",
    );
  }

  const assignment =
    await prisma.reviewAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        submission: {
          include: {
            decisions: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                editorId: true,
              },
            },
          },
        },
        review: true,
      },
    });

  if (!assignment) {
    throw new Error("Review assignment not found.");
  }

  if (assignment.status !== "ACCEPTED") {
    throw new Error(
      "You must accept the review invitation before submitting a report.",
    );
  }

  if (assignment.review) {
    throw new Error(
      "A review report has already been submitted for this assignment.",
    );
  }

  const editorId =
    assignment.submission.decisions[0]?.editorId;

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        assignmentId,
        score,
        recommendation:
          recommendation as
            | "ACCEPT"
            | "MINOR_REVISION"
            | "MAJOR_REVISION"
            | "REJECT",
        commentsToAuthor,
        commentsToEditor:
          commentsToEditor || null,
        submittedAt: new Date(),
      },
    });

    await tx.reviewAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        status: "SUBMITTED",
        completedAt: new Date(),
      },
    });

    if (editorId) {
      await tx.notification.create({
        data: {
          userId: editorId,
          type: "REVIEW",
          title: `Review submitted — Round ${assignment.reviewRound}`,
          message:
            `A review report has been submitted for ` +
            `"${assignment.submission.title}".`,
          link: `/editor/submissions/${assignment.submissionId}/decisions`,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: assignment.reviewerId,
        action: "SUBMIT_REVIEW",
        entity: "ReviewAssignment",
        entityId: assignmentId,
        metadata: {
          submissionId: assignment.submissionId,
          reviewRound: assignment.reviewRound,
          submissionVersionId:
            assignment.submissionVersionId,
          recommendation,
          score,
        },
      },
    });
  });

  refreshReviewPages(
    assignmentId,
    assignment.submissionId,
  );
}