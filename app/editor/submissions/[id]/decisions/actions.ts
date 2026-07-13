"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";

const VALID_DECISIONS = [
  "REVISION_REQUIRED",
  "ACCEPTED",
  "REJECTED",
] as const;

type EditorialDecisionValue =
  (typeof VALID_DECISIONS)[number];

const EDITOR_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR_IN_CHIEF",
  "MANAGING_EDITOR",
  "SECTION_EDITOR",
] as const;

export async function sendEditorialDecision(
  formData: FormData,
) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);
  const submissionId = String(
    formData.get("submissionId") || "",
  ).trim();



  const decision = String(
    formData.get("decision") || "",
  ).trim() as EditorialDecisionValue;

  const comments = String(
    formData.get("comments") || "",
  ).trim();

  const revisionDeadlineValue = String(
    formData.get("revisionDeadline") || "",
  ).trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  if (!VALID_DECISIONS.includes(decision)) {
    throw new Error(
      "Please select a valid editorial decision.",
    );
  }

  if (!comments) {
    throw new Error(
      "A decision letter or comments to the author are required.",
    );
  }

  let revisionDeadline: Date | null = null;

  if (decision === "REVISION_REQUIRED") {
    if (!revisionDeadlineValue) {
      throw new Error(
        "A revision deadline is required when requesting a revision.",
      );
    }

    revisionDeadline = new Date(
      `${revisionDeadlineValue}T23:59:59`,
    );

    if (Number.isNaN(revisionDeadline.getTime())) {
      throw new Error(
        "The revision deadline is invalid.",
      );
    }

    if (revisionDeadline <= new Date()) {
      throw new Error(
        "The revision deadline must be in the future.",
      );
    }
  }

  const submission =
    await prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        journal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const terminalStatuses = [
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ];

  if (terminalStatuses.includes(submission.status)) {
    throw new Error(
      `A new decision cannot be recorded because this submission is already ${submission.status
        .replaceAll("_", " ")
        .toLowerCase()}.`,
    );
  }

  const editorJournalRole = await prisma.userJournalRole.findFirst({
    where: {
      userId: editor.id,
      journalId: submission.journalId,
      role: {
        in: [...EDITOR_ROLES],
      },
    },
    select: {
      id: true,
    },
  });

  if (!editorJournalRole) {
    throw new Error(
      "You do not have editorial permission for this journal.",
    );
  }

  if (!editor) {
    throw new Error("Editor account not found.");
  }

  if (!editor.isActive) {
    throw new Error(
      "This editor account is inactive.",
    );
  }

  const editorHasPermission = editor.roles.some(
    (roleRecord) =>
      EDITOR_ROLES.includes(
        roleRecord.role as
        (typeof EDITOR_ROLES)[number],
      ),
  );

  if (!editorHasPermission) {
    throw new Error(
      "The selected user does not have editorial permission for this journal.",
    );
  }

  const currentRound =
    submission.currentReviewRound || 1;

  const currentRoundAssignments =
    await prisma.reviewAssignment.findMany({
      where: {
        submissionId,
        reviewRound: currentRound,
      },
      include: {
        review: true,
      },
    });

  if (currentRoundAssignments.length === 0) {
    throw new Error(
      `No reviewer assignments were found for review round ${currentRound}.`,
    );
  }

  const pendingAssignments =
    currentRoundAssignments.filter(
      (assignment) =>
        assignment.status === "INVITED" ||
        assignment.status === "ACCEPTED",
    );

  if (pendingAssignments.length > 0) {
    throw new Error(
      `An editorial decision cannot yet be made. ${pendingAssignments.length
      } review assignment${pendingAssignments.length === 1
        ? " is"
        : "s are"
      } still outstanding in review round ${currentRound}.`,
    );
  }

  const submittedReviews =
    currentRoundAssignments.filter(
      (assignment) =>
        assignment.status === "SUBMITTED" &&
        assignment.review,
    );

  if (submittedReviews.length === 0) {
    throw new Error(
      `No submitted reviewer report was found for review round ${currentRound}.`,
    );
  }

  const decisionTitle =
    decision === "ACCEPTED"
      ? "Manuscript Accepted"
      : decision === "REJECTED"
        ? "Manuscript Rejected"
        : "Revision Required";

  const decisionMessage =
    decision === "ACCEPTED"
      ? `Your manuscript "${submission.title}" has been accepted.`
      : decision === "REJECTED"
        ? `A rejection decision has been made on your manuscript "${submission.title}".`
        : `A revision has been requested for your manuscript "${submission.title}".`;

  const authorNotificationLink =
    `/author/submissions/${submissionId}`;

  await prisma.$transaction(async (tx) => {
    const editorialDecision =
      await tx.editorialDecision.create({
        data: {
          submissionId,
          editorId: editor.id,
          decision,
          comments,
          revisionDeadline,
        },
      });

    await tx.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: decision,
      },
    });

    await tx.notification.create({
      data: {
        userId: submission.authorId,
        type: "DECISION",
        title: decisionTitle,
        message: decisionMessage,
        link: authorNotificationLink,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "MAKE_DECISION",
        entity: "EditorialDecision",
        entityId: editorialDecision.id,
        metadata: {
          submissionId,
          reviewRound: currentRound,
          decision,
          revisionDeadline:
            revisionDeadline?.toISOString() || null,
          submittedReviewCount:
            submittedReviews.length,
          reviewerRecommendations:
            submittedReviews.map(
              (assignment) => ({
                assignmentId: assignment.id,
                reviewerId: assignment.reviewerId,
                recommendation:
                  assignment.review?.recommendation,
                score: assignment.review?.score,
              }),
            ),
        },
      },
    });
  });

  revalidatePath(
    `/editor/submissions/${submissionId}`,
  );

  revalidatePath(
    `/editor/submissions/${submissionId}/decisions`,
  );

  revalidatePath(
    `/editor/submissions/${submissionId}/review-rounds`,
  );

  revalidatePath(
    `/editor/submissions/${submissionId}/revisions`,
  );

  revalidatePath("/editor/dashboard");
  revalidatePath("/author/dashboard");

  redirect(`/editor/submissions/${submissionId}`);
}