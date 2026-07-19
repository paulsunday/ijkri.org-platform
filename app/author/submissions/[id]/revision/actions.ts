"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import {
  deleteJournalFile,
  uploadJournalFile,
} from "@/lib/storage/blob";
import type { UploadResult } from "@/lib/storage/types";

async function safelyDeleteUploadedFiles(
  uploads: Array<UploadResult | undefined>,
) {
  const completedUploads = uploads.filter(
    (upload): upload is UploadResult => Boolean(upload),
  );

  await Promise.allSettled(
    completedUploads.map((upload) =>
      deleteJournalFile(upload.url, upload.visibility),
    ),
  );
}

export async function submitRevision(formData: FormData) {
  const author = await requireAnyActionRole(AUTHOR_ROLES);

  const submissionId = String(
    formData.get("submissionId") || "",
  ).trim();

  const authorNotes = String(
    formData.get("authorNotes") || "",
  ).trim();

  const coverLetter = String(
    formData.get("coverLetter") || "",
  ).trim();

  const manuscriptFileValue = formData.get("manuscriptFile");
  const responseFileValue = formData.get("responseFile");

  const manuscriptFile =
    manuscriptFileValue instanceof File
      ? manuscriptFileValue
      : null;

  const responseFile =
    responseFileValue instanceof File &&
      responseFileValue.size > 0
      ? responseFileValue
      : null;

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  if (!manuscriptFile || manuscriptFile.size === 0) {
    throw new Error("Revised manuscript file is required.");
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      authorId: author.id,
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
      decisions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
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

  const latestVersionNumber =
    submission.versions[0]?.versionNumber || 1;

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
    await safelyDeleteUploadedFiles([
      manuscriptUpload,
      responseUpload,
    ]);

    throw error;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.submissionVersion.create({
        data: {
          submissionId,
          uploadedById: author.id,
          versionNumber: nextVersionNumber,

          manuscriptFileUrl: manuscriptUpload.url,
          manuscriptFileName:
            manuscriptUpload.originalFilename,

          responseFileUrl: responseUpload?.url,
          responseFileName:
            responseUpload?.originalFilename,

          coverLetter: coverLetter || null,
          authorNotes: authorNotes || null,
        },
      });

      await tx.submission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: "UNDER_INITIAL_REVIEW",
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
            versionNumber: nextVersionNumber,
            manuscriptFileName:
              manuscriptUpload.originalFilename,
            manuscriptFileUrl: manuscriptUpload.url,
            responseFileName:
              responseUpload?.originalFilename || null,
            responseFileUrl:
              responseUpload?.url || null,
            storageProvider: "VERCEL_BLOB",
          },
        },
      });
    });
  } catch (error) {
    /*
     * Uploads have already succeeded, but the database transaction failed.
     * Remove the uploaded Blob objects so they do not become orphaned files.
     */
    await safelyDeleteUploadedFiles([
      manuscriptUpload,
      responseUpload,
    ]);

    throw error;
  }

  revalidatePath(
    `/author/submissions/${submissionId}/revision`,
  );

  revalidatePath(
    `/author/submissions/${submissionId}`,
  );

  revalidatePath("/author/dashboard");
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath("/editor/dashboard");

  redirect(`/author/submissions/${submissionId}`);
}