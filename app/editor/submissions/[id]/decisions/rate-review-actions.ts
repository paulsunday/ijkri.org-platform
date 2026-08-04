"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { recalculateReviewerScore } from "@/lib/scoring/record-score";

export async function rateReviewQuality(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  const ratingValue = String(formData.get("rating") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!assignmentId) {
    throw new Error("Review assignment ID is missing.");
  }

  const rating = Number(ratingValue);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Select a rating between 1 and 5.");
  }

  const assignment = await prisma.reviewAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, status: true, reviewerId: true, submissionId: true },
  });

  if (!assignment) {
    throw new Error("Review assignment not found.");
  }

  if (assignment.status !== "SUBMITTED") {
    throw new Error("Only a submitted review can be rated.");
  }

  await prisma.$transaction([
    prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: {
        editorialRating: rating,
        editorialRatingNotes: notes || null,
        editorialRatedById: editor.id,
        editorialRatedAt: new Date(),
      },
    }),

    prisma.activityLog.create({
      data: {
        userId: editor.id,
        action: "UPDATE",
        entity: "ReviewAssignment",
        entityId: assignmentId,
        metadata: {
          event: "REVIEW_QUALITY_RATED",
          reviewerId: assignment.reviewerId,
          rating,
        },
      },
    }),
  ]);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: assignment.reviewerId },
    select: { id: true },
  });

  if (ambassador) {
    await recalculateReviewerScore(ambassador.id);
  }

  revalidatePath(`/editor/submissions/${assignment.submissionId}/decisions`);
  revalidatePath("/reviewer/performance");
}
