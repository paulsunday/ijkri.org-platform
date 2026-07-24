"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { deleteJournalFile, uploadJournalFile } from "@/lib/storage/blob";
import type { UploadResult } from "@/lib/storage/types";

const MAX_MANUSCRIPT_SIZE = 20 * 1024 * 1024;

const ALLOWED_MANUSCRIPT_EXTENSIONS = [".pdf", ".doc", ".docx"];

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

async function safelyDeleteUpload(upload: UploadResult | undefined) {
  if (!upload) {
    return;
  }

  try {
    await deleteJournalFile(upload.url, upload.visibility);
  } catch (error) {
    logger.error("Failed to clean up initial manuscript upload", {
      pathname: upload.pathname,
      visibility: upload.visibility,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function cleanOptionalValue(
  value: FormDataEntryValue | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
}

function getStringValues(formData: FormData, fieldName: string): string[] {
  return formData
    .getAll(fieldName)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidOrcid(value: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(value);
}

function getFileExtension(fileName: string): string {
  const normalizedName = fileName.toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return normalizedName.slice(lastDotIndex);
}

function readSubmissionAuthors(formData: FormData): SubmittedAuthor[] {
  /*
   * These field names must match the inputs in:
   * app/author/submit/page.tsx
   */
  const authorNames = getStringValues(formData, "authorName[]");

  const authorEmails = getStringValues(formData, "authorEmail[]");

  const authorAffiliations = getStringValues(formData, "authorAffiliation[]");

  const authorCountries = getStringValues(formData, "authorCountry[]");

  const authorOrcids = getStringValues(formData, "authorOrcid[]");

  const authors: SubmittedAuthor[] = [];

  for (let index = 0; index < authorNames.length; index += 1) {
    const fullName = authorNames[index]?.trim() || "";

    const email = authorEmails[index]?.trim() || "";

    const affiliation = authorAffiliations[index]?.trim() || "";

    const country = authorCountries[index]?.trim() || "";

    const orcid = authorOrcids[index]?.trim() || "";

    /*
     * Optional author rows are ignored when every
     * field in that row is empty.
     */
    const rowHasAnyValue = fullName || email || affiliation || country || orcid;

    if (!rowHasAnyValue) {
      continue;
    }

    if (!fullName) {
      throw new Error(`Enter the full name for Author ${index + 1}.`);
    }

    /*
     * Author 1 is the corresponding author based on
     * the current submission form.
     */
    if (index === 0 && !email) {
      throw new Error("Enter the corresponding author's email address.");
    }

    if (email && !isValidEmail(email)) {
      throw new Error(`Enter a valid email address for Author ${index + 1}.`);
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
      isCorresponding: index === 0,
      sortOrder: authors.length + 1,
    });
  }

  if (authors.length === 0) {
    throw new Error("Enter at least one manuscript author.");
  }

  return authors;
}

export async function submitManuscript(formData: FormData) {
  const submittingUser = await requireAnyActionRole(AUTHOR_ROLES);

  const title = String(formData.get("title") || "").trim();

  const abstract = String(formData.get("abstract") || "").trim();

  const manuscriptType = String(formData.get("manuscriptType") || "").trim();

  const coverLetter = String(formData.get("coverLetter") || "").trim();

  const manuscriptAuthors = readSubmissionAuthors(formData);

  const manuscriptFileValue = formData.get("manuscriptFile");

  const manuscriptFile =
    manuscriptFileValue instanceof File ? manuscriptFileValue : null;

  if (!title) {
    throw new Error("Please enter the manuscript title.");
  }

  if (!abstract) {
    throw new Error("Please enter the abstract.");
  }

  if (!manuscriptType) {
    throw new Error("Please select the manuscript type.");
  }

  if (!manuscriptFile || manuscriptFile.size === 0) {
    throw new Error("Please upload the manuscript file.");
  }

  if (manuscriptFile.size > MAX_MANUSCRIPT_SIZE) {
    throw new Error("The manuscript file must not exceed 20 MB.");
  }

  const fileExtension = getFileExtension(manuscriptFile.name);

  if (!ALLOWED_MANUSCRIPT_EXTENSIONS.includes(fileExtension)) {
    throw new Error("Only PDF, DOC, and DOCX manuscript files are accepted.");
  }

  if (
    manuscriptFile.type &&
    !ALLOWED_MANUSCRIPT_MIME_TYPES.includes(manuscriptFile.type)
  ) {
    throw new Error("The selected manuscript file type is not supported.");
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
        name: "International Journal of Knowledge, Research and Innovation",
        shortName: "IJKRI",
        slug: "IJKRI",
        contactEmail: "editor@ijkri.org",
        description:
          "A peer-reviewed academic journal for advanced research and innovation.",
        isActive: true,
      },
    });
  }

  /*
   * Generate the submission ID before uploading so
   * the permanent ID can be included in the Blob path.
   */
  const submissionId = randomUUID();

  let manuscriptUpload: UploadResult | undefined;

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

  if (!manuscriptUpload) {
    throw new Error("The manuscript file could not be uploaded.");
  }

  const completedUpload = manuscriptUpload;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          id: submissionId,
          journalId: journal.id,
          authorId: submittingUser.id,
          title,
          abstract,
          manuscriptType,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      /*
       * Save every listed manuscript author in
       * publication order.
       */
      await tx.submissionAuthor.createMany({
        data: manuscriptAuthors.map((manuscriptAuthor) => ({
          submissionId,
          fullName: manuscriptAuthor.fullName,
          email: manuscriptAuthor.email,
          affiliation: manuscriptAuthor.affiliation,
          country: manuscriptAuthor.country,
          orcid: manuscriptAuthor.orcid,
          isCorresponding: manuscriptAuthor.isCorresponding,
          sortOrder: manuscriptAuthor.sortOrder,
        })),
      });

      await tx.submissionVersion.create({
        data: {
          submissionId,
          uploadedById: submittingUser.id,
          versionNumber: 1,
          manuscriptFileUrl: completedUpload.url,
          manuscriptFileName: completedUpload.originalFilename,
          coverLetter: coverLetter || null,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: submittingUser.id,
          action: "SUBMIT_MANUSCRIPT",
          entity: "Submission",
          entityId: submissionId,
          metadata: {
            event: "MANUSCRIPT_SUBMITTED",
            title,
            manuscriptType,
            versionNumber: 1,
            authorCount: manuscriptAuthors.length,
            correspondingAuthor:
              manuscriptAuthors.find(
                (listedAuthor) => listedAuthor.isCorresponding,
              )?.fullName || null,
            manuscriptFileName: completedUpload.originalFilename,
            manuscriptFileUrl: completedUpload.url,
            storageProvider: "VERCEL_BLOB",
          },
        },
      });
    });
  } catch (error) {
    /*
     * Remove the uploaded Blob if the database
     * transaction does not complete.
     */
    await safelyDeleteUpload(completedUpload);

    throw error;
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/editor/submissions");
  revalidatePath("/author/submit");
  revalidatePath("/author/dashboard");

  revalidatePath(`/author/submissions/${submissionId}`);

  redirect(`/author/submissions/${submissionId}`);
}
