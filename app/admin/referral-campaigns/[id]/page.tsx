import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import { updateCampaign } from "../actions";
import { CampaignForm } from "../campaign-form";

type Props = {
  params: Promise<{ id: string }>;
};

function formatMoney(value: string | number | { toString(): string }) {
  return `$${Number(value.toString()).toFixed(2)}`;
}

export default async function ReferralCampaignDetailPage({ params }: Props) {
  await requireRole("SUPER_ADMIN");

  const { id } = await params;

  const campaign = await prisma.referralCampaign.findUnique({
    where: { id },
    include: {
      rewards: {
        orderBy: { appliedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  return (
    <div className="p-6">
      <Link
        href="/admin/referral-campaigns"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to Referral Campaigns
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          {campaign.status}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Spent Budget</p>
          <p className="mt-2 text-2xl font-bold">
            {formatMoney(campaign.spentBudget)}
            {campaign.maxBudget ? ` / ${formatMoney(campaign.maxBudget)}` : ""}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Bonuses Paid</p>
          <p className="mt-2 text-2xl font-bold">{campaign.rewards.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Window</p>
          <p className="mt-2 text-sm font-semibold">
            {campaign.startDate.toLocaleDateString()} —{" "}
            {campaign.endDate.toLocaleDateString()}
          </p>
        </div>
      </div>

      <CampaignForm
        action={updateCampaign}
        campaignId={campaign.id}
        submitLabel="Save Changes"
        values={{
          name: campaign.name,
          description: campaign.description,
          rewardMultiplier: campaign.rewardMultiplier.toString(),
          reviewBonus: campaign.reviewBonus.toString(),
          submissionBonus: campaign.submissionBonus.toString(),
          publicationBonus: campaign.publicationBonus.toString(),
          referralBonus: campaign.referralBonus.toString(),
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          targetDiscipline: campaign.targetDiscipline,
          targetCountry: campaign.targetCountry,
          targetInstitution: campaign.targetInstitution,
          maxBudget: campaign.maxBudget?.toString() ?? null,
          bannerImageUrl: campaign.bannerImageUrl,
        }}
      />

      <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Recent Bonus Payouts</h2>

        <div className="mt-4 space-y-2">
          {campaign.rewards.length === 0 && (
            <p className="text-slate-500">No bonuses paid out yet.</p>
          )}

          {campaign.rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex items-center justify-between rounded-lg border bg-slate-50 p-3 text-sm"
            >
              <span>{reward.appliedAt.toLocaleString()}</span>
              <span className="font-semibold">{formatMoney(reward.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
