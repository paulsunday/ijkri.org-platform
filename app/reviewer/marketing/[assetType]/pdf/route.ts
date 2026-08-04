import { NextRequest, NextResponse } from "next/server";

import { requireActionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { generatePosterPdf, type PosterInput } from "@/lib/marketing/generate-poster-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ assetType: string }>;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

const PDF_ASSET_TYPES: PosterInput["assetType"][] = ["A4_POSTER", "BUSINESS_CARD"];

export async function GET(_request: NextRequest, context: RouteContext) {
  const reviewer = await requireActionUser();
  const { assetType } = await context.params;

  if (!PDF_ASSET_TYPES.includes(assetType as PosterInput["assetType"])) {
    return NextResponse.json({ error: "Unsupported asset type." }, { status: 400 });
  }

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { referralCode: true, journalId: true, user: { select: { name: true } } },
  });

  if (!ambassador) {
    return NextResponse.json({ error: "Ambassador profile not found." }, { status: 404 });
  }

  const template = await prisma.marketingTemplate.findFirst({
    where: {
      journalId: ambassador.journalId,
      assetType: assetType as PosterInput["assetType"],
      isActive: true,
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: "This asset is not available yet — the administrator has not uploaded a template." },
      { status: 404 },
    );
  }

  const pdfBytes = await generatePosterPdf({
    assetType: assetType as PosterInput["assetType"],
    reviewerName: ambassador.user.name,
    referralCode: ambassador.referralCode,
    referralLink: `${getAppUrl()}/author/submit?ref=${ambassador.referralCode}`,
    backgroundImageUrl: template.backgroundImageUrl,
  });

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${assetType.toLowerCase()}.pdf"`,
    },
  });
}
