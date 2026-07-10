"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function acceptReview(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");

  if (!assignmentId) throw new Error("Review assignment ID is missing.");

  await prisma.reviewAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  revalidatePath(`/reviewer/reviews/${assignmentId}`);
  revalidatePath("/reviewer/dashboard");
}

export async function declineReview(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");

  if (!assignmentId) throw new Error("Review assignment ID is missing.");

  await prisma.reviewAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "DECLINED",
    },
  });

  revalidatePath(`/reviewer/reviews/${assignmentId}`);
  revalidatePath("/reviewer/dashboard");
}

export async function submitReview(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");
  const score = Number(formData.get("score"));
  const recommendation = String(formData.get("recommendation") || "");
  const commentsToAuthor = String(formData.get("commentsToAuthor") || "").trim();
  const commentsToEditor = String(formData.get("commentsToEditor") || "").trim();

  if (!assignmentId) throw new Error("Review assignment ID is missing.");
  if (!recommendation) throw new Error("Please select a recommendation.");
  if (!commentsToAuthor) throw new Error("Please enter comments to the author.");
  if (!commentsToEditor) throw new Error("Please enter confidential comments to the editor.");

  await prisma.review.upsert({
    where: {
      assignmentId,
    },
    update: {
      score,
      recommendation: recommendation as any,
      commentsToAuthor,
      commentsToEditor,
      submittedAt: new Date(),
    },
    create: {
      assignmentId,
      score,
      recommendation: recommendation as any,
      commentsToAuthor,
      commentsToEditor,
      submittedAt: new Date(),
    },
  });

  await prisma.reviewAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "SUBMITTED" as any,
      completedAt: new Date(),
    },
  });

  revalidatePath(`/reviewer/reviews/${assignmentId}`);
  revalidatePath("/reviewer/dashboard");
}