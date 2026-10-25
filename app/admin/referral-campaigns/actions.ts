"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireActionRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { uploadJournalFile } from "@/lib/storage/blob";
import {
  runFormAction,
  type FormActionState,
} from "@/lib/forms/run-form-action";

function parseDecimalField(formData: FormData, field: string, fallback = "0") {
  const value = Number(String(formData.get(field) || fallback).trim());

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }

  return value;
}

function parseOptionalString(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) || "").trim();
  return value || null;
}

async function getJournal() {
  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, tenantId: true },
  });

  if (!journal) {
    throw new Error("No active journal was found.");
  }

  return journal;
}

export async function createCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  let redirectTo: string | null = null;

  const result = await runFormAction(async () => {
    const admin = await requireActionRole("SUPER_ADMIN");
    const journal = await getJournal();

    const name = String(formData.get("name") || "").trim();

    if (!name) {
      throw new Error("Enter a campaign name.");
    }

    const startDateValue = String(formData.get("startDate") || "").trim();
    const endDateValue = String(formData.get("endDate") || "").trim();

    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error("Enter valid start and end dates.");
    }

    if (endDate <= startDate) {
      throw new Error("End date must be after the start date.");
    }

    const bannerFile = formData.get("banner");
    let bannerImageUrl: string | null = null;

    if (bannerFile instanceof File && bannerFile.size > 0) {
      const uploaded = await uploadJournalFile({
        file: bannerFile,
        category: "CAMPAIGN_BANNER",
        metadata: {
          journalId: journal.id,
          tenantId: journal.tenantId,
          category: "CAMPAIGN_BANNER",
        },
      });

      bannerImageUrl = uploaded.url;
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.referralCampaign.create({
        data: {
          journalId: journal.id,
          name,
          description: parseOptionalString(formData, "description"),
          rewardMultiplier: parseDecimalField(formData, "rewardMultiplier", "1"),
          reviewBonus: parseDecimalField(formData, "reviewBonus"),
          submissionBonus: parseDecimalField(formData, "submissionBonus"),
          publicationBonus: parseDecimalField(formData, "publicationBonus"),
          referralBonus: parseDecimalField(formData, "referralBonus"),
          startDate,
          endDate,
          targetDiscipline: parseOptionalString(formData, "targetDiscipline"),
          targetCountry: parseOptionalString(formData, "targetCountry"),
          targetInstitution: parseOptionalString(formData, "targetInstitution"),
          maxBudget: formData.get("maxBudget")
            ? parseDecimalField(formData, "maxBudget")
            : null,
          bannerImageUrl,
          status: "DRAFT",
          createdById: admin.id,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: admin.id,
          action: "CREATE",
          entity: "ReferralCampaign",
          entityId: created.id,
          metadata: { event: "CAMPAIGN_CREATED", name },
        },
      });

      return created;
    });

    revalidatePath("/admin/referral-campaigns");
    revalidateTag("campaigns", "minutes");
    redirectTo = `/admin/referral-campaigns/${campaign.id}`;

    return `Campaign "${name}" created.`;
  }, { action: "createCampaign" });

  if (redirectTo) {
    redirect(redirectTo);
  }

  return result;
}

export async function updateCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return runFormAction(async () => {
    const admin = await requireActionRole("SUPER_ADMIN");
    const journal = await getJournal();

    const campaignId = String(formData.get("campaignId") || "").trim();

    if (!campaignId) {
      throw new Error("Campaign ID is missing.");
    }

    const existing = await prisma.referralCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, bannerImageUrl: true },
    });

    if (!existing) {
      throw new Error("Campaign not found.");
    }

    const name = String(formData.get("name") || "").trim();

    if (!name) {
      throw new Error("Enter a campaign name.");
    }

    const startDate = new Date(String(formData.get("startDate") || ""));
    const endDate = new Date(String(formData.get("endDate") || ""));

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error("Enter valid start and end dates.");
    }

    if (endDate <= startDate) {
      throw new Error("End date must be after the start date.");
    }

    const bannerFile = formData.get("banner");
    let bannerImageUrl = existing.bannerImageUrl;

    if (bannerFile instanceof File && bannerFile.size > 0) {
      const uploaded = await uploadJournalFile({
        file: bannerFile,
        category: "CAMPAIGN_BANNER",
        metadata: {
          journalId: journal.id,
          tenantId: journal.tenantId,
          category: "CAMPAIGN_BANNER",
        },
      });

      bannerImageUrl = uploaded.url;
    }

    await prisma.$transaction([
      prisma.referralCampaign.update({
        where: { id: campaignId },
        data: {
          name,
          description: parseOptionalString(formData, "description"),
          rewardMultiplier: parseDecimalField(formData, "rewardMultiplier", "1"),
          reviewBonus: parseDecimalField(formData, "reviewBonus"),
          submissionBonus: parseDecimalField(formData, "submissionBonus"),
          publicationBonus: parseDecimalField(formData, "publicationBonus"),
          referralBonus: parseDecimalField(formData, "referralBonus"),
          startDate,
          endDate,
          targetDiscipline: parseOptionalString(formData, "targetDiscipline"),
          targetCountry: parseOptionalString(formData, "targetCountry"),
          targetInstitution: parseOptionalString(formData, "targetInstitution"),
          maxBudget: formData.get("maxBudget")
            ? parseDecimalField(formData, "maxBudget")
            : null,
          bannerImageUrl,
        },
      }),

      prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: "UPDATE",
          entity: "ReferralCampaign",
          entityId: campaignId,
          metadata: { event: "CAMPAIGN_UPDATED" },
        },
      }),
    ]);

    revalidatePath("/admin/referral-campaigns");
    revalidatePath(`/admin/referral-campaigns/${campaignId}`);
    revalidateTag("campaigns", "minutes");

    return "Campaign updated.";
  }, { action: "updateCampaign" });
}

export async function duplicateCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  let redirectTo: string | null = null;

  const result = await runFormAction(async () => {
    const admin = await requireActionRole("SUPER_ADMIN");

    const campaignId = String(formData.get("campaignId") || "").trim();

    const source = await prisma.referralCampaign.findUnique({ where: { id: campaignId } });

    if (!source) {
      throw new Error("Campaign not found.");
    }

    const duplicate = await prisma.$transaction(async (tx) => {
      const created = await tx.referralCampaign.create({
        data: {
          journalId: source.journalId,
          name: `${source.name} (Copy)`,
          description: source.description,
          rewardMultiplier: source.rewardMultiplier,
          reviewBonus: source.reviewBonus,
          submissionBonus: source.submissionBonus,
          publicationBonus: source.publicationBonus,
          referralBonus: source.referralBonus,
          startDate: source.startDate,
          endDate: source.endDate,
          targetDiscipline: source.targetDiscipline,
          targetCountry: source.targetCountry,
          targetInstitution: source.targetInstitution,
          maxBudget: source.maxBudget,
          bannerImageUrl: source.bannerImageUrl,
          status: "DRAFT",
          createdById: admin.id,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: admin.id,
          action: "CREATE",
          entity: "ReferralCampaign",
          entityId: created.id,
          metadata: { event: "CAMPAIGN_DUPLICATED", sourceCampaignId: campaignId },
        },
      });

      return created;
    });

    revalidatePath("/admin/referral-campaigns");
    redirectTo = `/admin/referral-campaigns/${duplicate.id}`;

    return "Campaign duplicated.";
  }, { action: "duplicateCampaign" });

  if (redirectTo) {
    redirect(redirectTo);
  }

  return result;
}

async function setCampaignStatus(
  campaignId: string,
  newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED",
  allowedFrom: string[],
  event: string,
) {
  const admin = await requireActionRole("SUPER_ADMIN");

  const campaign = await prisma.referralCampaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (!allowedFrom.includes(campaign.status)) {
    throw new Error(
      `This campaign cannot move to ${newStatus} from its current status (${campaign.status}).`,
    );
  }

  await prisma.$transaction([
    prisma.referralCampaign.update({
      where: { id: campaignId },
      data: { status: newStatus },
    }),

    prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "ReferralCampaign",
        entityId: campaignId,
        metadata: { event },
      },
    }),
  ]);

  revalidatePath("/admin/referral-campaigns");
  revalidateTag("campaigns", "minutes");
}

export async function activateCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return runFormAction(async () => {
    const campaignId = String(formData.get("campaignId") || "").trim();
    await setCampaignStatus(campaignId, "ACTIVE", ["DRAFT", "PAUSED"], "CAMPAIGN_ACTIVATED");

    return "Campaign activated.";
  }, { action: "activateCampaign" });
}

export async function pauseCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return runFormAction(async () => {
    const campaignId = String(formData.get("campaignId") || "").trim();
    await setCampaignStatus(campaignId, "PAUSED", ["ACTIVE"], "CAMPAIGN_PAUSED");

    return "Campaign paused.";
  }, { action: "pauseCampaign" });
}

export async function resumeCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return runFormAction(async () => {
    const campaignId = String(formData.get("campaignId") || "").trim();
    await setCampaignStatus(campaignId, "ACTIVE", ["PAUSED"], "CAMPAIGN_RESUMED");

    return "Campaign resumed.";
  }, { action: "resumeCampaign" });
}

export async function archiveCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return runFormAction(async () => {
    const campaignId = String(formData.get("campaignId") || "").trim();
    await setCampaignStatus(
      campaignId,
      "ARCHIVED",
      ["DRAFT", "ACTIVE", "PAUSED"],
      "CAMPAIGN_ARCHIVED",
    );

    return "Campaign archived.";
  }, { action: "archiveCampaign" });
}

export async function deleteCampaign(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  return runFormAction(async () => {
    const admin = await requireActionRole("SUPER_ADMIN");

    const campaignId = String(formData.get("campaignId") || "").trim();

    const campaign = await prisma.referralCampaign.findUnique({
      where: { id: campaignId },
      select: { status: true, name: true },
    });

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    if (campaign.status !== "DRAFT") {
      throw new Error(
        "Only a draft campaign can be deleted. Archive it instead to preserve its reward history.",
      );
    }

    await prisma.$transaction([
      prisma.referralCampaign.delete({ where: { id: campaignId } }),

      prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: "DELETE",
          entity: "ReferralCampaign",
          entityId: campaignId,
          metadata: { event: "CAMPAIGN_DELETED", name: campaign.name },
        },
      }),
    ]);

    revalidatePath("/admin/referral-campaigns");
    revalidateTag("campaigns", "minutes");

    return "Campaign deleted.";
  }, { action: "deleteCampaign" });
}
