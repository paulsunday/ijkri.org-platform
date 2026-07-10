"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignReviewer(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");
  const reviewerId = String(formData.get("reviewerId") || "");

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  if (!reviewerId) {
    throw new Error("Reviewer ID is missing.");
  }

  await prisma.reviewAssignment.upsert({
    where: {
      submissionId_reviewerId: {
        submissionId,
        reviewerId,
      },
    },
    update: {
      status: "INVITED",
      invitedAt: new Date(),
    },
    create: {
      submissionId,
      reviewerId,
      status: "INVITED",
      invitedAt: new Date(),
      blindType: "DOUBLE_BLIND",
    },
  });

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "UNDER_PEER_REVIEW",
    },
  });

  revalidatePath(`/editor/submissions/${submissionId}/reviewers`);
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath("/editor/dashboard");
  revalidatePath("/admin/submissions");
}