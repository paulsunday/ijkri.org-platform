"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

export async function assignEditor(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const submissionId = String(
    formData.get("submissionId") || "",
  ).trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      id: true,
      title: true,
      journalId: true,
      status: true,
      authorId: true,
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const blockedStatuses = [
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ] as const;

  if (
    blockedStatuses.includes(
      submission.status as (typeof blockedStatuses)[number],
    )
  ) {
    throw new Error(
      `An editor cannot be assigned because this submission is already ${submission.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    const editorialDecision =
      await tx.editorialDecision.create({
        data: {
          submissionId,
          editorId: admin.id,
          decision: "UNDER_INITIAL_REVIEW",
          comments:
            "Editor assigned for initial editorial screening.",
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

    await tx.notification.create({
      data: {
        userId: admin.id,
        type: "SUBMISSION",
        title: "Submission assigned",
        message: `You have been assigned to conduct the initial editorial screening for "${submission.title}".`,
        link: `/editor/submissions/${submissionId}`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "Submission",
        entityId: submissionId,
        metadata: {
          event: "EDITOR_ASSIGNED",
          editorId: admin.id,
          journalId: submission.journalId,
          editorialDecisionId:
            editorialDecision.id,
          previousStatus: submission.status,
          newStatus: "UNDER_INITIAL_REVIEW",
        },
      },
    });
  });

  revalidatePath(
    `/admin/submissions/${submissionId}`,
  );
  revalidatePath("/admin/submissions");
  revalidatePath(
    `/editor/submissions/${submissionId}`,
  );
  revalidatePath("/editor/dashboard");
}