"use server";

import { randomUUID } from "crypto";
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
    console.error(
      "Failed to clean up initial manuscript upload:",
      {
        pathname: upload.pathname,
        error,
      },
    );
  }
}

export async function submitManuscript(
  formData: FormData,
) {
  const author = await requireAnyActionRole(AUTHOR_ROLES);

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

  const manuscriptFileValue =
    formData.get("manuscriptFile");

  const manuscriptFile =
    manuscriptFileValue instanceof File
      ? manuscriptFileValue
      : null;

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

  if (
    !manuscriptFile ||
    manuscriptFile.size === 0
  ) {
    throw new Error(
      "Please upload the manuscript file.",
    );
  }

  let journal = await prisma.journal.findUnique({
    where: {
      slug: "IJKRI",
    },
  });

  if (!journal) {
    const tenant = await prisma.tenant.upsert({
      where: {
        slug: "innovare-academic-publishing",
      },
      update: {},
      create: {
        name: "Innovare Academic Publishing",
        slug: "innovare-academic-publishing",
        isActive: true,
      },
    });

    journal = await prisma.journal.create({
      data: {
        tenantId: tenant.id,
        name:
          "International Journal of Knowledge, Research and Innovation",
        shortName: "IJKRI",
        slug: "IJKRI",
        contactEmail: "editor@IJKRI.org",
        description:
          "A peer-reviewed academic journal for advanced research and innovation.",
        isActive: true,
      },
    });
  }

  /*
   * Generate the submission ID before uploading so the Blob pathname
   * can contain the permanent submission identifier.
   *
   * Prisma String IDs may be assigned explicitly even when the schema
   * also defines a default ID generator.
   */
  const submissionId = randomUUID();

  let manuscriptUpload:
    | UploadResult
    | undefined;

  try {
    manuscriptUpload = await uploadJournalFile({
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
    await safelyDeleteUpload(manuscriptUpload);
    throw error;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          id: submissionId,
          journalId: journal.id,
          authorId: author.id,
          title,
          abstract,
          manuscriptType,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      await tx.submissionVersion.create({
        data: {
          submissionId,
          uploadedById: author.id,
          versionNumber: 1,
          manuscriptFileUrl:
            manuscriptUpload.url,
          manuscriptFileName:
            manuscriptUpload.originalFilename,
          coverLetter: coverLetter || null,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: author.id,
          action: "CREATE",
          entity: "Submission",
          entityId: submissionId,
          metadata: {
            title,
            manuscriptType,
            versionNumber: 1,
            manuscriptFileName:
              manuscriptUpload.originalFilename,
            manuscriptFileUrl:
              manuscriptUpload.url,
            storageProvider: "VERCEL_BLOB",
          },
        },
      });
    });
  } catch (error) {
    /*
     * The Blob upload succeeded but the database transaction failed.
     * Delete the Blob object to prevent an orphaned file.
     */
    await safelyDeleteUpload(manuscriptUpload);
    throw error;
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/editor/submissions");
  revalidatePath("/author/submit");
  revalidatePath("/author/dashboard");
  revalidatePath(
    `/author/submissions/${submissionId}`,
  );

  redirect(`/author/submissions/${submissionId}`);
}