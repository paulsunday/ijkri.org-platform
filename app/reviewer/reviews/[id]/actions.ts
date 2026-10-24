"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { validateFileSignature } from "@/lib/storage/file-signature";
import { deleteJournalFile, uploadJournalFile } from "@/lib/storage/blob";
import type { UploadResult } from "@/lib/storage/types";
import { creditWallet } from "@/lib/ambassador/wallet";
import { getRewardSettings } from "@/lib/ambassador/reward-settings";
import { sendEmail } from "@/lib/email/send-email";
import { rewardEarnedEmail } from "@/lib/email/templates";
import { resolveActiveCampaignBonus } from "@/lib/campaigns/resolve-active-campaign";
import { applyCampaignBonus } from "@/lib/campaigns/apply-campaign-bonus";
import { notifyStaffActionNeeded } from "@/lib/notifications/notify-staff";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const MAX_REVIEW_COMMENT_LENGTH = 25_000;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

export type ReviewActionState = {
  success: boolean;
  message: string;
};

const REVIEW_ALREADY_SUBMITTED_MESSAGE =
  "This review has already been submitted or is no longer available.";

/**
 * An `<input type="file" multiple>` control that has no files selected
 * still produces one FormData entry for the "attachments" field. That
 * placeholder is a zero-byte File. Depending on the browser/runtime it
 * shows up with an empty name, with the literal generic name "blob" —
 * per the Fetch spec's multipart/form-data encoding algorithm, which
 * names a bare Blob "blob" when it has no File.name — or, observed on
 * Next.js's server-action multipart parser in production, with the
 * literal string "undefined". None of these is a real attachment the
 * reviewer selected and must not be treated as one (it would otherwise
 * fail the size check below on every review submitted without an
 * attachment).
 *
 * A genuinely empty file the reviewer actually picked keeps its real
 * filename (e.g. "notes.pdf"), so it is not mistaken for this
 * placeholder and still triggers the "is empty and cannot be uploaded"
 * validation error further down.
 */
function isPlaceholderFileEntry(file: File): boolean {
  const name = file.name.trim().toLowerCase();
  return (
    file.size === 0 &&
    (name.length === 0 || name === "blob" || name === "undefined")
  );
}

function getFileExtension(fileName: string): string {
  const normalizedName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  if (lastDotIndex === -1 || lastDotIndex === normalizedName.length - 1) {
    return "";
  }

  return normalizedName.slice(lastDotIndex + 1);
}

type ReviewerRateLimitAction = "accept" | "decline" | "submit";

async function enforceReviewerRateLimit(
  action: ReviewerRateLimitAction,
  reviewerId: string,
  assignmentId: string,
) {
  try {
    await enforceRateLimit("review", `${action}:${reviewerId}:${assignmentId}`);
  } catch (error) {
    logger.warn("Reviewer action was rate limited", {
      event: "REVIEW_ACTION_RATE_LIMITED",
      action,
      reviewerId,
      assignmentId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error("Too many requests. Please wait before trying again.");
  }
}

function refreshReviewPages(assignmentId: string, submissionId?: string) {
  revalidatePath(`/reviewer/reviews/${assignmentId}`);
  revalidatePath("/reviewer/dashboard");

  if (submissionId) {
    revalidatePath(`/editor/submissions/${submissionId}`);
    revalidatePath(`/editor/submissions/${submissionId}/reviewers`);
    revalidatePath(`/editor/submissions/${submissionId}/revisions`);
    revalidatePath("/editor/dashboard");
  }
}

export async function acceptReview(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);
  const assignmentId = String(formData.get("assignmentId") || "").trim();

  if (!assignmentId) {
    return { success: false, message: "Review assignment ID is missing." };
  }

  try {
    await enforceReviewerRateLimit("accept", reviewer.id, assignmentId);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Too many requests. Please wait before trying again.",
    };
  }

  const assignment = await prisma.reviewAssignment.findFirst({
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
    return { success: false, message: "Review assignment not found." };
  }

  if (assignment.status !== "INVITED") {
    return {
      success: false,
      message: `This invitation cannot be accepted because its current status is ${assignment.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.reviewAssignment.updateMany({
        where: {
          id: assignmentId,
          reviewerId: reviewer.id,
          status: "INVITED",
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      if (result.count !== 1) {
        throw new Error("This review invitation has already been processed.");
      }

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
  } catch (error) {
    logger.error("Failed to accept review invitation", error, {
      event: "REVIEW_INVITATION_ACCEPT_FAILED",
      reviewerId: reviewer.id,
      assignmentId,
    });

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while accepting this invitation. Please try again.",
    };
  }

  refreshReviewPages(assignmentId, assignment.submissionId);

  return {
    success: true,
    message: "You have accepted this review invitation.",
  };
}

export async function declineReview(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);
  const assignmentId = String(formData.get("assignmentId") || "").trim();

  if (!assignmentId) {
    return { success: false, message: "Review assignment ID is missing." };
  }

  try {
    await enforceReviewerRateLimit("decline", reviewer.id, assignmentId);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Too many requests. Please wait before trying again.",
    };
  }

  const assignment = await prisma.reviewAssignment.findFirst({
    where: {
      id: assignmentId,
      reviewerId: reviewer.id,
    },
    select: {
      id: true,
      submissionId: true,
      reviewRound: true,
      status: true,

      submission: {
        select: {
          id: true,
          title: true,

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
    return { success: false, message: "Review assignment not found." };
  }

  if (assignment.status !== "INVITED") {
    return {
      success: false,
      message: `This invitation cannot be declined because its current status is ${assignment.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    };
  }

  const editorId = assignment.submission.decisions[0]?.editorId;

  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.reviewAssignment.updateMany({
        where: {
          id: assignmentId,
          reviewerId: reviewer.id,
          status: "INVITED",
        },
        data: {
          status: "DECLINED",
          completedAt: new Date(),
        },
      });

      if (result.count !== 1) {
        throw new Error("This review invitation has already been processed.");
      }

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
  } catch (error) {
    logger.error("Failed to decline review invitation", error, {
      event: "REVIEW_INVITATION_DECLINE_FAILED",
      reviewerId: reviewer.id,
      assignmentId,
    });

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while declining this invitation. Please try again.",
    };
  }

  refreshReviewPages(assignmentId, assignment.submissionId);

  return {
    success: true,
    message: "You have declined this review invitation.",
  };
}

export async function submitReview(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);

  const assignmentId = String(formData.get("assignmentId") || "").trim();

  const scoreValue = String(formData.get("score") || "").trim();

  const recommendation = String(formData.get("recommendation") || "").trim();

  const commentsToAuthor = String(
    formData.get("commentsToAuthor") || "",
  ).trim();

  const commentsToEditor = String(
    formData.get("commentsToEditor") || "",
  ).trim();

  const attachmentEntries = formData.getAll("attachments");

  const attachmentFiles = attachmentEntries.filter(
    (entry): entry is File =>
      entry instanceof File && !isPlaceholderFileEntry(entry),
  );

  if (!assignmentId) {
    return { success: false, message: "Review assignment ID is missing." };
  }

  try {
    await enforceReviewerRateLimit("submit", reviewer.id, assignmentId);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Too many requests. Please wait before trying again.",
    };
  }

  if (attachmentFiles.length > MAX_ATTACHMENTS) {
    return {
      success: false,
      message: `You may upload a maximum of ${MAX_ATTACHMENTS} review attachments.`,
    };
  }

  for (const file of attachmentFiles) {
    if (file.size === 0) {
      return {
        success: false,
        message: `${file.name} is empty and cannot be uploaded.`,
      };
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return {
        success: false,
        message: `${file.name} exceeds the maximum file size of 20 MB.`,
      };
    }

    const extension = getFileExtension(file.name);

    if (!extension) {
      return {
        success: false,
        message: `${file.name} does not have a valid file extension.`,
      };
    }

    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
      return {
        success: false,
        message: `${file.name} is not an accepted review attachment. Upload PDF, DOC, or DOCX files only.`,
      };
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return {
        success: false,
        message: `${file.name} has an invalid file type. Upload PDF, DOC, or DOCX files only.`,
      };
    }

    try {
      await validateFileSignature(file, extension);
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `${file.name} could not be verified and was not uploaded.`,
      };
    }
  }

  if (commentsToAuthor.length > MAX_REVIEW_COMMENT_LENGTH) {
    return {
      success: false,
      message: "Comments to the author must not exceed 25,000 characters.",
    };
  }

  if (commentsToEditor.length > MAX_REVIEW_COMMENT_LENGTH) {
    return {
      success: false,
      message: "Comments to the editor must not exceed 25,000 characters.",
    };
  }

  const score = Number(scoreValue);

  if (!Number.isInteger(score) || score < 1 || score > 10) {
    return {
      success: false,
      message: "Overall score must be a whole number between 1 and 10.",
    };
  }

  const validRecommendations = [
    "ACCEPT",
    "MINOR_REVISION",
    "MAJOR_REVISION",
    "REJECT",
  ] as const;

  type ReviewRecommendation = (typeof validRecommendations)[number];

  if (!validRecommendations.includes(recommendation as ReviewRecommendation)) {
    return { success: false, message: "Please select a valid recommendation." };
  }

  if (!commentsToAuthor) {
    return { success: false, message: "Please enter comments to the author." };
  }

  const assignment = await prisma.reviewAssignment.findFirst({
    where: {
      id: assignmentId,
      reviewerId: reviewer.id,
    },
    select: {
      id: true,
      reviewerId: true,
      submissionId: true,
      submissionVersionId: true,
      reviewRound: true,
      status: true,

      submission: {
        select: {
          id: true,
          title: true,
          journalId: true,
          manuscriptType: true,

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

      review: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!assignment) {
    return { success: false, message: "Review assignment not found." };
  }

  if (assignment.status !== "ACCEPTED") {
    return {
      success: false,
      message:
        "You must accept the review invitation before submitting a report.",
    };
  }

  if (assignment.review) {
    return {
      success: false,
      message: "A review report has already been submitted for this assignment.",
    };
  }

  const editorId = assignment.submission.decisions[0]?.editorId;

  const uploadedAttachments: UploadResult[] = [];

  let creditedReviewReward: { amount: number; currency: string } | null = null;

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
      const assignmentUpdate = await tx.reviewAssignment.updateMany({
        where: {
          id: assignmentId,
          reviewerId: reviewer.id,
          status: "ACCEPTED",
        },
        data: {
          status: "SUBMITTED",
          completedAt: new Date(),
        },
      });

      if (assignmentUpdate.count !== 1) {
        throw new Error(REVIEW_ALREADY_SUBMITTED_MESSAGE);
      }

      const review = await tx.review.create({
        data: {
          assignmentId,
          score,
          recommendation: recommendation as ReviewRecommendation,
          commentsToAuthor,
          commentsToEditor: commentsToEditor || null,
          submittedAt: new Date(),
        },
      });

      if (uploadedAttachments.length > 0) {
        await tx.reviewAttachment.createMany({
          data: uploadedAttachments.map((attachment) => ({
            reviewId: review.id,
            fileName: attachment.originalFilename,
            fileUrl: attachment.url,
            mimeType: attachment.mimeType || null,
            fileSize: attachment.size,
          })),
        });
      }

      const ambassador = await tx.reviewerAmbassador.findUnique({
        where: { userId: reviewer.id },
        select: { wallet: { select: { id: true } } },
      });

      if (ambassador?.wallet) {
        const rewardSettings = await getRewardSettings(
          assignment.submission.journalId,
        );

        await creditWallet(tx, {
          walletId: ambassador.wallet.id,
          type: "REVIEW_REWARD",
          amount: rewardSettings.reviewReward,
          idempotencyKey: `REVIEW_REWARD:${assignmentId}`,
          sourceType: "ReviewAssignment",
          sourceId: assignmentId,
          description: `Review completed for "${assignment.submission.title}"`,
        });

        if (rewardSettings.reviewReward > 0) {
          creditedReviewReward = {
            amount: rewardSettings.reviewReward,
            currency: rewardSettings.currency,
          };
        }

        const campaignBonus = await resolveActiveCampaignBonus({
          journalId: assignment.submission.journalId,
          rewardType: "REVIEW_REWARD",
          baseAmount: rewardSettings.reviewReward,
          manuscriptType: assignment.submission.manuscriptType,
          referredCountry: reviewer.country,
          referredAffiliation: reviewer.affiliation,
        });

        if (campaignBonus) {
          await applyCampaignBonus(tx, {
            walletId: ambassador.wallet.id,
            walletTransactionType: "REVIEW_REWARD",
            bonus: campaignBonus,
            sourceType: "ReviewAssignment",
            sourceId: assignmentId,
            description: "Referral campaign bonus for this review",
          });
        }

        await tx.notification.create({
          data: {
            userId: reviewer.id,
            type: "PAYMENT",
            title: "Review reward earned",
            message: `You earned a review reward for completing your review of "${assignment.submission.title}".`,
            link: "/reviewer/wallet",
          },
        });
      }

      await notifyStaffActionNeeded(tx, {
        journalId: assignment.submission.journalId,
        type: "REVIEW",
        title: `Review submitted — Round ${assignment.reviewRound}`,
        message:
          `A review report has been submitted for ` +
          `"${assignment.submission.title}".`,
        link: `/editor/submissions/${assignment.submissionId}/decisions`,
        additionalUserIds: [editorId],
      });

      await tx.activityLog.create({
        data: {
          userId: reviewer.id,
          action: "SUBMIT_REVIEW",
          entity: "ReviewAssignment",
          entityId: assignmentId,
          metadata: {
            event: "REVIEW_REPORT_SUBMITTED",
            submissionId: assignment.submissionId,
            reviewRound: assignment.reviewRound,
            submissionVersionId: assignment.submissionVersionId,
            recommendation,
            score,
            attachmentCount: uploadedAttachments.length,
            attachmentNames: uploadedAttachments.map(
              (attachment) => attachment.originalFilename,
            ),
          },
        },
      });
    });

    logger.info("Reviewer submitted review report", {
      event: "REVIEW_REPORT_SUBMITTED",
      reviewerId: reviewer.id,
      assignmentId,
      submissionId: assignment.submissionId,
      reviewRound: assignment.reviewRound,
      recommendation,
      score,
      attachmentCount: uploadedAttachments.length,
    });
  } catch (error) {
    /*
     * The Blob uploads may have succeeded before the database transaction
     * failed. Delete them so that orphaned private files are not retained.
     */
    if (uploadedAttachments.length > 0) {
      const cleanupResults = await Promise.allSettled(
        uploadedAttachments.map((attachment) =>
          deleteJournalFile(attachment.url, attachment.visibility),
        ),
      );

      cleanupResults.forEach((result, index) => {
        if (result.status === "rejected") {
          logger.error(
            "Failed to clean up reviewer attachment",
            result.reason,
            {
              event: "REVIEW_ATTACHMENT_CLEANUP_FAILED",
              attachment: uploadedAttachments[index]?.pathname,
            },
          );
        }
      });
    }

    logger.error("Reviewer review submission failed", error, {
      event: "REVIEW_REPORT_SUBMISSION_FAILED",
      reviewerId: reviewer.id,
      assignmentId,
      submissionId: assignment.submissionId,
      reviewRound: assignment.reviewRound,
      attachmentCount: uploadedAttachments.length,
    });

    const message =
      error instanceof Error && error.message === REVIEW_ALREADY_SUBMITTED_MESSAGE
        ? REVIEW_ALREADY_SUBMITTED_MESSAGE
        : "We couldn't submit your review due to an unexpected error. Please try again, and contact the editorial office if this keeps happening.";

    return { success: false, message };
  }

  refreshReviewPages(assignmentId, assignment.submissionId);

  revalidateTag("leaderboard", "minutes");

  const reviewReward = creditedReviewReward as {
    amount: number;
    currency: string;
  } | null;

  if (reviewReward) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
      /\/+$/,
      "",
    );

    const rewardEmailContent = rewardEarnedEmail({
      reviewerName: reviewer.name,
      description: `Review completed for "${assignment.submission.title}"`,
      amount: reviewReward.amount.toFixed(2),
      currency: reviewReward.currency,
      walletUrl: `${appUrl}/reviewer/wallet`,
    });

    try {
      await sendEmail({
        to: reviewer.email,
        subject: rewardEmailContent.subject,
        html: rewardEmailContent.html,
        text: rewardEmailContent.text,
      });
    } catch (error) {
      logger.error("Review reward email failed", error, {
        event: "REVIEW_REWARD_EMAIL_FAILED",
        reviewerId: reviewer.id,
        assignmentId,
      });
    }
  }

  return {
    success: true,
    message: `Your Round ${assignment.reviewRound} review has been submitted successfully.`,
  };
}
