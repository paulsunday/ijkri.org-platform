import Link from "next/link";

import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
  activateCampaign,
  pauseCampaign,
  resumeCampaign,
  archiveCampaign,
  duplicateCampaign,
  deleteCampaign,
} from "./actions";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-slate-200 text-slate-500",
};

function formatMoney(value: string | number | { toString(): string }) {
  return `$${Number(value.toString()).toFixed(2)}`;
}

export default async function ReferralCampaignsPage({ searchParams }: Props) {
  await requireRole("SUPER_ADMIN");

  const { status } = await searchParams;

  const campaigns = await prisma.referralCampaign.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Referral Campaigns</h1>
          <p className="mt-2 text-slate-600">
            Super Admin only. Configure bonus multipliers and targeting for
            time-boxed referral promotions.
          </p>
        </div>

        <Link
          href="/admin/referral-campaigns/new"
          className="rounded-lg bg-amber-500 px-5 py-3 font-bold text-slate-950 hover:bg-amber-400"
        >
          Create Campaign
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {["", "DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"].map((option) => (
          <Link
            key={option || "all"}
            href={option ? `?status=${option}` : "?"}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              (status || "") === option
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {option || "All"}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {campaigns.length === 0 && (
          <p className="text-slate-500">No campaigns found.</p>
        )}

        {campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/referral-campaigns/${campaign.id}`}
                    className="text-lg font-semibold text-blue-700 hover:underline"
                  >
                    {campaign.name}
                  </Link>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[campaign.status]}`}
                  >
                    {campaign.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-600">
                  {campaign.startDate.toLocaleDateString()} —{" "}
                  {campaign.endDate.toLocaleDateString()}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Multiplier ×{Number(campaign.rewardMultiplier).toFixed(2)} · Spent{" "}
                  {formatMoney(campaign.spentBudget)}
                  {campaign.maxBudget ? ` / ${formatMoney(campaign.maxBudget)}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {campaign.status === "DRAFT" && (
                  <form action={activateCampaign}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                      Activate
                    </button>
                  </form>
                )}

                {campaign.status === "ACTIVE" && (
                  <form action={pauseCampaign}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="rounded-lg bg-yellow-600 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-700">
                      Pause
                    </button>
                  </form>
                )}

                {campaign.status === "PAUSED" && (
                  <form action={resumeCampaign}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                      Resume
                    </button>
                  </form>
                )}

                {campaign.status !== "ARCHIVED" && (
                  <form action={archiveCampaign}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                      Archive
                    </button>
                  </form>
                )}

                <form action={duplicateCampaign}>
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <button className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                    Duplicate
                  </button>
                </form>

                {campaign.status === "DRAFT" && (
                  <form action={deleteCampaign}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <button className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
