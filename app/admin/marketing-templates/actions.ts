"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { uploadJournalFile } from "@/lib/storage/blob";
import type { MarketingAssetType } from "@/lib/generated/prisma";

const VALID_ASSET_TYPES: MarketingAssetType[] = [
  "WHATSAPP_FLYER",
  "FACEBOOK_FLYER",
  "LINKEDIN_BANNER",
  "INSTAGRAM_SQUARE",
  "TWITTER_BANNER",
  "A4_POSTER",
  "QR_POSTER",
  "BUSINESS_CARD",
];

export async function uploadMarketingTemplate(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const assetType = String(formData.get("assetType") || "").trim() as MarketingAssetType;
  const defaultCaption = String(formData.get("defaultCaption") || "").trim();

  if (!VALID_ASSET_TYPES.includes(assetType)) {
    throw new Error("Select a valid asset type.");
  }

  const file = formData.get("background");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Upload a background image.");
  }

  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, tenantId: true },
  });

  if (!journal) {
    throw new Error("No active journal was found.");
  }

  const uploaded = await uploadJournalFile({
    file,
    category: "MARKETING_TEMPLATE",
    metadata: {
      journalId: journal.id,
      tenantId: journal.tenantId,
      category: "MARKETING_TEMPLATE",
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.marketingTemplate.updateMany({
      where: { journalId: journal.id, assetType, isActive: true },
      data: { isActive: false },
    });

    const created = await tx.marketingTemplate.create({
      data: {
        journalId: journal.id,
        assetType,
        backgroundImageUrl: uploaded.url,
        defaultCaption: defaultCaption || null,
        isActive: true,
        createdById: admin.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "CREATE",
        entity: "MarketingTemplate",
        entityId: created.id,
        metadata: { event: "MARKETING_TEMPLATE_UPLOADED", assetType },
      },
    });
  });

  revalidatePath("/admin/marketing-templates");
  revalidatePath("/reviewer/marketing");
}
