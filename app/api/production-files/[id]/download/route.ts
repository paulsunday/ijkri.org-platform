import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { hasArticleReadAccess } from "@/lib/payments/article-access";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const JOURNAL_ACCESS_ROLES = [
  "ADMIN",
  "EDITOR_IN_CHIEF",
  "MANAGING_EDITOR",
  "SECTION_EDITOR",
  "COPYEDITOR",
  "TYPESETTER",
  "PROOFREADER",
  "PUBLISHER",
] as const;

function getPathname(fileUrl: string): string {
  const url = new URL(fileUrl);

  return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
}

function safeFilename(fileName: string): string {
  const cleaned = fileName.replace(/[\r\n"]/g, "").trim();

  return cleaned || "document";
}

function encodedFilename(fileName: string): string {
  return encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!id) {
    return new NextResponse("Production file ID is missing.", {
      status: 400,
    });
  }

  const file = await prisma.productionFile.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
      fileType: true,
      isFinal: true,

      submission: {
        select: {
          id: true,
          authorId: true,
          journalId: true,
        },
      },

      productionAssignment: {
        select: {
          assigneeId: true,
          assignedById: true,
        },
      },
    },
  });

  if (!file) {
    return new NextResponse("File not found.", {
      status: 404,
    });
  }

  const publishedArticle = await prisma.article.findUnique({
    where: {
      submissionId: file.submission.id,
    },

    select: {
      id: true,
      status: true,
    },
  });

  const user = await getCurrentUser();

  /*
   * Production/editorial staff always retain access to files
   * they're directly involved with, whether or not the
   * article has been published yet.
   */
  const isSuperAdmin = Boolean(
    user?.roles.some((role) => role.role === "SUPER_ADMIN"),
  );

  const isAuthor = Boolean(
    user && file.submission.authorId === user.id,
  );

  const isAssignee = Boolean(
    user && file.productionAssignment?.assigneeId === user.id,
  );

  const isAssigningEditor = Boolean(
    user && file.productionAssignment?.assignedById === user.id,
  );

  const hasJournalAccess = Boolean(
    user?.roles.some(
      (role) =>
        role.journalId === file.submission.journalId &&
        JOURNAL_ACCESS_ROLES.some((allowedRole) => allowedRole === role.role),
    ),
  );

  const hasInternalAccess =
    isSuperAdmin ||
    isAuthor ||
    isAssignee ||
    isAssigningEditor ||
    hasJournalAccess;

  /*
   * For a published article's PDF, a reader who isn't staff
   * still needs a paid subscription or a purchase of this
   * specific article to download it.
   */
  const isPublished = publishedArticle?.status === "PUBLISHED";

  const hasReaderAccess =
    isPublished &&
    (await hasArticleReadAccess({
      userId: user?.id ?? null,
      journalId: file.submission.journalId,
      articleId: publishedArticle.id,
      authorUserId: file.submission.authorId,
    }));

  if (!hasInternalAccess && !hasReaderAccess) {
    if (!user) {
      return new NextResponse("Authentication required.", {
        status: 401,
      });
    }

    return new NextResponse("Forbidden.", {
      status: 403,
    });
  }

  let pathname: string;

  try {
    pathname = getPathname(file.fileUrl);
  } catch {
    return new NextResponse("The stored file URL is invalid.", {
      status: 500,
    });
  }

  const result = await get(pathname, {
    access: "private",
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return new NextResponse("Stored file was not found.", {
      status: 404,
    });
  }

  const fileName = safeFilename(file.fileName);

  const contentType =
    result.blob.contentType || file.mimeType || "application/octet-stream";

  const isPdf =
    contentType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf");

  /*
   * PDFs open inside the browser.
   * DOCX and other formats download normally.
   */
  const disposition = isPdf ? "inline" : "attachment";

  const headers = new Headers();

  headers.set("Content-Type", isPdf ? "application/pdf" : contentType);

  headers.set(
    "Content-Disposition",
    `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodedFilename(
      fileName,
    )}`,
  );

  headers.set("X-Content-Type-Options", "nosniff");

  /*
   * Access here always depends on the requester's identity
   * (staff role, purchase, or subscription), so the response
   * must never be cached by a shared/CDN cache.
   */
  headers.set("Cache-Control", "private, no-store, max-age=0");

  if (result.blob.size) {
    headers.set("Content-Length", String(result.blob.size));
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers,
  });
}
