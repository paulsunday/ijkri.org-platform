import Link from "next/link";
import QRCode from "qrcode";

import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";
import { LEVEL_LABELS } from "@/lib/ambassador/levels";
import { getAmbassadorRank } from "@/lib/ambassador/leaderboard";
import { getActiveCampaigns } from "@/lib/campaigns/get-active-campaigns";
import { CampaignBanners } from "@/components/reviewer/campaign-banner";
import { ShareButtons } from "./share-buttons";

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

const STATUS_BUCKETS: { label: string; statuses: string[] }[] = [
  {
    label: "Submitted",
    statuses: ["SUBMITTED"],
  },
  {
    label: "Under Review",
    statuses: [
      "UNDER_INITIAL_REVIEW",
      "UNDER_PEER_REVIEW",
      "REVISION_REQUIRED",
      "COPYEDITING",
      "TYPESETTING",
      "PROOFREADING",
      "AUTHOR_PROOF_APPROVAL",
      "READY_FOR_PUBLICATION",
    ],
  },
  { label: "Accepted", statuses: ["ACCEPTED"] },
  { label: "Published", statuses: ["PUBLISHED"] },
  { label: "Rejected", statuses: ["REJECTED"] },
];

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatActivity(event: {
  stage: string;
  occurredAt: Date;
  referredUser: { name: string } | null;
  submission: { title: string } | null;
}) {
  const stageLabel = event.stage
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  const subject = event.submission?.title || event.referredUser?.name || "";

  return `${stageLabel}${subject ? ` — ${subject}` : ""}`;
}

export default async function ReferralCentrePage() {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    include: {
      wallet: true,
    },
  });

  if (!ambassador) {
    return (
      <section className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
          <ReviewerNav />

          <main className="min-w-0 flex-1 rounded-xl border bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">Referral Centre</h1>

            <p className="mt-4 text-slate-600">
              Your ambassador profile has not been set up yet. Please contact
              the journal administrator.
            </p>
          </main>
        </div>
      </section>
    );
  }

  const appUrl = getAppUrl();
  const referralLink = `${appUrl}/register?ref=${ambassador.referralCode}`;
  const qrCodeDataUrl = await QRCode.toDataURL(referralLink, { width: 220 });

  const [
    statusCounts,
    totalReferrals,
    referralEarnings,
    reviewEarnings,
    rank,
    recentActivity,
  ] = await Promise.all([
    prisma.submission.groupBy({
      by: ["status"],
      where: { referrerReviewerId: reviewer.id },
      _count: { _all: true },
    }),

    prisma.user.count({
      where: { referredByReviewerId: reviewer.id },
    }),

    ambassador.wallet
      ? prisma.walletTransaction.aggregate({
        where: {
          walletId: ambassador.wallet.id,
          direction: "CREDIT",
          type: { in: ["SUBMISSION_REWARD", "PUBLICATION_REWARD", "REFERRAL_BONUS"] },
        },
        _sum: { amount: true },
      })
      : null,

    ambassador.wallet
      ? prisma.walletTransaction.aggregate({
        where: {
          walletId: ambassador.wallet.id,
          direction: "CREDIT",
          type: "REVIEW_REWARD",
        },
        _sum: { amount: true },
      })
      : null,

    getAmbassadorRank(reviewer.id),

    prisma.referralEvent.findMany({
      where: { reviewerId: reviewer.id },
      orderBy: { occurredAt: "desc" },
      take: 10,
      include: {
        referredUser: { select: { name: true } },
        submission: { select: { title: true } },
      },
    }),
  ]);

  const countByStatus = new Map<string, number>(
    statusCounts.map((row) => [row.status, row._count._all]),
  );

  const currency = ambassador.wallet?.currency ?? "USD";
  const activeCampaigns = await getActiveCampaigns(ambassador.journalId);

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Referral Centre</h1>
            <p className="mt-2 text-slate-600">
              Share your referral link and track everyone who registers or
              submits through it.
            </p>
          </div>

          {activeCampaigns.length > 0 && <CampaignBanners campaigns={activeCampaigns} />}

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-500">
                  Your referral code
                </p>

                <p className="mt-1 font-mono text-2xl font-bold text-slate-950">
                  {ambassador.referralCode}
                </p>

                <p className="mt-4 text-sm font-semibold text-slate-500">
                  Your referral link
                </p>

                <p className="mt-1 break-all rounded-lg bg-slate-50 p-3 font-mono text-sm text-slate-700">
                  {referralLink}
                </p>

                <div className="mt-5">
                  <ShareButtons referralLink={referralLink} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                    {LEVEL_LABELS[ambassador.level]}
                  </span>

                  <Link
                    href="/reviewer/referrals/profile-settings"
                    className="text-sm font-semibold text-blue-700 hover:underline"
                  >
                    {ambassador.isPublicProfileEnabled
                      ? "Manage public profile"
                      : "Enable public profile"}
                  </Link>

                  {ambassador.isPublicProfileEnabled && ambassador.slug && (
                    <Link
                      href={`/ambassador/${ambassador.slug}`}
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      View public profile
                    </Link>
                  )}
                </div>
              </div>

              <div className="shrink-0 rounded-lg border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeDataUrl}
                  alt="QR code for your referral link"
                  width={180}
                  height={180}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Total Referrals" value={totalReferrals} />

            {STATUS_BUCKETS.map((bucket) => (
              <StatTile
                key={bucket.label}
                label={bucket.label}
                value={bucket.statuses.reduce(
                  (sum, status) => sum + (countByStatus.get(status) ?? 0),
                  0,
                )}
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatTile
              label="Referral Earnings"
              value={formatMoney(
                Number(referralEarnings?._sum.amount ?? 0),
                currency,
              )}
            />

            <StatTile
              label="Review Earnings"
              value={formatMoney(
                Number(reviewEarnings?._sum.amount ?? 0),
                currency,
              )}
            />

            <StatTile
              label="Total Earnings"
              value={formatMoney(
                Number(ambassador.wallet?.lifetimeEarnings ?? 0),
                currency,
              )}
            />

            <StatTile
              label="Leaderboard Position"
              value={rank ? `#${rank}` : "Unranked"}
            />
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Recent Referral Activity</h2>

            <div className="mt-4 space-y-3">
              {recentActivity.length === 0 && (
                <p className="text-slate-500">No referral activity yet.</p>
              )}

              {recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-slate-50 p-3 text-sm"
                >
                  <span>{formatActivity(event)}</span>

                  <span className="text-slate-500">
                    {event.occurredAt.toLocaleDateString()}
                  </span>

                  {event.submissionId && (
                    <Link
                      href={`/reviewer/referrals/${event.submissionId}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
