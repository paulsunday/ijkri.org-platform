"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole, requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { recordReferralEvent } from "@/lib/ambassador/referral-events";
import { logger } from "@/lib/logger";

export type SubmissionActionState = {
  success: boolean;
  message: string;
};

async function runSubmissionAction(
  fn: () => Promise<string>,
): Promise<SubmissionActionState> {
  try {
    const message = await fn();

    return { success: true, message };
  } catch (error) {
    logger.error("Submission admin action failed", error, {
      event: "SUBMISSION_ADMIN_ACTION_FAILED",
    });

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }
}

const MAX_AUTHORS = 100;
const MAX_AUTHOR_NAME_LENGTH = 200;
const MAX_AUTHOR_EMAIL_LENGTH = 320;
const MAX_AFFILIATION_LENGTH = 500;
const MAX_DEPARTMENT_LENGTH = 200;
const MAX_COUNTRY_LENGTH = 100;
const MAX_ORCID_LENGTH = 19;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidOrcid(value: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(value);
}

function assertMaximumLength(
  value: string,
  maximumLength: number,
  fieldLabel: string,
) {
  if (value.length > maximumLength) {
    throw new Error(
      `${fieldLabel} must not exceed ${maximumLength.toLocaleString()} characters.`,
    );
  }
}

export async function assignEditor(
  _previousState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  return runSubmissionAction(async () => {
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
      referrerReviewerId: true,
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

    if (submission.referrerReviewerId) {
      await recordReferralEvent(tx, {
        reviewerId: submission.referrerReviewerId,
        submissionId,
        stage: "DESK_REVIEW",
      });
    }

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

  return "Editor assigned and initial review started.";
  });
}

/**
 * Adds a co-author to a submission on the corresponding author's
 * behalf. Restricted to SUPER_ADMIN, since this edits a manuscript's
 * author list outside the normal author-facing submission flow.
 *
 * The new author is always added as non-corresponding; the existing
 * corresponding author is left unchanged. Submissions created before
 * per-author records existed are backfilled with the primary
 * submitter as author 1 so the list stays consistent.
 */
export async function addSubmissionAuthor(
  _previousState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  return runSubmissionAction(async () => {
  const admin = await requireActionRole("SUPER_ADMIN");

  const submissionId = String(
    formData.get("submissionId") || "",
  ).trim();

  const fullName = String(formData.get("fullName") || "").trim();

  const email = String(formData.get("email") || "").trim();

  const affiliation = String(
    formData.get("affiliation") || "",
  ).trim();

  const department = String(
    formData.get("department") || "",
  ).trim();

  const country = String(formData.get("country") || "").trim();

  const orcid = String(formData.get("orcid") || "").trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  if (!fullName) {
    throw new Error("Enter the author's full name.");
  }

  assertMaximumLength(
    fullName,
    MAX_AUTHOR_NAME_LENGTH,
    "Author name",
  );
  assertMaximumLength(
    email,
    MAX_AUTHOR_EMAIL_LENGTH,
    "Author email",
  );
  assertMaximumLength(
    affiliation,
    MAX_AFFILIATION_LENGTH,
    "Author affiliation",
  );
  assertMaximumLength(
    department,
    MAX_DEPARTMENT_LENGTH,
    "Author department",
  );
  assertMaximumLength(
    country,
    MAX_COUNTRY_LENGTH,
    "Author country",
  );
  assertMaximumLength(orcid, MAX_ORCID_LENGTH, "Author ORCID");

  if (email && !isValidEmail(email)) {
    throw new Error(
      "Enter a valid email address for the new author.",
    );
  }

  if (orcid && !isValidOrcid(orcid)) {
    throw new Error(
      "Enter a valid ORCID using the format 0000-0000-0000-0000.",
    );
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      id: true,
      title: true,
      journalId: true,

      author: {
        select: {
          name: true,
          email: true,
          affiliation: true,
          country: true,
          orcid: true,
        },
      },

      submissionAuthors: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  if (submission.submissionAuthors.length >= MAX_AUTHORS) {
    throw new Error(
      `A manuscript may contain no more than ${MAX_AUTHORS} authors.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (submission.submissionAuthors.length === 0) {
      await tx.submissionAuthor.create({
        data: {
          submissionId,
          fullName: submission.author.name,
          email: submission.author.email,
          affiliation: submission.author.affiliation,
          country: submission.author.country,
          orcid: submission.author.orcid,
          isCorresponding: true,
          sortOrder: 1,
        },
      });
    }

    const nextSortOrder =
      submission.submissionAuthors.length > 0
        ? submission.submissionAuthors[
            submission.submissionAuthors.length - 1
          ].sortOrder + 1
        : 2;

    const createdAuthor = await tx.submissionAuthor.create({
      data: {
        submissionId,
        fullName,
        email: email || null,
        affiliation: affiliation || null,
        department: department || null,
        country: country || null,
        orcid: orcid || null,
        isCorresponding: false,
        sortOrder: nextSortOrder,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "CREATE",
        entity: "SubmissionAuthor",
        entityId: createdAuthor.id,

        metadata: {
          event: "SUBMISSION_AUTHOR_ADDED",
          submissionId,
          journalId: submission.journalId,
          submissionTitle: submission.title,
          authorName: fullName,
          addedBy: admin.id,
        },
      },
    });
  });

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath(`/editor/submissions/${submissionId}`);

  return `${fullName} added as an author.`;
  });
}
