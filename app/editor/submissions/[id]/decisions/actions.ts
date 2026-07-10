"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function sendEditorialDecision(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");
  const editorId = String(formData.get("editorId") || "");
  const decision = String(formData.get("decision") || "");
  const comments = String(formData.get("comments") || "");

  if (!submissionId) throw new Error("Submission ID is missing.");
  if (!editorId) throw new Error("Editor ID is missing.");
  if (!decision) throw new Error("Decision is required.");

  const validDecisions = [
    "REVISION_REQUIRED",
    "ACCEPTED",
    "REJECTED",
  ];

  if (!validDecisions.includes(decision)) {
    throw new Error("Invalid editorial decision.");
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { author: true },
  });

  if (!submission) throw new Error("Submission not found.");

  await prisma.$transaction(async (tx) => {
    await tx.editorialDecision.create({
      data: {
        submissionId,
        editorId,
        decision: decision as any,
        comments,
      },
    });

    await tx.submission.update({
      where: { id: submissionId },
      data: {
        status: decision as any,
      },
    });

    await tx.notification.create({
      data: {
        userId: submission.authorId,
        type: "DECISION",
        title: "Editorial Decision Received",
        message: `A decision has been made on your manuscript: ${submission.title}`,
        link: `/author/submissions/${submissionId}`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editorId,
        action: "MAKE_DECISION",
        entity: "Submission",
        entityId: submissionId,
      },
    });
  });

  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath(`/editor/submissions/${submissionId}/decisions`);
  revalidatePath("/editor/dashboard");
  revalidatePath("/author/dashboard");

  redirect(`/editor/submissions/${submissionId}`);
}