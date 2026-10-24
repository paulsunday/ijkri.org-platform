"use server";

import { revalidatePath } from "next/cache";

import { isSuperAdmin, requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { uploadJournalFile } from "@/lib/storage/blob";

export type IssueActionState = {
  success: boolean;
  message: string;
};

async function runIssueAction(
  fn: () => Promise<string>,
): Promise<IssueActionState> {
  try {
    const message = await fn();

    return { success: true, message };
  } catch (error) {
    logger.error("Issue admin action failed", error, {
      event: "ISSUE_ADMIN_ACTION_FAILED",
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

/**
 * Uploads an issue cover image if one was provided in the form.
 * Returns null when no file was selected, so callers can fall back
 * to a manually entered cover image URL.
 */
async function uploadIssueCoverIfProvided({
  formData,
  journalId,
  issueId,
}: {
  formData: FormData;
  journalId: string;
  issueId: string;
}): Promise<string | null> {
  const coverImageFile = formData.get("coverImageFile");

  if (!(coverImageFile instanceof File) || coverImageFile.size === 0) {
    return null;
  }

  const uploadResult = await uploadJournalFile({
    file: coverImageFile,
    category: "ISSUE_COVER",
    metadata: {
      journalId,
      issueId,
      category: "ISSUE_COVER",
    },
  });

  return uploadResult.url;
}

function createIssueSlug({
  journalSlug,
  volumeNumber,
  issueNumber,
  year,
}: {
  journalSlug: string;
  volumeNumber: number;
  issueNumber: number;
  year: number;
}) {
  return `${journalSlug}-volume-${volumeNumber}-issue-${issueNumber}-${year}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSlug(value: FormDataEntryValue | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function optionalDate(value: FormDataEntryValue | null) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid publication date.");
  }

  return date;
}

function refreshIssuePages() {
  revalidatePath("/admin/issues");
  revalidatePath("/admin/volumes");
  revalidatePath("/current-issue");
  revalidatePath("/archives");
  revalidatePath("/admin/articles");
}

async function verifyIssueAdminPermission(
  administratorId: string,
  journalId: string,
) {
  const administrator = await prisma.user.findUnique({
    where: {
      id: administratorId,
    },
    select: {
      id: true,
      roles: true,
    },
  });

  if (!administrator) {
    throw new Error("Administrator account not found.");
  }

  if (isSuperAdmin(administrator)) {
    return;
  }

  const permission = await prisma.userJournalRole.findFirst({
    where: {
      userId: administratorId,
      journalId,
      role: {
        in: [...ADMIN_ROLES],
      },
    },
    select: {
      id: true,
    },
  });

  if (!permission) {
    throw new Error("You do not have permission to manage this journal.");
  }
}

export async function createIssue(
  _previousState: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  return runIssueAction(async () => {
  const administrator = await requireAnyActionRole(ADMIN_ROLES);

  const volumeId = String(formData.get("volumeId") || "").trim();

  const number = Number(formData.get("number"));

  const title = String(formData.get("title") || "").trim();

  const description = String(formData.get("description") || "").trim();

  const coverImage = String(formData.get("coverImage") || "").trim();

  const editorial = String(formData.get("editorial") || "").trim();

  const fullIssuePdf = String(formData.get("fullIssuePdf") || "").trim();

  const publishedAt = optionalDate(formData.get("publishedAt"));

  if (!volumeId) {
    throw new Error("Select a volume.");
  }

  if (!Number.isInteger(number) || number < 1) {
    throw new Error("Issue number must be a positive whole number.");
  }

  const volume = await prisma.volume.findUnique({
    where: {
      id: volumeId,
    },
    include: {
      journal: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
    },
  });

  if (!volume) {
    throw new Error("Volume not found.");
  }

  await verifyIssueAdminPermission(administrator.id, volume.journalId);

  if (!volume.journal.isActive) {
    throw new Error("An issue cannot be created for an inactive journal.");
  }

  const slug = createIssueSlug({
    journalSlug: volume.journal.slug,
    volumeNumber: volume.number,
    issueNumber: number,
    year: volume.year,
  });

  const existingIssue = await prisma.issue.findUnique({
    where: {
      volumeId_number: {
        volumeId,
        number,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingIssue) {
    throw new Error(
      `Issue ${number} already exists in Volume ${volume.number}.`,
    );
  }

  const issue = await prisma.issue.create({
    data: {
      journalId: volume.journalId,
      volumeId,
      number,
      slug,
      title: title || null,
      description: description || null,
      editorial: editorial || null,
      coverImage: coverImage || null,
      fullIssuePdf: fullIssuePdf || null,
      publishedAt,
      isCurrent: false,
      isPublished: false,
    },
  });

  const uploadedCoverImageUrl = await uploadIssueCoverIfProvided({
    formData,
    journalId: volume.journalId,
    issueId: issue.id,
  });

  if (uploadedCoverImageUrl) {
    await prisma.issue.update({
      where: {
        id: issue.id,
      },
      data: {
        coverImage: uploadedCoverImageUrl,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: administrator.id,
      action: "CREATE",
      entity: "Issue",
      entityId: issue.id,
      metadata: {
        event: "ISSUE_CREATED",
        journalId: volume.journalId,
        journalName: volume.journal.name,
        volumeId,
        volumeNumber: volume.number,
        issueNumber: number,
      },
    },
  });

  refreshIssuePages();

  return `Issue ${number} created in Volume ${volume.number}.`;
  });
}

export async function updateIssue(
  _previousState: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  return runIssueAction(async () => {
  const administrator = await requireAnyActionRole(ADMIN_ROLES);

  const issueId = String(formData.get("issueId") || "").trim();

  const title = String(formData.get("title") || "").trim();

  const description = String(formData.get("description") || "").trim();

  const coverImage = String(formData.get("coverImage") || "").trim();

  const slug = normalizeSlug(formData.get("slug"));

  const editorial = String(formData.get("editorial") || "").trim();

  const fullIssuePdf = String(formData.get("fullIssuePdf") || "").trim();

  const publishedAt = optionalDate(formData.get("publishedAt"));

  if (!issueId) {
    throw new Error("Issue ID is missing.");
  }

  if (!slug) {
    throw new Error("Issue slug is required.");
  }

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
    select: {
      id: true,
      journalId: true,
      slug: true,
      title: true,
      description: true,
      editorial: true,
      coverImage: true,
      fullIssuePdf: true,
      publishedAt: true,
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  await verifyIssueAdminPermission(administrator.id, issue.journalId);
  const duplicateSlug = await prisma.issue.findFirst({
    where: {
      slug,
      id: {
        not: issueId,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicateSlug) {
    throw new Error("Another issue already uses this slug.");
  }

  const uploadedCoverImageUrl = await uploadIssueCoverIfProvided({
    formData,
    journalId: issue.journalId,
    issueId,
  });

  const finalCoverImage = uploadedCoverImageUrl || coverImage || null;

  await prisma.$transaction(async (tx) => {
    await tx.issue.update({
      where: {
        id: issueId,
      },
      data: {
        slug,
        title: title || null,
        description: description || null,
        editorial: editorial || null,
        coverImage: finalCoverImage,
        fullIssuePdf: fullIssuePdf || null,
        publishedAt,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: administrator.id,
        action: "UPDATE",
        entity: "Issue",
        entityId: issueId,
        metadata: {
          event: "ISSUE_UPDATED",
          journalId: issue.journalId,

          previousSlug: issue.slug,
          slug,

          previousTitle: issue.title,
          title: title || null,

          previousDescription: issue.description,
          description: description || null,

          previousEditorial: issue.editorial,
          editorial: editorial || null,

          previousCoverImage: issue.coverImage,
          coverImage: finalCoverImage,

          previousFullIssuePdf: issue.fullIssuePdf,
          fullIssuePdf: fullIssuePdf || null,

          previousPublishedAt: issue.publishedAt?.toISOString() || null,

          publishedAt: publishedAt?.toISOString() || null,
        },
      },
    });
  });

  refreshIssuePages();

  return "Issue updated.";
  });
}

export async function publishIssue(
  _previousState: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  return runIssueAction(async () => {
  const administrator = await requireAnyActionRole(ADMIN_ROLES);

  const issueId = String(formData.get("issueId") || "").trim();

  if (!issueId) {
    throw new Error("Issue ID is missing.");
  }

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
    select: {
      id: true,
      journalId: true,
      volumeId: true,
      number: true,
      isPublished: true,
      publishedAt: true,

      volume: {
        select: {
          id: true,
          number: true,
          isPublished: true,
        },
      },
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  await verifyIssueAdminPermission(administrator.id, issue.journalId);

  if (issue.isPublished) {
    throw new Error("This issue is already published.");
  }

  /*
   * Count published Article records directly.
   * This avoids relying on a nested relation loaded
   * together with the Issue record.
   */
  const publishedArticleCount = await prisma.article.count({
    where: {
      issueId: issue.id,
      status: "PUBLISHED",
    },
  });

  if (publishedArticleCount < 1) {
    /*
     * Additional diagnostic check:
     * determine whether the issue contains an article
     * whose status is not PUBLISHED.
     */
    const assignedArticleCount = await prisma.article.count({
      where: {
        issueId: issue.id,
      },
    });

    if (assignedArticleCount > 0) {
      throw new Error(
        `This issue contains ${assignedArticleCount} article(s), but none currently has PUBLISHED status.`,
      );
    }

    throw new Error(
      "No article record is assigned to this issue. Open Admin → Articles and assign the published article to this exact issue.",
    );
  }

  const publishedAt = issue.publishedAt || new Date();

  await prisma.$transaction(async (tx) => {
    /*
     * Only one issue should be current for a journal.
     */
    await tx.issue.updateMany({
      where: {
        journalId: issue.journalId,
        isCurrent: true,
        id: {
          not: issue.id,
        },
      },
      data: {
        isCurrent: false,
      },
    });

    await tx.issue.update({
      where: {
        id: issue.id,
      },
      data: {
        isPublished: true,
        isCurrent: true,
        publishedAt,
      },
    });

    if (!issue.volume.isPublished) {
      await tx.volume.update({
        where: {
          id: issue.volumeId,
        },
        data: {
          isPublished: true,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: administrator.id,
        action: "UPDATE",
        entity: "Issue",
        entityId: issue.id,
        metadata: {
          event: "ISSUE_PUBLISHED",
          journalId: issue.journalId,
          volumeId: issue.volumeId,
          volumeNumber: issue.volume.number,
          issueNumber: issue.number,
          articleCount: publishedArticleCount,
          markedCurrent: true,
          publishedAt: publishedAt.toISOString(),
        },
      },
    });
  });

  refreshIssuePages();

  return "Issue published.";
  });
}

export async function unpublishIssue(
  _previousState: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  return runIssueAction(async () => {
  const administrator = await requireAnyActionRole(ADMIN_ROLES);

  const issueId = String(formData.get("issueId") || "").trim();

  if (!issueId) {
    throw new Error("Issue ID is missing.");
  }

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
    select: {
      id: true,
      journalId: true,
      volumeId: true,
      number: true,
      isPublished: true,
      isCurrent: true,
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  await verifyIssueAdminPermission(administrator.id, issue.journalId);

  if (!issue.isPublished) {
    throw new Error("This issue is already unpublished.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.issue.update({
      where: {
        id: issueId,
      },
      data: {
        isPublished: false,
        isCurrent: false,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: administrator.id,
        action: "UPDATE",
        entity: "Issue",
        entityId: issueId,
        metadata: {
          event: "ISSUE_UNPUBLISHED",
          journalId: issue.journalId,
          volumeId: issue.volumeId,
          issueNumber: issue.number,
          wasCurrent: issue.isCurrent,
        },
      },
    });
  });

  refreshIssuePages();

  return "Issue unpublished.";
  });
}

export async function setCurrentIssue(
  _previousState: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  return runIssueAction(async () => {
  const administrator = await requireAnyActionRole(ADMIN_ROLES);

  const issueId = String(formData.get("issueId") || "").trim();

  if (!issueId) {
    throw new Error("Issue ID is missing.");
  }

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
    select: {
      id: true,
      journalId: true,
      volumeId: true,
      number: true,
      isPublished: true,
      isCurrent: true,
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  await verifyIssueAdminPermission(administrator.id, issue.journalId);

  if (!issue.isPublished) {
    throw new Error("Only a published issue can be marked as current.");
  }

  if (issue.isCurrent) {
    throw new Error("This issue is already the current issue.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.issue.updateMany({
      where: {
        journalId: issue.journalId,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
      },
    });

    await tx.issue.update({
      where: {
        id: issueId,
      },
      data: {
        isCurrent: true,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: administrator.id,
        action: "UPDATE",
        entity: "Issue",
        entityId: issueId,
        metadata: {
          event: "ISSUE_MARKED_CURRENT",
          journalId: issue.journalId,
          volumeId: issue.volumeId,
          issueNumber: issue.number,
        },
      },
    });
  });

  refreshIssuePages();

  return "This issue is now the current issue.";
  });
}

export async function clearCurrentIssue(
  _previousState: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  return runIssueAction(async () => {
  const administrator = await requireAnyActionRole(ADMIN_ROLES);

  const issueId = String(formData.get("issueId") || "").trim();

  if (!issueId) {
    throw new Error("Issue ID is missing.");
  }

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
    select: {
      id: true,
      journalId: true,
      volumeId: true,
      number: true,
      isCurrent: true,
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  await verifyIssueAdminPermission(administrator.id, issue.journalId);

  if (!issue.isCurrent) {
    throw new Error("This issue is not currently marked as the current issue.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.issue.update({
      where: {
        id: issueId,
      },
      data: {
        isCurrent: false,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: administrator.id,
        action: "UPDATE",
        entity: "Issue",
        entityId: issueId,
        metadata: {
          event: "CURRENT_ISSUE_CLEARED",
          journalId: issue.journalId,
          volumeId: issue.volumeId,
          issueNumber: issue.number,
        },
      },
    });
  });

  refreshIssuePages();

  return "Current issue cleared.";
  });
}

export async function deleteIssue(
  _previousState: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  return runIssueAction(async () => {
  const administrator = await requireAnyActionRole(ADMIN_ROLES);

  const issueId = String(formData.get("issueId") || "").trim();

  if (!issueId) {
    throw new Error("Issue ID is missing.");
  }

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
    include: {
      articles: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  await verifyIssueAdminPermission(administrator.id, issue.journalId);

  if (issue.isPublished) {
    throw new Error("A published issue cannot be deleted. Unpublish it first.");
  }

  if (issue.isCurrent) {
    throw new Error(
      "The current issue cannot be deleted. Clear the current issue first.",
    );
  }

  if (issue.articles.length > 0) {
    throw new Error(
      "This issue cannot be deleted because articles are assigned to it.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.issue.delete({
      where: {
        id: issueId,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: administrator.id,
        action: "DELETE",
        entity: "Issue",
        entityId: issueId,
        metadata: {
          event: "ISSUE_DELETED",
          journalId: issue.journalId,
          volumeId: issue.volumeId,
          issueNumber: issue.number,
        },
      },
    });
  });

  refreshIssuePages();

  return "Issue deleted.";
  });
}
