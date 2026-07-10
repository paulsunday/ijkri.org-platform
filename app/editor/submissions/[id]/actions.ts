"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sendToReview(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "UNDER_PEER_REVIEW",
    },
  });

  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath(`/editor/submissions/${submissionId}/reviewers`);
  revalidatePath("/admin/submissions");
}

export async function requestRevision(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "REVISION_REQUIRED",
    },
  });

  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath("/admin/submissions");
}

export async function rejectSubmission(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "REJECTED",
    },
  });

  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath("/admin/submissions");
}