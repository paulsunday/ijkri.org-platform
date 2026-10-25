"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { logger } from "@/lib/logger";
import { generateManuscriptDisplayId } from "@/lib/manuscripts/generate-display-id";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  deleteJournalFile,
  uploadJournalFile,
} from "@/lib/storage/blob";
import type { UploadResult } from "@/lib/storage/types";
import {
  resolveReferralCode,
  resolveAmbassadorByReviewerId,
} from "@/lib/ambassador/resolve-referral";
import { recordReferralEvent } from "@/lib/ambassador/referral-events";
import { creditWallet } from "@/lib/ambassador/wallet";
import { getRewardSettings } from "@/lib/ambassador/reward-settings";
import { sendEmail } from "@/lib/email/send-email";
import { referralSubmittedEmail } from "@/lib/email/templates";
import { resolveActiveCampaignBonus } from "@/lib/campaigns/resolve-active-campaign";
import { applyCampaignBonus } from "@/lib/campaigns/apply-campaign-bonus";

const MAX_MANUSCRIPT_SIZE = 20 * 1024 * 1024;

const MAX_TITLE_LENGTH = 500;
const MAX_ABSTRACT_LENGTH = 15_000;
const MAX_COVER_LETTER_LENGTH = 50_000;
const MAX_MANUSCRIPT_TYPE_LENGTH = 100;
const MAX_AUTHORS = 100;

const MAX_AUTHOR_NAME_LENGTH = 200;
const MAX_AUTHOR_EMAIL_LENGTH = 320;
const MAX_AFFILIATION_LENGTH = 500;
const MAX_COUNTRY_LENGTH = 100;
const MAX_ORCID_LENGTH = 19;

const ALLOWED_MANUSCRIPT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
];

const ALLOWED_MANUSCRIPT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];

type SubmittedAuthor = {
  fullName: string;
  email: string | null;
  affiliation: string | null;
  country: string | null;
  orcid: string | null;
  isCorresponding: boolean;
  sortOrder: number;
};

async function safelyDeleteUpload(
  upload: UploadResult | undefined,
) {
  if (!upload) {
    return;
  }

  try {
    await deleteJournalFile(
      upload.url,
      upload.visibility,
    );
  } catch (error) {
    logger.error(
      "Failed to clean up manuscript upload",
      error,
      {
        event: "MANUSCRIPT_UPLOAD_CLEANUP_FAILED",
        pathname: upload.pathname,
        visibility: upload.visibility,
      },
    );
  }
}

function getStringValues(
  formData: FormData,
  fieldName: string,
): string[] {
  return formData
    .getAll(fieldName)
    .map((value) =>
      typeof value === "string"
        ? value.trim()
        : "",
    );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function isValidOrcid(value: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(
    value,
  );
}

function getFileExtension(
  fileName: string,
): string {
  const normalizedName =
    fileName.toLowerCase();

  const lastDotIndex =
    normalizedName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return normalizedName.slice(lastDotIndex);
}

function assertMaximumLength(
  value: string,
  maximumLength: number,
  fieldLabel: string,
) {
  if (value.length > maximumLength) {
    throw new Error(
      `${fieldLabel} must not exceed ${maximumLength.toLocaleString()} characters.`,
    );
  }
}

function readSubmissionAuthors(
  formData: FormData,
): SubmittedAuthor[] {
  /*
   * These field names must match the inputs in:
   * app/author/submit/page.tsx
   */
  const authorNames = getStringValues(
    formData,
    "authorName[]",
  );

  const authorEmails = getStringValues(
    formData,
    "authorEmail[]",
  );

  const authorAffiliations = getStringValues(
    formData,
    "authorAffiliation[]",
  );

  const authorCountries = getStringValues(
    formData,
    "authorCountry[]",
  );

  const authorOrcids = getStringValues(
    formData,
    "authorOrcid[]",
  );

  /*
   * Use the largest array so that partially supplied
   * rows are not silently ignored.
   */
  const rowCount = Math.max(
    authorNames.length,
    authorEmails.length,
    authorAffiliations.length,
    authorCountries.length,
    authorOrcids.length,
  );

  if (rowCount > MAX_AUTHORS) {
    throw new Error(
      `A manuscript may contain no more than ${MAX_AUTHORS} authors.`,
    );
  }

  const authors: SubmittedAuthor[] = [];

  for (
    let index = 0;
    index < rowCount;
    index += 1
  ) {
    const fullName =
      authorNames[index]?.trim() || "";

    const email =
      authorEmails[index]?.trim().toLowerCase() ||
      "";

    const affiliation =
      authorAffiliations[index]?.trim() || "";

    const country =
      authorCountries[index]?.trim() || "";

    const orcid =
      authorOrcids[index]?.trim() || "";

    const rowHasAnyValue = Boolean(
      fullName ||
      email ||
      affiliation ||
      country ||
      orcid,
    );

    if (!rowHasAnyValue) {
      continue;
    }

    if (!fullName) {
      throw new Error(
        `Enter the full name for Author ${index + 1}.`,
      );
    }

    assertMaximumLength(
      fullName,
      MAX_AUTHOR_NAME_LENGTH,
      `Author ${index + 1} full name`,
    );

    assertMaximumLength(
      email,
      MAX_AUTHOR_EMAIL_LENGTH,
      `Author ${index + 1} email address`,
    );

    assertMaximumLength(
      affiliation,
      MAX_AFFILIATION_LENGTH,
      `Author ${index + 1} affiliation`,
    );

    assertMaximumLength(
      country,
      MAX_COUNTRY_LENGTH,
      `Author ${index + 1} country`,
    );

    assertMaximumLength(
      orcid,
      MAX_ORCID_LENGTH,
      `Author ${index + 1} ORCID`,
    );

    /*
     * The first completed author row is treated as
     * the corresponding author.
     */
    const isCorresponding =
      authors.length === 0;

    if (isCorresponding && !email) {
      throw new Error(
        "Enter the corresponding author's email address.",
      );
    }

    if (email && !isValidEmail(email)) {
      throw new Error(
        `Enter a valid email address for Author ${index + 1}.`,
      );
    }

    if (orcid && !isValidOrcid(orcid)) {
      throw new Error(
        `Enter a valid ORCID for Author ${index + 1} using the format 0000-0000-0000-0000.`,
      );
    }

    authors.push({
      fullName,
      email: email || null,
      affiliation: affiliation || null,
      country: country || null,
      orcid: orcid || null,
      isCorresponding,
      sortOrder: authors.length + 1,
    });
  }

  if (authors.length === 0) {
    throw new Error(
      "Enter at least one manuscript author.",
    );
  }

  if (authors.length > MAX_AUTHORS) {
    throw new Error(
      `A manuscript may contain no more than ${MAX_AUTHORS} authors.`,
    );
  }

  return authors;
}

function validateManuscriptFile(
  manuscriptFile: File,
) {
  if (manuscriptFile.size === 0) {
    throw new Error(
      "Please upload the manuscript file.",
    );
  }

  if (
    manuscriptFile.size >
    MAX_MANUSCRIPT_SIZE
  ) {
    throw new Error(
      "The manuscript file must not exceed 20 MB.",
    );
  }

  const fileExtension = getFileExtension(
    manuscriptFile.name,
  );

  if (
    !ALLOWED_MANUSCRIPT_EXTENSIONS.includes(
      fileExtension,
    )
  ) {
    throw new Error(
      "Only PDF, DOC, and DOCX manuscript files are accepted.",
    );
  }

  if (
    manuscriptFile.type &&
    !ALLOWED_MANUSCRIPT_MIME_TYPES.includes(
      manuscriptFile.type,
    )
  ) {
    throw new Error(
      "The selected manuscript file type is not supported.",
    );
  }
}

export async function submitManuscript(
  formData: FormData,
) {
  const submittingUser =
    await requireAnyActionRole(AUTHOR_ROLES);

  try {
    await enforceRateLimit(
      "submission",
      submittingUser.id,
    );
  } catch (error) {
    logger.warn(
      "Manuscript submission blocked by rate limiter",
      {
        event: "SUBMISSION_RATE_LIMITED",
        userId: submittingUser.id,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    throw new Error(
      "Too many submission attempts. Please wait a few minutes and try again.",
    );
  }

  const title = String(
    formData.get("title") || "",
  ).trim();

  const abstract = String(
    formData.get("abstract") || "",
  ).trim();

  const manuscriptType = String(
    formData.get("manuscriptType") || "",
  ).trim();

  const coverLetter = String(
    formData.get("coverLetter") || "",
  ).trim();

  if (!title) {
    throw new Error(
      "Please enter the manuscript title.",
    );
  }

  if (!abstract) {
    throw new Error(
      "Please enter the abstract.",
    );
  }

  if (!manuscriptType) {
    throw new Error(
      "Please select the manuscript type.",
    );
  }

  assertMaximumLength(
    title,
    MAX_TITLE_LENGTH,
    "Manuscript title",
  );

  assertMaximumLength(
    abstract,
    MAX_ABSTRACT_LENGTH,
    "Abstract",
  );

  assertMaximumLength(
    manuscriptType,
    MAX_MANUSCRIPT_TYPE_LENGTH,
    "Manuscript type",
  );

  assertMaximumLength(
    coverLetter,
    MAX_COVER_LETTER_LENGTH,
    "Cover letter",
  );

  const manuscriptAuthors =
    readSubmissionAuthors(formData);

  const manuscriptFileValue =
    formData.get("manuscriptFile");

  const manuscriptFile =
    manuscriptFileValue instanceof File
      ? manuscriptFileValue
      : null;

  if (!manuscriptFile) {
    throw new Error(
      "Please upload the manuscript file.",
    );
  }

  validateManuscriptFile(manuscriptFile);

  const journal =
    await prisma.journal.findUnique({
      where: {
        slug: "IJKRI",
      },
      select: {
        id: true,
        slug: true,
        tenantId: true,
        isActive: true,
      },
    });

  if (!journal) {
    logger.error(
      "Manuscript submission failed because the journal was not found",
      {
        event:
          "SUBMISSION_JOURNAL_NOT_FOUND",
        userId: submittingUser.id,
        journalSlug: "IJKRI",
      },
    );

    throw new Error(
      "The journal configuration could not be found. Please contact the journal administrator.",
    );
  }

  if (!journal.isActive) {
    throw new Error(
      "This journal is not currently accepting submissions.",
    );
  }

  /*
   * Generate the submission ID before uploading so
   * the permanent ID can be included in the storage path.
   */
  const submissionId = randomUUID();

  /*
   * Assigned inside the transaction below (it needs an atomic
   * per-journal, per-year counter), but referenced after the
   * transaction resolves for the confirmation email and redirect.
   */
  let manuscriptDisplayId = "";

  let manuscriptUpload:
    | UploadResult
    | undefined;

  try {
    manuscriptUpload =
      await uploadJournalFile({
        file: manuscriptFile,
        category: "MANUSCRIPT",
        visibility: "private",
        metadata: {
          category: "MANUSCRIPT",
          tenantId: journal.tenantId,
          journalId: journal.id,
          submissionId,
          versionNumber: 1,
        },
      });
  } catch (error) {
    await safelyDeleteUpload(
      manuscriptUpload,
    );

    logger.error(
      "Initial manuscript upload failed",
      error,
      {
        event:
          "MANUSCRIPT_UPLOAD_FAILED",
        userId: submittingUser.id,
        submissionId,
        journalId: journal.id,
        fileName: manuscriptFile.name,
        fileSize: manuscriptFile.size,
        mimeType:
          manuscriptFile.type || null,
      },
    );

    throw new Error(
      "The manuscript file could not be uploaded. Please try again.",
    );
  }

  if (!manuscriptUpload) {
    throw new Error(
      "The manuscript file could not be uploaded.",
    );
  }

  const completedUpload =
    manuscriptUpload;

  const referralCodeInput = String(
    formData.get("referralCode") || "",
  ).trim();

  const explicitReferral = await resolveReferralCode(
    referralCodeInput,
  );

  const referral =
    explicitReferral ??
    (await resolveAmbassadorByReviewerId(
      submittingUser.referredByReviewerId,
    ));

  try {
    await prisma.$transaction(
      async (tx) => {
        manuscriptDisplayId = await generateManuscriptDisplayId(
          tx,
          journal.slug,
          journal.id,
        );

        await tx.submission.create({
          data: {
            id: submissionId,
            displayId: manuscriptDisplayId,
            journalId: journal.id,
            authorId: submittingUser.id,
            title,
            abstract,
            manuscriptType,
            status: "SUBMITTED",
            submittedAt: new Date(),
            referrerReviewerId: referral?.reviewerId,
            referrerAssignedAt: referral ? new Date() : null,
          },
        });

        await tx.submissionAuthor.createMany({
          data: manuscriptAuthors.map(
            (manuscriptAuthor) => ({
              submissionId,
              fullName:
                manuscriptAuthor.fullName,
              email:
                manuscriptAuthor.email,
              affiliation:
                manuscriptAuthor.affiliation,
              country:
                manuscriptAuthor.country,
              orcid:
                manuscriptAuthor.orcid,
              isCorresponding:
                manuscriptAuthor.isCorresponding,
              sortOrder:
                manuscriptAuthor.sortOrder,
            }),
          ),
        });

        await tx.submissionVersion.create({
          data: {
            submissionId,
            uploadedById:
              submittingUser.id,
            versionNumber: 1,
            manuscriptFileUrl:
              completedUpload.url,
            manuscriptFileName:
              completedUpload.originalFilename,
            coverLetter:
              coverLetter || null,
          },
        });

        await tx.activityLog.create({
          data: {
            userId: submittingUser.id,
            action:
              "SUBMIT_MANUSCRIPT",
            entity: "Submission",
            entityId: submissionId,
            metadata: {
              event:
                "MANUSCRIPT_SUBMITTED",
              title,
              manuscriptType,
              versionNumber: 1,
              authorCount:
                manuscriptAuthors.length,
              correspondingAuthor:
                manuscriptAuthors.find(
                  (listedAuthor) =>
                    listedAuthor.isCorresponding,
                )?.fullName || null,
              manuscriptFileName:
                completedUpload.originalFilename,
              manuscriptFileUrl:
                completedUpload.url,
              storageProvider:
                "VERCEL_BLOB",
              referrerReviewerId:
                referral?.reviewerId ?? null,
            },
          },
        });

        if (referral) {
          await recordReferralEvent(tx, {
            reviewerId: referral.reviewerId,
            referredUserId: submittingUser.id,
            submissionId,
            stage: "SUBMITTED",
          });

          const wallet = await tx.ambassadorWallet.findUnique({
            where: { ambassadorId: referral.ambassadorId },
            select: { id: true },
          });

          if (wallet) {
            const rewardSettings = await getRewardSettings(
              journal.id,
            );

            await creditWallet(tx, {
              walletId: wallet.id,
              type: "SUBMISSION_REWARD",
              amount: rewardSettings.submissionReward,
              idempotencyKey: `SUBMISSION_REWARD:${submissionId}`,
              sourceType: "Submission",
              sourceId: submissionId,
              description:
                "A manuscript from your referral was submitted",
            });

            const campaignBonus = await resolveActiveCampaignBonus({
              journalId: journal.id,
              rewardType: "SUBMISSION_REWARD",
              baseAmount: rewardSettings.submissionReward,
              manuscriptType,
              referredCountry: submittingUser.country,
              referredAffiliation: submittingUser.affiliation,
            });

            if (campaignBonus) {
              await applyCampaignBonus(tx, {
                walletId: wallet.id,
                walletTransactionType: "SUBMISSION_REWARD",
                bonus: campaignBonus,
                sourceType: "Submission",
                sourceId: submissionId,
                description: "Referral campaign bonus for this submission",
              });
            }

            await tx.notification.create({
              data: {
                userId: referral.reviewerId,
                type: "SUBMISSION",
                title: "A referred manuscript was submitted",
                message: `${submittingUser.name} submitted a manuscript through your referral link.`,
                link: `/reviewer/referrals/${submissionId}`,
              },
            });
          }
        }
      },
    );
  } catch (error) {
    await safelyDeleteUpload(
      completedUpload,
    );

    logger.error(
      "Manuscript database transaction failed",
      error,
      {
        event:
          "MANUSCRIPT_SUBMISSION_TRANSACTION_FAILED",
        userId: submittingUser.id,
        submissionId,
        journalId: journal.id,
      },
    );

    throw new Error(
      "The manuscript could not be submitted. Please try again.",
    );
  }

  revalidatePath(
    "/admin/submissions",
  );
  revalidatePath(
    "/editor/submissions",
  );
  revalidatePath("/author/submit");
  revalidatePath(
    "/author/dashboard",
  );
  revalidatePath(
    `/author/submissions/${submissionId}`,
  );

  if (referral) {
    const referringReviewer = await prisma.user.findUnique({
      where: { id: referral.reviewerId },
      select: { name: true, email: true },
    });

    if (referringReviewer) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
        /\/+$/,
        "",
      );

      const referralEmailContent = referralSubmittedEmail({
        reviewerName: referringReviewer.name,
        manuscriptTitle: title,
        referralCentreUrl: `${appUrl}/reviewer/referrals/${submissionId}`,
      });

      try {
        await sendEmail({
          to: referringReviewer.email,
          subject: referralEmailContent.subject,
          html: referralEmailContent.html,
          text: referralEmailContent.text,
        });
      } catch (error) {
        logger.error("Referral submission email failed", error, {
          event: "REFERRAL_SUBMISSION_EMAIL_FAILED",
          reviewerId: referral.reviewerId,
          submissionId,
        });
      }
    }
  }

  redirect(
    `/author/submissions/${submissionId}`,
  );
}