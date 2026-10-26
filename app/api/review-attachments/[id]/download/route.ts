import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getBlobToken } from "@/lib/storage/blob";

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

  return cleaned || "attachment";
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
    return new NextResponse("Review attachment ID is missing.", {
      status: 400,
    });
  }

  const attachment = await prisma.reviewAttachment.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,

      review: {
        select: {
          assignment: {
            select: {
              reviewerId: true,

              submission: {
                select: {
                  journalId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attachment) {
    return new NextResponse("File not found.", {
      status: 404,
    });
  }

  const user = await getCurrentUser();

  const isSuperAdmin = Boolean(
    user?.roles.some((role) => role.role === "SUPER_ADMIN"),
  );

  const isOwningReviewer = Boolean(
    user && attachment.review.assignment.reviewerId === user.id,
  );

  const hasJournalAccess = Boolean(
    user?.roles.some(
      (role) =>
        role.journalId === attachment.review.assignment.submission.journalId &&
        JOURNAL_ACCESS_ROLES.some((allowedRole) => allowedRole === role.role),
    ),
  );

  const hasAccess = isSuperAdmin || isOwningReviewer || hasJournalAccess;

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
    pathname = getPathname(attachment.fileUrl);
  } catch {
    return new NextResponse("The stored file URL is invalid.", {
      status: 500,
    });
  }

  const result = await get(pathname, {
    access: "private",
    token: getBlobToken("private"),
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return new NextResponse("Stored file was not found.", {
      status: 404,
    });
  }

  const fileName = safeFilename(attachment.fileName);

  const contentType =
    result.blob.contentType || attachment.mimeType || "application/octet-stream";

  const isPdf =
    contentType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf");

  const headers = new Headers();

  headers.set("Content-Type", isPdf ? "application/pdf" : contentType);

  headers.set(
    "Content-Disposition",
    `${isPdf ? "inline" : "attachment"}; filename="${fileName}"; filename*=UTF-8''${encodedFilename(
      fileName,
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
