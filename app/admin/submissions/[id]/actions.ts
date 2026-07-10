"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignEditor(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  const editor = await prisma.user.upsert({
    where: { email: "editor@ijari.org" },
    update: {},
    create: {
      name: "IJARI Editor",
      email: "editor@ijari.org",
      passwordHash: null,
    },
  });

  await prisma.editorialDecision.create({
    data: {
      submissionId,
      editorId: editor.id,
      decision: "UNDER_INITIAL_REVIEW",
      comments: "Editor assigned for initial editorial screening.",
    },
  });

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "UNDER_INITIAL_REVIEW",
    },
  });

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath("/admin/submissions");
}