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

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const MAX_REVIEW_COMMENT_LENGTH = 25_000;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

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

export async function acceptReview(formData: FormData) {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);
  const assignmentId = String(formData.get("assignmentId") || "").trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }
  await enforceReviewerRateLimit("accept", reviewer.id, assignmentId);

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

  refreshReviewPages(assignmentId, assignment.submissionId);
}

export async function declineReview(formData: FormData) {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);
  const assignmentId = String(formData.get("assignmentId") || "").trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }
  await enforceReviewerRateLimit("decline", reviewer.id, assignmentId);
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
    throw new Error("Review assignment not found.");
  }

  if (assignment.status !== "INVITED") {
    throw new Error(
      `This invitation cannot be declined because its current status is ${assignment.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    );
  }

  const editorId = assignment.submission.decisions[0]?.editorId;

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

  refreshReviewPages(assignmentId, assignment.submissionId);
}

export async function submitReview(formData: FormData) {
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
      entry instanceof File && entry.name.trim().length > 0,
  );

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }
  await enforceReviewerRateLimit("submit", reviewer.id, assignmentId);

  if (attachmentFiles.length > MAX_ATTACHMENTS) {
    throw new Error(
      `You may upload a maximum of ${MAX_ATTACHMENTS} review attachments.`,
    );
  }

  for (const file of attachmentFiles) {
    if (file.size === 0) {
      throw new Error(`${file.name} is empty and cannot be uploaded.`);
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`${file.name} exceeds the maximum file size of 20 MB.`);
    }

    const extension = getFileExtension(file.name);

    if (!extension) {
      throw new Error(`${file.name} does not have a valid file extension.`);
    }

    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
      throw new Error(
        `${file.name} is not an accepted review attachment. Upload PDF, DOC, or DOCX files only.`,
      );
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      throw new Error(
        `${file.name} has an invalid file type. Upload PDF, DOC, or DOCX files only.`,
      );
    }

    await validateFileSignature(file, extension);
  }

  if (commentsToAuthor.length > MAX_REVIEW_COMMENT_LENGTH) {
    throw new Error(
      "Comments to the author must not exceed 25,000 characters.",
    );
  }

  if (commentsToEditor.length > MAX_REVIEW_COMMENT_LENGTH) {
    throw new Error(
      "Comments to the editor must not exceed 25,000 characters.",
    );
  }

  const score = Number(scoreValue);

  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new Error("Overall score must be a whole number between 1 and 10.");
  }

  const validRecommendations = [
    "ACCEPT",
    "MINOR_REVISION",
    "MAJOR_REVISION",
    "REJECT",
  ] as const;

  type ReviewRecommendation = (typeof validRecommendations)[number];

  if (!validRecommendations.includes(recommendation as ReviewRecommendation)) {
    throw new Error("Please select a valid recommendation.");
  }

  if (!commentsToAuthor) {
    throw new Error("Please enter comments to the author.");
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
        throw new Error(
          "This review has already been submitted or is no longer available.",
        );
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

      if (editorId) {
        await tx.notification.create({
          data: {
            userId: editorId,
            type: "REVIEW",
            title: `Review submitted — Round ${assignment.reviewRound}`,
            message:
              `A review report has been submitted for ` +
              `"${assignment.submission.title}".`,
            link:
              `/editor/submissions/` + `${assignment.submissionId}/decisions`,
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

    throw error;
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
}
