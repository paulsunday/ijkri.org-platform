"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSuperAdmin, requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { sendEmail } from "@/lib/email/send-email";
import {
  manuscriptAcceptedEmail,
  manuscriptRejectedEmail,
  revisionReminderEmail,
  revisionRequestedEmail,
} from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { renderAcceptanceLetterPdf } from "@/lib/letters/render-acceptance-letter";
import { createApcInvoice } from "@/lib/payments/create-apc-invoice";
import type { Invoice } from "@/lib/generated/prisma";
import { recordReferralEvent } from "@/lib/ambassador/referral-events";
import { deriveRevisionSeverity } from "@/lib/ambassador/revision-severity";

const VALID_DECISIONS = ["REVISION_REQUIRED", "ACCEPTED", "REJECTED"] as const;

type EditorialDecisionValue = (typeof VALID_DECISIONS)[number];

const EDITOR_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR_IN_CHIEF",
  "MANAGING_EDITOR",
  "SECTION_EDITOR",
] as const;

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

async function deliverDecisionEmail({
  to,
  submissionId,
  editorialDecisionId,
  editorId,
  decision,
  emailContent,
  attachments,
}: {
  to: string;
  submissionId: string;
  editorialDecisionId: string;
  editorId: string;
  decision: EditorialDecisionValue;
  emailContent: {
    subject: string;
    html: string;
    text: string;
  };
  attachments?: { filename: string; content: Uint8Array }[];
}) {
  try {
    const result = await sendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments,
    });

    await prisma.activityLog.create({
      data: {
        userId: editorId,
        action: "UPDATE",
        entity: "EditorialDecision",
        entityId: editorialDecisionId,
        metadata: {
          event: "EDITORIAL_DECISION_EMAIL_SENT",
          submissionId,
          decision,
          recipient: to,
          resendMessageId: result?.id ?? null,
        },
      },
    });
  } catch (error) {
    logger.error("Editorial decision email delivery failed", error, {
      event: "EDITORIAL_DECISION_EMAIL_FAILED",
      submissionId,
      decision,
      recipient: to,
    });

    await prisma.activityLog.create({
      data: {
        userId: editorId,
        action: "UPDATE",
        entity: "EditorialDecision",
        entityId: editorialDecisionId,
        metadata: {
          event: "EDITORIAL_DECISION_EMAIL_FAILED",
          submissionId,
          decision,
          recipient: to,
          error: error instanceof Error ? error.message : String(error),
        },
      },
    });
  }
}

export async function sendEditorialDecision(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const submissionId = String(formData.get("submissionId") || "").trim();

  const decision = String(
    formData.get("decision") || "",
  ).trim() as EditorialDecisionValue;

  const comments = String(formData.get("comments") || "").trim();

  const revisionDeadlineValue = String(
    formData.get("revisionDeadline") || "",
  ).trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  if (!VALID_DECISIONS.includes(decision)) {
    throw new Error("Please select a valid editorial decision.");
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

    revisionDeadline = new Date(`${revisionDeadlineValue}T23:59:59`);

    if (Number.isNaN(revisionDeadline.getTime())) {
      throw new Error("The revision deadline is invalid.");
    }

    if (revisionDeadline <= new Date()) {
      throw new Error("The revision deadline must be in the future.");
    }
  }

  const submission = await prisma.submission.findUnique({
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
          shortName: true,
          issnOnline: true,
          issnPrint: true,
          publisher: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  /*
   * A decision may only be recorded while the submission is still
   * awaiting one. Once accepted/rejected, or once production has
   * started, recording a new decision would silently overwrite that
   * progress with an earlier status (e.g. re-accepting a submission
   * already in AUTHOR_PROOF_APPROVAL would reset it back to
   * ACCEPTED, discarding every completed production stage).
   */
  const decisionEligibleStatuses = [
    "UNDER_INITIAL_REVIEW",
    "UNDER_PEER_REVIEW",
    "REVISION_REQUIRED",
  ] as const;

  if (
    !decisionEligibleStatuses.includes(
      submission.status as (typeof decisionEligibleStatuses)[number],
    )
  ) {
    throw new Error(
      `A new decision cannot be recorded because this submission is already ${submission.status
        .replaceAll("_", " ")
        .toLowerCase()} and is no longer awaiting an editorial decision.`,
    );
  }

  if (!isSuperAdmin(editor)) {
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
      throw new Error("You do not have editorial permission for this journal.");
    }
  }

  if (!editor.isActive) {
    throw new Error("This editor account is inactive.");
  }

  const editorHasPermission = editor.roles.some((roleRecord) =>
    EDITOR_ROLES.includes(roleRecord.role as (typeof EDITOR_ROLES)[number]),
  );

  if (!editorHasPermission) {
    throw new Error(
      "Your account does not have permission to issue editorial decisions.",
    );
  }

  const currentRound = submission.currentReviewRound || 1;

  const currentRoundAssignments = await prisma.reviewAssignment.findMany({
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

  const pendingAssignments = currentRoundAssignments.filter(
    (assignment) =>
      assignment.status === "INVITED" || assignment.status === "ACCEPTED",
  );

  if (pendingAssignments.length > 0) {
    throw new Error(
      `An editorial decision cannot yet be made. ${pendingAssignments.length
      } review assignment${pendingAssignments.length === 1 ? " is" : "s are"
      } still outstanding in review round ${currentRound}.`,
    );
  }

  const submittedReviews = currentRoundAssignments.filter(
    (assignment) => assignment.status === "SUBMITTED" && assignment.review,
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

  const authorNotificationLink = `/author/submissions/${submissionId}`;

  const editorialDecision = await prisma.$transaction(async (tx) => {
    const createdDecision = await tx.editorialDecision.create({
      data: {
        submissionId,
        editorId: editor.id,
        decision,
        comments,
        revisionDeadline,
      },

      select: {
        id: true,
        decision: true,
        revisionDeadline: true,
        createdAt: true,
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

    let invoice: Invoice | null = null;

    if (decision === "ACCEPTED") {
      const result = await createApcInvoice(tx, submissionId);
      invoice = result.invoice;
    }

    if (submission.referrerReviewerId) {
      await recordReferralEvent(tx, {
        reviewerId: submission.referrerReviewerId,
        submissionId,
        stage: decision,
        metadata:
          decision === "REVISION_REQUIRED"
            ? {
              revisionSeverity: deriveRevisionSeverity(
                submittedReviews.map(
                  (assignment) => assignment.review?.recommendation,
                ),
              ),
            }
            : undefined,
      });
    }

    await tx.notification.create({
      data: {
        userId: submission.authorId,

        type: decision === "ACCEPTED"
          ? "PAYMENT"
          : "DECISION",

        title:
          decision === "ACCEPTED"
            ? "Article Accepted – APC Invoice Issued"
            : decisionTitle,

        message:
          decision === "ACCEPTED" && invoice
            ? `Your manuscript has been accepted. APC Invoice ${invoice.invoiceNumber} has been issued for ${invoice.currency} ${invoice.amount.toFixed(2)}.`
            : decisionMessage,

        link:
          decision === "ACCEPTED" && invoice
            ? `/author/invoices/${invoice.id}`
            : authorNotificationLink,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "MAKE_DECISION",
        entity: "EditorialDecision",
        entityId: createdDecision.id,

        metadata: {
          event: "EDITORIAL_DECISION_ISSUED",
          submissionId,
          submissionTitle: submission.title,
          authorId: submission.authorId,
          authorEmail: submission.author.email,
          journalId: submission.journalId,
          journalName: submission.journal.name,
          reviewRound: currentRound,
          decision,
          invoiceId: invoice?.id ?? null,
          invoiceNumber: invoice?.invoiceNumber ?? null,
          invoiceAmount: invoice?.amount?.toString() ?? null,
          invoiceCurrency: invoice?.currency ?? null,
          revisionDeadline: revisionDeadline?.toISOString() || null,
          submittedReviewCount: submittedReviews.length,

          reviewerRecommendations: submittedReviews.map((assignment) => ({
            assignmentId: assignment.id,
            reviewerId: assignment.reviewerId,
            recommendation: assignment.review?.recommendation,
            score: assignment.review?.score,
          })),
        },
      },
    });

    return createdDecision;
  });

  const appUrl = getAppUrl();

  const submissionUrl = `${appUrl}/author/submissions/${submissionId}`;

  const contactUrl = `${appUrl}/contact`;

  const reviewerComments = submittedReviews
    .map((assignment) => assignment.review?.commentsToAuthor)
    .filter((comment): comment is string => Boolean(comment && comment.trim()));

  if (decision === "REVISION_REQUIRED" && revisionDeadline) {
    const emailContent = revisionRequestedEmail({
      authorName: submission.author.name,
      journalName: submission.journal.name,
      manuscriptTitle: submission.title,
      decisionComments: comments,
      reviewerComments,
      revisionDeadline,
      submissionUrl,
    });

    await deliverDecisionEmail({
      to: submission.author.email,
      submissionId,
      editorialDecisionId: editorialDecision.id,
      editorId: editor.id,
      decision,
      emailContent,
    });
  }

  if (decision === "ACCEPTED") {
    const acceptedInvoice = await prisma.invoice.findUnique({
      where: {
        submissionId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        currency: true,
        dueAt: true,
      },
    });

    const emailContent = manuscriptAcceptedEmail({
      authorName: submission.author.name,
      journalName: submission.journal.name,
      manuscriptTitle: submission.title,
      decisionComments: comments,
      reviewerComments,
      submissionUrl,
      apc: acceptedInvoice
        ? {
          invoiceNumber: acceptedInvoice.invoiceNumber,
          amount: acceptedInvoice.amount.toFixed(2),
          currency: acceptedInvoice.currency,
          dueDate: acceptedInvoice.dueAt
            ? acceptedInvoice.dueAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
            : null,
          invoiceUrl: `${appUrl}/author/invoices/${acceptedInvoice.id}`,
        }
        : null,
    });

    let acceptanceLetterAttachment:
      | { filename: string; content: Uint8Array }[]
      | undefined;

    try {
      const acceptanceLetterPdf = await renderAcceptanceLetterPdf({
        manuscriptDisplayId:
          submission.displayId ?? submission.id,
        manuscriptTitle: submission.title,
        authorName: submission.author.name,
        journalName: submission.journal.name,
        journalIssn:
          submission.journal.issnOnline ??
          submission.journal.issnPrint,
        publisherName: submission.journal.publisher?.name,
        decisionDate: new Date(),
        editorName: editor.name,
      });

      acceptanceLetterAttachment = [
        {
          filename: `Acceptance-Letter-${submission.displayId ?? submission.id}.pdf`,
          content: acceptanceLetterPdf,
        },
      ];
    } catch (error) {
      logger.error(
        "Acceptance letter PDF generation failed",
        error,
        {
          event: "ACCEPTANCE_LETTER_PDF_FAILED",
          submissionId,
        },
      );
    }

    await deliverDecisionEmail({
      to: submission.author.email,
      submissionId,
      editorialDecisionId: editorialDecision.id,
      editorId: editor.id,
      decision,
      emailContent,
      attachments: acceptanceLetterAttachment,
    });
  }

  if (decision === "REJECTED") {
    const emailContent = manuscriptRejectedEmail({
      authorName: submission.author.name,
      journalName: submission.journal.name,
      manuscriptTitle: submission.title,
      decisionComments: comments,
      reviewerComments,
      submissionUrl,
      contactUrl,
    });

    await deliverDecisionEmail({
      to: submission.author.email,
      submissionId,
      editorialDecisionId: editorialDecision.id,
      editorId: editor.id,
      decision,
      emailContent,
    });
  }

  logger.info("Editorial decision completed", {
    event: "EDITORIAL_DECISION_COMPLETED",
    editorialDecisionId: editorialDecision.id,
    submissionId,
    decision,
  });

  revalidatePath(`/editor/submissions/${submissionId}`);

  revalidatePath(`/editor/submissions/${submissionId}/decisions`);

  revalidatePath(`/editor/submissions/${submissionId}/review-rounds`);

  revalidatePath(`/editor/submissions/${submissionId}/revisions`);

  revalidatePath(`/author/submissions/${submissionId}`);

  revalidatePath(`/author/submissions/${submissionId}/revision`);

  revalidatePath("/editor/dashboard");
  revalidatePath("/author/dashboard");
  revalidatePath("/author/invoices");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/submissions");

  redirect(`/editor/submissions/${submissionId}`);
}

export async function sendAuthorRevisionReminder(formData: FormData) {
  const editor = await requireAnyActionRole(EDITORIAL_ROLES);

  const submissionId = String(formData.get("submissionId") || "").trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  const submission = await prisma.submission.findUnique({
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

      decisions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          revisionDeadline: true,
        },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  if (submission.status !== "REVISION_REQUIRED") {
    throw new Error(
      "A revision reminder can only be sent while the submission is awaiting revision.",
    );
  }

  if (!isSuperAdmin(editor)) {
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
      throw new Error("You do not have editorial permission for this journal.");
    }
  }

  const revisionDeadline = submission.decisions[0]?.revisionDeadline ?? null;

  const submissionUrl = `${getAppUrl()}/author/submissions/${submissionId}`;

  const emailContent = revisionReminderEmail({
    authorName: submission.author.name,
    journalName: submission.journal.name,
    manuscriptTitle: submission.title,
    revisionDeadline,
    submissionUrl,
  });

  const result = await sendEmail({
    to: submission.author.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  await prisma.$transaction(async (tx) => {
    await tx.notification.create({
      data: {
        userId: submission.authorId,
        type: "DECISION",
        title: "Revision reminder",
        message: `A reminder was sent regarding the pending revision for "${submission.title}".`,
        link: `/author/submissions/${submissionId}/revision`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: editor.id,
        action: "UPDATE",
        entity: "Submission",
        entityId: submissionId,

        metadata: {
          event: "REVISION_REMINDER_SENT",
          submissionId,
          submissionTitle: submission.title,
          authorId: submission.authorId,
          authorEmail: submission.author.email,
          journalId: submission.journalId,
          revisionDeadline: revisionDeadline?.toISOString() || null,
          resendMessageId: result?.id ?? null,
        },
      },
    });
  });

  revalidatePath(`/editor/submissions/${submissionId}`);

  revalidatePath(`/editor/submissions/${submissionId}/decisions`);
}
