import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getBlobToken } from "@/lib/storage/blob";

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

const AGREEMENT_ACCESS_ROLES = [
  "ADMIN",
  "EDITOR_IN_CHIEF",
  "MANAGING_EDITOR",
  "SECTION_EDITOR",
  "PUBLISHER",
] as const;

export async function GET(_request: Request, { params }: RouteContext) {
  const { submissionId } = await params;

  if (!submissionId) {
    return NextResponse.json(
      { message: "Submission ID is missing." },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      displayId: true,
      journalId: true,
      authorId: true,
      agreement: {
        select: { pdfFileUrl: true, status: true },
      },
    },
  });

  if (!submission || !submission.agreement?.pdfFileUrl) {
    return NextResponse.json(
      { message: "A signed agreement is not available for this submission." },
      { status: 404 },
    );
  }

  const isSuperAdmin = user.roles.some(
    (role) => role.role === "SUPER_ADMIN",
  );

  const isAuthor = submission.authorId === user.id;

  const hasStaffAccess = user.roles.some(
    (role) =>
      role.journalId === submission.journalId &&
      (AGREEMENT_ACCESS_ROLES as readonly string[]).includes(role.role),
  );

  if (!isSuperAdmin && !isAuthor && !hasStaffAccess) {
    return NextResponse.json(
      { message: "You do not have access to this document." },
      { status: 403 },
    );
  }

  const pathname = decodeURIComponent(
    new URL(submission.agreement.pdfFileUrl).pathname.replace(/^\/+/, ""),
  );

  const result = await get(pathname, {
    access: "private",
    token: getBlobToken("private"),
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json(
      { message: "Stored file was not found." },
      { status: 404 },
    );
  }

  const fileName = `signed-agreement-${submission.displayId ?? submission.id}.pdf`;

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${fileName}"`,
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
