"use server";

import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
];

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function validateUploadedFile(file: File, required: boolean) {
  if (!file || file.size === 0) {
    if (required) {
      throw new Error("The revised manuscript file is required.");
    }

    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `${file.name} is larger than the permitted 20 MB file size.`,
    );
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `${file.name} is not supported. Upload a PDF, DOC, or DOCX file.`,
    );
  }
}

async function saveUploadedFile(
  file: File,
  submissionId: string,
  fileCategory: "manuscript" | "response",
) {
  validateUploadedFile(file, fileCategory === "manuscript");

  const extension = path.extname(file.name).toLowerCase();
  const originalName = sanitizeFileName(file.name);
  const storedName = `${fileCategory}-${randomUUID()}${extension}`;

  const relativeDirectory = path.join(
    "uploads",
    "revisions",
    submissionId,
  );

  const absoluteDirectory = path.join(
    process.cwd(),
    "public",
    relativeDirectory,
  );

  await mkdir(absoluteDirectory, {
    recursive: true,
  });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await writeFile(
    path.join(absoluteDirectory, storedName),
    buffer,
  );

  return {
    originalName,
    publicUrl: `/${relativeDirectory
      .replaceAll("\\", "/")}/${storedName}`,
  };
}

export async function submitRevision(formData: FormData) {
  const submissionId = String(
    formData.get("submissionId") || "",
  );

  const authorNotes = String(
    formData.get("authorNotes") || "",
  ).trim();

  const coverLetter = String(
    formData.get("coverLetter") || "",
  ).trim();

  const manuscriptFile = formData.get(
    "manuscriptFile",
  ) as File | null;

  const responseFile = formData.get(
    "responseFile",
  ) as File | null;

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  if (!manuscriptFile) {
    throw new Error("Revised manuscript file is required.");
  }

  validateUploadedFile(manuscriptFile, true);

  if (responseFile && responseFile.size > 0) {
    validateUploadedFile(responseFile, false);
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
      decisions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
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

  const manuscriptUpload = await saveUploadedFile(
    manuscriptFile,
    submissionId,
    "manuscript",
  );

  let responseUpload:
    | {
        originalName: string;
        publicUrl: string;
      }
    | undefined;

  if (responseFile && responseFile.size > 0) {
    responseUpload = await saveUploadedFile(
      responseFile,
      submissionId,
      "response",
    );
  }

  const latestVersionNumber =
    submission.versions[0]?.versionNumber || 1;

  const nextVersionNumber = latestVersionNumber + 1;

  await prisma.$transaction(async (tx) => {
    await tx.submissionVersion.create({
      data: {
        submissionId,
        uploadedById: submission.authorId,
        versionNumber: nextVersionNumber,
        manuscriptFileUrl: manuscriptUpload.publicUrl,
        manuscriptFileName: manuscriptUpload.originalName,
        responseFileUrl: responseUpload?.publicUrl,
        responseFileName: responseUpload?.originalName,
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
        userId: submission.authorId,
        action: "UPDATE",
        entity: "SubmissionVersion",
        entityId: submissionId,
        metadata: {
          versionNumber: nextVersionNumber,
          manuscriptFileName: manuscriptUpload.originalName,
          responseFileName:
            responseUpload?.originalName || null,
        },
      },
    });
  });

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