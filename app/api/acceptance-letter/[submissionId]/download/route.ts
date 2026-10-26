import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { renderAcceptanceLetterPdf } from "@/lib/letters/render-acceptance-letter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

const LETTER_ACCESS_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR_IN_CHIEF",
  "MANAGING_EDITOR",
  "SECTION_EDITOR",
] as const;

function sanitiseFileName(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "acceptance-letter";
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { submissionId } = await params;

  if (!submissionId) {
    return NextResponse.json(
      { message: "Submission ID is missing." },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      author: {
        select: { name: true },
      },
      journal: {
        select: {
          name: true,
          issnOnline: true,
          issnPrint: true,
          publisher: { select: { name: true } },
        },
      },
      decisions: {
        where: { decision: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
          editor: { select: { name: true } },
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json(
      { message: "Submission not found." },
      { status: 404 },
    );
  }

  if (submission.status === "DRAFT" || !submission.decisions[0]) {
    return NextResponse.json(
      {
        message:
          "An acceptance letter is only available once this manuscript has been accepted.",
      },
      { status: 404 },
    );
  }

  const isAuthor = submission.authorId === user.id;

  const hasStaffAccess = user.roles.some(
    (role) =>
      role.journalId === submission.journalId &&
      (LETTER_ACCESS_ROLES as readonly string[]).includes(role.role),
  );

  const isSuperAdmin = user.roles.some(
    (role) => role.role === "SUPER_ADMIN",
  );

  if (!isAuthor && !hasStaffAccess && !isSuperAdmin) {
    return NextResponse.json(
      { message: "You do not have access to this document." },
      { status: 403 },
    );
  }

  const acceptanceDecision = submission.decisions[0];

  try {
    const pdf = await renderAcceptanceLetterPdf({
      manuscriptDisplayId: submission.displayId ?? submission.id,
      manuscriptTitle: submission.title,
      authorName: submission.author.name,
      journalName: submission.journal.name,
      journalIssn:
        submission.journal.issnOnline ?? submission.journal.issnPrint,
      publisherName: submission.journal.publisher?.name,
      decisionDate: acceptanceDecision.createdAt,
      editorName: acceptanceDecision.editor?.name,
    });

    const fileName = sanitiseFileName(
      `acceptance-letter-${submission.displayId ?? submission.id}.pdf`,
    );

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdf.byteLength),
      },
    });
  } catch (error) {
    logger.error("Acceptance letter render failed", error, {
      event: "ACCEPTANCE_LETTER_RENDER_FAILED",
      submissionId,
    });

    return NextResponse.json(
      {
        message:
          "The acceptance letter could not be generated. Please try again.",
      },
      { status: 500 },
    );
  }
}
