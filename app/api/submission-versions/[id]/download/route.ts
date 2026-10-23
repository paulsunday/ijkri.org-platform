import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
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
  "PUBLISHER",
] as const;

function getPathname(fileUrl: string): string {
  const url = new URL(fileUrl);

  return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
}

function safeFilename(fileName: string): string {
  const cleaned = fileName.replace(/[\r\n"]/g, "").trim();

  return cleaned || "manuscript";
}

function encodedFilename(fileName: string): string {
  return encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!id) {
    return new NextResponse("Submission version ID is missing.", {
      status: 400,
    });
  }

  const requestedFile =
    new URL(request.url).searchParams.get("file") === "response"
      ? "response"
      : "manuscript";

  const version = await prisma.submissionVersion.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      manuscriptFileUrl: true,
      manuscriptFileName: true,
      responseFileUrl: true,
      responseFileName: true,

      submission: {
        select: {
          id: true,
          authorId: true,
          journalId: true,

          productionAssignments: {
            select: {
              assigneeId: true,
            },
          },
        },
      },

      reviewAssignments: {
        select: {
          reviewerId: true,
        },
      },
    },
  });

  if (!version) {
    return new NextResponse("File not found.", {
      status: 404,
    });
  }

  const fileUrl =
    requestedFile === "response"
      ? version.responseFileUrl
      : version.manuscriptFileUrl;

  const fileName =
    requestedFile === "response"
      ? version.responseFileName
      : version.manuscriptFileName;

  if (!fileUrl) {
    return new NextResponse("File not found.", {
      status: 404,
    });
  }

  const user = await getCurrentUser();

  const isSuperAdmin = Boolean(
    user?.roles.some((role) => role.role === "SUPER_ADMIN"),
  );

  const isAuthor = Boolean(
    user && version.submission.authorId === user.id,
  );

  const isAssignedReviewer = Boolean(
    user &&
      version.reviewAssignments.some(
        (assignment) => assignment.reviewerId === user.id,
      ),
  );

  const hasJournalAccess = Boolean(
    user?.roles.some(
      (role) =>
        role.journalId === version.submission.journalId &&
        JOURNAL_ACCESS_ROLES.some((allowedRole) => allowedRole === role.role),
    ),
  );

  const isProductionAssignee = Boolean(
    user &&
      version.submission.productionAssignments.some(
        (assignment) => assignment.assigneeId === user.id,
      ),
  );

  const hasAccess =
    isSuperAdmin ||
    isAuthor ||
    isAssignedReviewer ||
    hasJournalAccess ||
    isProductionAssignee;

  if (!hasAccess) {
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
    pathname = getPathname(fileUrl);
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

  const resolvedFileName = safeFilename(
    fileName ||
      (requestedFile === "response"
        ? "response-to-reviewers"
        : "manuscript"),
  );

  const contentType =
    result.blob.contentType || "application/octet-stream";

  const isPdf =
    contentType === "application/pdf" ||
    resolvedFileName.toLowerCase().endsWith(".pdf");

  const headers = new Headers();

  headers.set("Content-Type", isPdf ? "application/pdf" : contentType);

  headers.set(
    "Content-Disposition",
    `${isPdf ? "inline" : "attachment"}; filename="${resolvedFileName}"; filename*=UTF-8''${encodedFilename(
      resolvedFileName,
    )}`,
  );

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store, max-age=0");

  if (result.blob.size) {
    headers.set("Content-Length", String(result.blob.size));
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers,
  });
}
