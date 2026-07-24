"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  deleteJournalFile,
  uploadJournalFile,
} from "@/lib/storage/blob";
import type { UploadResult } from "@/lib/storage/types";

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
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);
  const assignmentId = String(
    formData.get("assignmentId") || "",
  ).trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  const assignment =
    await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        reviewerId: reviewer.id,
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
        userId: reviewer.id,
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
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);
  const assignmentId = String(
    formData.get("assignmentId") || "",
  ).trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  const assignment =
    await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        reviewerId: reviewer.id,
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
        userId: reviewer.id,
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
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);

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

  const attachmentEntries =
    formData.getAll("attachments");

  const attachmentFiles = attachmentEntries.filter(
    (entry): entry is File =>
      entry instanceof File &&
      entry.size > 0 &&
      entry.name.trim().length > 0,
  );

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  if (attachmentFiles.length > 5) {
    throw new Error(
      "You may upload a maximum of five review attachments.",
    );
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
  ] as const;

  type ReviewRecommendation =
    (typeof validRecommendations)[number];

  if (
    !validRecommendations.includes(
      recommendation as ReviewRecommendation,
    )
  ) {
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
    await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        reviewerId: reviewer.id,
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

  const uploadedAttachments: UploadResult[] = [];

  try {
    /*
     * Upload files before opening the Prisma transaction.
     *
     * External network operations should not be performed while a database
     * transaction remains open.
     */
    for (const file of attachmentFiles) {
      const upload = await uploadJournalFile({
        file,
        category: "REVIEW_ATTACHMENT",
        visibility: "private",
        metadata: {
          category: "REVIEW_ATTACHMENT",
          journalId: assignment.submission.journalId,
          submissionId: assignment.submissionId,
          assignmentId,
          reviewRound: assignment.reviewRound,
        },
      });

      uploadedAttachments.push(upload);
    }

    await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          assignmentId,
          score,
          recommendation:
            recommendation as ReviewRecommendation,
          commentsToAuthor,
          commentsToEditor:
            commentsToEditor || null,
          submittedAt: new Date(),
        },
      });

      if (uploadedAttachments.length > 0) {
        await tx.reviewAttachment.createMany({
          data: uploadedAttachments.map(
            (attachment) => ({
              reviewId: review.id,
              fileName:
                attachment.originalFilename,
              fileUrl: attachment.url,
              mimeType:
                attachment.mimeType || null,
              fileSize: attachment.size,
            }),
          ),
        });
      }

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
            title:
              `Review submitted — Round ${assignment.reviewRound}`,
            message:
              `A review report has been submitted for ` +
              `"${assignment.submission.title}".`,
            link:
              `/editor/submissions/` +
              `${assignment.submissionId}/decisions`,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: reviewer.id,
          action: "SUBMIT_REVIEW",
          entity: "ReviewAssignment",
          entityId: assignmentId,
          metadata: {
            submissionId:
              assignment.submissionId,
            reviewRound:
              assignment.reviewRound,
            submissionVersionId:
              assignment.submissionVersionId,
            recommendation,
            score,
            attachmentCount:
              uploadedAttachments.length,
            attachmentNames:
              uploadedAttachments.map(
                (attachment) =>
                  attachment.originalFilename,
              ),
          },
        },
      });
    });
  } catch (error) {
    /*
     * The Blob uploads may have succeeded before the database transaction
     * failed. Delete them so that orphaned private files are not retained.
     */
    if (uploadedAttachments.length > 0) {
      const cleanupResults =
        await Promise.allSettled(
          uploadedAttachments.map(
            (attachment) =>
              deleteJournalFile(
                attachment.url,
                "private",
              ),
          ),
        );

      cleanupResults.forEach(
        (result, index) => {
          if (result.status === "rejected") {
            logger.error(
              "Failed to clean up reviewer attachment",
              result.reason,
              {
                event: "REVIEW_ATTACHMENT_CLEANUP_FAILED",
                attachment:
                  uploadedAttachments[index]?.pathname,
                reviewAssignmentId: assignmentId,
                submissionId: assignment.submissionId,
              },
            );
          }
        },
      );
    }

    throw error;
  }

  refreshReviewPages(
    assignmentId,
    assignment.submissionId,
  );
}