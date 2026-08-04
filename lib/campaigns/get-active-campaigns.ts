import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export type ActiveCampaignSummary = {
  id: string;
  name: string;
  description: string | null;
  bannerImageUrl: string | null;
  endDate: string;
};

async function computeActiveCampaigns(journalId: string): Promise<ActiveCampaignSummary[]> {
  const now = new Date();

  const campaigns = await prisma.referralCampaign.findMany({
    where: {
      journalId,
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, bannerImageUrl: true, endDate: true },
  });

  return campaigns.map((campaign) => ({
    ...campaign,
    endDate: campaign.endDate.toISOString(),
  }));
}

export async function getActiveCampaigns(journalId: string): Promise<ActiveCampaignSummary[]> {
  const cached = unstable_cache(
    () => computeActiveCampaigns(journalId),
    ["active-campaigns", journalId],
    { revalidate: 300, tags: ["campaigns"] },
  );

  return cached();
}
