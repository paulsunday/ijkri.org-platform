"use server";

import { revalidatePath } from "next/cache";

import {
  isSuperAdmin,
  requireAnyActionRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

async function verifyEditorialPermission(
  editor: {
    id: string;
    roles: {
      role: import("@/lib/generated/prisma").UserRole;
    }[];
  },
  journalId: string,
) {
  if (isSuperAdmin(editor)) {
    return;
  }

  const role = await prisma.userJournalRole.findFirst({
    where: {
      userId: editor.id,
      journalId,
      role: {
        in: EDITORIAL_ROLES,
      },
    },
    select: {
      id: true,
    },
  });

  if (!role) {
    throw new Error(
      "You do not have permission to manage this submission.",
    );
  }
}

export async function sendToReview(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

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
      journalId: true,
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  await verifyEditorialPermission(
    editor,
    submission.journalId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "UNDER_PEER_REVIEW",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "UPDATE",
        entity: "Submission",
        entityId: submissionId,
        metadata: {
          event: "SEND_TO_REVIEW",
        },
      },
    });
  });

  revalidatePath(
    `/editor/submissions/${submissionId}`,
  );
  revalidatePath(
    `/editor/submissions/${submissionId}/reviewers`,
  );
  revalidatePath("/admin/submissions");
}

export async function requestRevision(
  formData: FormData,
) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

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
      journalId: true,
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  await verifyEditorialPermission(
    editor,
    submission.journalId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "REVISION_REQUIRED",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "UPDATE",
        entity: "Submission",
        entityId: submissionId,
        metadata: {
          event: "REQUEST_REVISION",
        },
      },
    });
  });

  revalidatePath(
    `/editor/submissions/${submissionId}`,
  );
  revalidatePath("/admin/submissions");
}

export async function rejectSubmission(
  formData: FormData,
) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

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
      journalId: true,
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  await verifyEditorialPermission(
    editor,
    submission.journalId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "REJECTED",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "UPDATE",
        entity: "Submission",
        entityId: submissionId,
        metadata: {
          event: "REJECT_SUBMISSION",
        },
      },
    });
  });

  revalidatePath(
    `/editor/submissions/${submissionId}`,
  );
  revalidatePath("/admin/submissions");
}