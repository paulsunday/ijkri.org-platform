import { NextRequest } from "next/server";

import { requireActionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { generateFlyerImage } from "@/lib/marketing/generate-flyer";
import { IMAGE_ASSET_DIMENSIONS } from "@/lib/marketing/dimensions";
import type { MarketingAssetType } from "@/lib/generated/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ assetType: string }>;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const reviewer = await requireActionUser();
  const { assetType } = await context.params;

  if (!(assetType in IMAGE_ASSET_DIMENSIONS)) {
    return Response.json({ error: "Unsupported asset type." }, { status: 400 });
  }

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { referralCode: true, journalId: true, user: { select: { name: true } } },
  });

  if (!ambassador) {
    return Response.json({ error: "Ambassador profile not found." }, { status: 404 });
  }

  const template = await prisma.marketingTemplate.findFirst({
    where: {
      journalId: ambassador.journalId,
      assetType: assetType as MarketingAssetType,
      isActive: true,
    },
  });

  if (!template) {
    return Response.json(
      { error: "This asset is not available yet — the administrator has not uploaded a template." },
      { status: 404 },
    );
  }

  const image = await generateFlyerImage({
    assetType: assetType as MarketingAssetType,
    reviewerName: ambassador.user.name,
    referralCode: ambassador.referralCode,
    referralLink: `${getAppUrl()}/author/submit?ref=${ambassador.referralCode}`,
    backgroundImageUrl: template.backgroundImageUrl,
  });

  return image;
}
