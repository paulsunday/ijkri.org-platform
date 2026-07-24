"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { validateFileSignature } from "@/lib/storage/file-signature";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteJournalFile, uploadJournalFile } from "@/lib/storage/blob";
import type { UploadResult } from "@/lib/storage/types";

const MAX_MANUSCRIPT_SIZE = 20 * 1024 * 1024;
const MAX_RESPONSE_FILE_SIZE = 20 * 1024 * 1024;

const MAX_AUTHOR_NOTES_LENGTH = 20_000;
const MAX_COVER_LETTER_LENGTH = 50_000;

const ALLOWED_FILE_EXTENSIONS = [".pdf", ".doc", ".docx"];

const ALLOWED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];

async function safelyDeleteUploadedFiles(
  uploads: Array<UploadResult | undefined>,
) {
  const completedUploads = uploads.filter((upload): upload is UploadResult =>
    Boolean(upload),
  );

  const results = await Promise.allSettled(
    completedUploads.map((upload) =>
      deleteJournalFile(upload.url, upload.visibility),
    ),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const upload = completedUploads[index];

      logger.error("Failed to clean up revision upload", {
        event: "REVISION_UPLOAD_CLEANUP_FAILED",
        pathname: upload?.pathname,
        visibility: upload?.visibility,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  });
}

function getFileExtension(fileName: string): string {
  const normalizedName = fileName.toLowerCase();

  const lastDotIndex = normalizedName.lastIndexOf(".");

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

async function validateUploadedFile({
  file,
  fieldLabel,
  maximumSize,
}: {
  file: File;
  fieldLabel: string;
  maximumSize: number;
}): Promise<void> {
  if (file.size === 0) {
    throw new Error(`${fieldLabel} is empty.`);
  }

  if (file.size > maximumSize) {
    throw new Error(
      `${fieldLabel} must not exceed ${Math.floor(
        maximumSize / (1024 * 1024),
      )} MB.`,
    );
  }

  const extensionWithDot = getFileExtension(file.name);

  if (!ALLOWED_FILE_EXTENSIONS.includes(extensionWithDot)) {
    throw new Error(`${fieldLabel} must be a PDF, DOC, or DOCX file.`);
  }

  if (file.type && !ALLOWED_FILE_MIME_TYPES.includes(file.type)) {
    throw new Error(`${fieldLabel} has an unsupported file type.`);
  }

  const extension = extensionWithDot.slice(1);

  await validateFileSignature(file, extension);
}

export async function submitRevision(formData: FormData) {
  const author = await requireAnyActionRole(AUTHOR_ROLES);

  const submissionId = String(formData.get("submissionId") || "").trim();

  const authorNotes = String(formData.get("authorNotes") || "").trim();

  const coverLetter = String(formData.get("coverLetter") || "").trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  try {
    await enforceRateLimit("revision", `${author.id}:${submissionId}`);
  } catch (error) {
    logger.warn("Revision submission blocked by rate limiter", {
      event: "REVISION_SUBMISSION_RATE_LIMITED",
      userId: author.id,
      submissionId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(
      "Too many revision attempts. Please wait a few minutes and try again.",
    );
  }

  assertMaximumLength(authorNotes, MAX_AUTHOR_NOTES_LENGTH, "Author notes");

  assertMaximumLength(coverLetter, MAX_COVER_LETTER_LENGTH, "Cover letter");

  const manuscriptFileValue = formData.get("manuscriptFile");

  const responseFileValue = formData.get("responseFile");

  const manuscriptFile =
    manuscriptFileValue instanceof File ? manuscriptFileValue : null;

  const responseFile =
    responseFileValue instanceof File && responseFileValue.size > 0
      ? responseFileValue
      : null;

  if (!manuscriptFile) {
    throw new Error("Revised manuscript file is required.");
  }

  await validateUploadedFile({
    file: manuscriptFile,
    fieldLabel: "The revised manuscript file",
    maximumSize: MAX_MANUSCRIPT_SIZE,
  });

  if (responseFile) {
    await validateUploadedFile({
      file: responseFile,
      fieldLabel: "The response-to-reviewers file",
      maximumSize: MAX_RESPONSE_FILE_SIZE,
    });
  }
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      authorId: author.id,
    },
    select: {
      id: true,
      journalId: true,
      authorId: true,
      title: true,
      status: true,

      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        select: {
          versionNumber: true,
        },
      },

      decisions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          editorId: true,
          revisionDeadline: true,
        },
      },
    },
  });

  if (!submission) {
    throw new Error(
      "Submission not found or you do not have permission to revise it.",
    );
  }

  if (submission.status !== "REVISION_REQUIRED") {
    throw new Error(
      "A revision cannot be uploaded because this submission is not currently awaiting revision.",
    );
  }

  const latestDecision = submission.decisions[0];

  if (
    latestDecision?.revisionDeadline &&
    new Date() > latestDecision.revisionDeadline
  ) {
    throw new Error(
      "The revision deadline has passed. Contact the editorial office for assistance.",
    );
  }

  const latestVersionNumber = submission.versions[0]?.versionNumber || 1;

  const nextVersionNumber = latestVersionNumber + 1;

  let manuscriptUpload: UploadResult | undefined;

  let responseUpload: UploadResult | undefined;

  try {
    manuscriptUpload = await uploadJournalFile({
      file: manuscriptFile,
      category: "REVISION",
      visibility: "private",
      metadata: {
        category: "REVISION",
        journalId: submission.journalId,
        submissionId,
        versionNumber: nextVersionNumber,
      },
    });

    if (responseFile) {
      responseUpload = await uploadJournalFile({
        file: responseFile,
        category: "RESPONSE_LETTER",
        visibility: "private",
        metadata: {
          category: "RESPONSE_LETTER",
          journalId: submission.journalId,
          submissionId,
          versionNumber: nextVersionNumber,
        },
      });
    }
  } catch (error) {
    await safelyDeleteUploadedFiles([manuscriptUpload, responseUpload]);

    logger.error("Revision file upload failed", {
      event: "REVISION_UPLOAD_FAILED",
      userId: author.id,
      submissionId,
      versionNumber: nextVersionNumber,
      manuscriptFileName: manuscriptFile.name,
      responseFileName: responseFile?.name || null,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(
      "The revision files could not be uploaded. Please try again.",
    );
  }

  if (!manuscriptUpload) {
    await safelyDeleteUploadedFiles([responseUpload]);

    throw new Error("The revised manuscript file could not be uploaded.");
  }

  const completedManuscriptUpload = manuscriptUpload;

  try {
    const revisionSaved = await prisma.$transaction(async (tx) => {
      /*
       * Atomically claim the submission for this
       * revision. Only one concurrent request can
       * change REVISION_REQUIRED to
       * UNDER_INITIAL_REVIEW.
       */
      const claimedSubmission = await tx.submission.updateMany({
        where: {
          id: submissionId,
          authorId: author.id,
          status: "REVISION_REQUIRED",
        },
        data: {
          status: "UNDER_INITIAL_REVIEW",
        },
      });

      if (claimedSubmission.count !== 1) {
        return false;
      }

      await tx.submissionVersion.create({
        data: {
          submissionId,
          uploadedById: author.id,
          versionNumber: nextVersionNumber,

          manuscriptFileUrl: completedManuscriptUpload.url,

          manuscriptFileName: completedManuscriptUpload.originalFilename,

          responseFileUrl: responseUpload?.url || null,

          responseFileName: responseUpload?.originalFilename || null,

          coverLetter: coverLetter || null,

          authorNotes: authorNotes || null,
        },
      });

      if (latestDecision?.editorId) {
        await tx.notification.create({
          data: {
            userId: latestDecision.editorId,
            type: "SUBMISSION",
            title: "Revised manuscript submitted",
            message: `The author submitted Version ${nextVersionNumber} of: ${submission.title}`,
            link: `/editor/submissions/${submissionId}`,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: author.id,
          action: "UPDATE",
          entity: "SubmissionVersion",
          entityId: submissionId,
          metadata: {
            event: "REVISION_SUBMITTED",
            submissionId,
            submissionTitle: submission.title,
            versionNumber: nextVersionNumber,
            manuscriptFileName: completedManuscriptUpload.originalFilename,
            manuscriptFileUrl: completedManuscriptUpload.url,
            responseFileName: responseUpload?.originalFilename ?? null,
            responseFileUrl: responseUpload?.url ?? null,
            storageProvider: "VERCEL_BLOB",
          },
        },
      });

      return true;
    });

    if (!revisionSaved) {
      await safelyDeleteUploadedFiles([
        completedManuscriptUpload,
        responseUpload,
      ]);

      throw new Error(
        "This revision has already been submitted or the submission is no longer awaiting revision.",
      );
    }
  } catch (error) {
    await safelyDeleteUploadedFiles([
      completedManuscriptUpload,
      responseUpload,
    ]);

    logger.error("Revision database transaction failed", {
      event: "REVISION_TRANSACTION_FAILED",
      userId: author.id,
      submissionId,
      versionNumber: nextVersionNumber,
      error: error instanceof Error ? error.message : String(error),
    });

    if (
      error instanceof Error &&
      error.message.includes("already been submitted")
    ) {
      throw error;
    }

    throw new Error("The revision could not be submitted. Please try again.");
  }

  revalidatePath(`/author/submissions/${submissionId}/revision`);

  revalidatePath(`/author/submissions/${submissionId}`);

  revalidatePath("/author/dashboard");

  revalidatePath(`/editor/submissions/${submissionId}`);

  revalidatePath("/editor/dashboard");

  redirect(`/author/submissions/${submissionId}`);
}
