import Link from "next/link";

import { getLeaderboard } from "@/lib/ambassador/leaderboard";
import { LEVEL_LABELS } from "@/lib/ambassador/levels";

type Props = {
  searchParams: Promise<{ year?: string }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default async function LeaderboardPage({ searchParams }: Props) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : undefined;

  const leaderboard = await getLeaderboard(
    year && Number.isFinite(year) ? year : undefined,
  );

  return (
    <main className="bg-slate-50">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
            Reviewer Ambassador Programme
          </p>

          <h1 className="mt-4 text-4xl font-bold">Leaderboard</h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Recognizing reviewers who complete reviews and refer authors who
            go on to publish with us.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href="/leaderboard"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              !year
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            All time
          </Link>

          {YEAR_OPTIONS.map((yearOption) => (
            <Link
              key={yearOption}
              href={`/leaderboard?year=${yearOption}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                year === yearOption
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {yearOption}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No leaderboard data is available yet.
                  </td>
                </tr>
              )}

              {leaderboard.map((entry, index) => (
                <tr key={entry.userId} className="border-b last:border-0">
                  <td className="px-4 py-3 font-semibold">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">{entry.name}</td>
                  <td className="px-4 py-3">{entry.affiliation || "—"}</td>
                  <td className="px-4 py-3">{entry.country || "—"}</td>
                  <td className="px-4 py-3">{entry.reviewsCompleted}</td>
                  <td className="px-4 py-3">{entry.publishedReferrals}</td>
                  <td className="px-4 py-3">{formatMoney(entry.totalEarnings)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      {LEVEL_LABELS[entry.level]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
