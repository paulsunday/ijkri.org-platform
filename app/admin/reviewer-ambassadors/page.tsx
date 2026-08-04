import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/ambassador/levels";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{ status?: string; level?: string; page?: string }>;
};

function formatMoney(value: string | number, currency: string) {
  const numericValue = Number(value);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(numericValue);
  } catch {
    return `${currency} ${numericValue.toFixed(0)}`;
  }
}

export default async function AdminReviewerAmbassadorsPage({
  searchParams,
}: Props) {
  await requireAnyRole(ADMIN_ROLES);

  const { status, level, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    ...(status ? { status: status as "ACTIVE" | "SUSPENDED" } : {}),
    ...(level
      ? { level: level as "NONE" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" }
      : {}),
  };

  const [ambassadors, total] = await Promise.all([
    prisma.reviewerAmbassador.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        wallet: { select: { currentBalance: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),

    prisma.reviewerAmbassador.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reviewer Ambassadors</h1>
          <p className="mt-2 text-slate-600">
            Manage referral codes, earnings, and ambassador status.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/reviewer-ambassadors/settings"
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Reward Settings
          </Link>

          <Link
            href="/admin/reviewer-ambassadors/withdrawals"
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Withdrawals
          </Link>

          <Link
            href="/admin/reviewer-ambassadors/leaderboard"
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Leaderboard
          </Link>

          <Link
            href="/admin/reviewer-ambassadors/analytics"
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Analytics
          </Link>

          <Link
            href="/admin/reviewer-ambassadors/export"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {["", "ACTIVE", "SUSPENDED"].map((option) => (
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

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Referral Code</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Published Referrals</th>
              <th className="px-4 py-3">Wallet Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody>
            {ambassadors.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No ambassadors found.
                </td>
              </tr>
            )}

            {ambassadors.map((ambassador) => (
              <tr key={ambassador.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{ambassador.user.name}</p>
                  <p className="text-slate-500">{ambassador.user.email}</p>
                </td>
                <td className="px-4 py-3 font-mono">{ambassador.referralCode}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                    {LEVEL_LABELS[ambassador.level]}
                  </span>
                </td>
                <td className="px-4 py-3">{ambassador.publishedReferralCount}</td>
                <td className="px-4 py-3">
                  {ambassador.wallet
                    ? formatMoney(
                      ambassador.wallet.currentBalance.toString(),
                      ambassador.wallet.currency,
                    )
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      ambassador.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {ambassador.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/reviewer-ambassadors/${ambassador.id}`}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`?page=${page - 1}`}
              className="font-semibold text-blue-700 hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`?page=${page + 1}`}
              className="font-semibold text-blue-700 hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
