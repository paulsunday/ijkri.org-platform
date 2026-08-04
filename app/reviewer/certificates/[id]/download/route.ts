import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateAmbassadorCertificate } from "@/lib/ambassador/generate-certificate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SessionRole = {
  role: string;
  journalId?: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function sanitiseFileName(value: string) {
  const cleaned = value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "certificate";
}

function hasCertificateAccess({
  userId,
  certificateOwnerId,
  roles,
}: {
  userId: string;
  certificateOwnerId: string;
  roles: SessionRole[];
}) {
  if (userId === certificateOwnerId) {
    return true;
  }

  return roles.some(
    (assignment) => assignment.role === "SUPER_ADMIN" || assignment.role === "ADMIN",
  );
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return jsonError("Authentication is required.", 401);
  }

  const { id } = await context.params;
  const certificateId = id.trim();

  if (!certificateId) {
    return jsonError("Certificate ID is required.", 400);
  }

  const certificate = await prisma.ambassadorCertificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      type: true,
      title: true,
      certificateNumber: true,
      issuedAt: true,
      revoked: true,
      ambassador: {
        select: {
          userId: true,
          journal: { select: { name: true } },
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!certificate) {
    return jsonError("Certificate not found.", 404);
  }

  if (certificate.revoked) {
    return jsonError("This certificate has been revoked.", 410);
  }

  const roles = Array.isArray(session.user.roles)
    ? (session.user.roles as SessionRole[])
    : [];

  if (
    !hasCertificateAccess({
      userId: session.user.id,
      certificateOwnerId: certificate.ambassador.userId,
      roles,
    })
  ) {
    return jsonError("You do not have access to this certificate.", 403);
  }

  const pdfBytes = await generateAmbassadorCertificate({
    certificateNumber: certificate.certificateNumber,
    title: certificate.title,
    recipientName: certificate.ambassador.user.name,
    journalName: certificate.ambassador.journal.name,
    issuedAt: certificate.issuedAt,
    verificationUrl: `${getAppUrl()}/verify-certificate/${certificate.certificateNumber}`,
  });

  const fileName = sanitiseFileName(`certificate-${certificate.certificateNumber}.pdf`);

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdfBytes.byteLength),
    },
  });
}
