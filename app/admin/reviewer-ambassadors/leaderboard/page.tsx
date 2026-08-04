import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { getLeaderboard } from "@/lib/ambassador/leaderboard";
import { LEVEL_LABELS } from "@/lib/ambassador/levels";

type Props = {
  searchParams: Promise<{ year?: string }>;
};

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function AdminLeaderboardPage({ searchParams }: Props) {
  await requireAnyRole(ADMIN_ROLES);

  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : undefined;

  const leaderboard = await getLeaderboard(
    year && Number.isFinite(year) ? year : undefined,
  );

  return (
    <div className="p-6">
      <Link
        href="/admin/reviewer-ambassadors"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to Reviewer Ambassadors
      </Link>

      <h1 className="mt-4 text-3xl font-bold">Leaderboard</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Institution</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Reviews Completed</th>
              <th className="px-4 py-3">Published Referrals</th>
              <th className="px-4 py-3">Total Earnings</th>
              <th className="px-4 py-3">Level</th>
            </tr>
          </thead>

          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.userId} className="border-b last:border-0">
                <td className="px-4 py-3 font-semibold">{index + 1}</td>
                <td className="px-4 py-3">{entry.name}</td>
                <td className="px-4 py-3">{entry.affiliation || "—"}</td>
                <td className="px-4 py-3">{entry.country || "—"}</td>
                <td className="px-4 py-3">{entry.reviewsCompleted}</td>
                <td className="px-4 py-3">{entry.publishedReferrals}</td>
                <td className="px-4 py-3">{formatMoney(entry.totalEarnings)}</td>
                <td className="px-4 py-3">{LEVEL_LABELS[entry.level]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
