import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";
import { getCommissionHistory, type CommissionFilter } from "@/lib/ambassador/commission-history";

type Props = {
  searchParams: Promise<{ filter?: string; search?: string; page?: string }>;
};

function formatType(value: string | null) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const FILTERS: CommissionFilter[] = ["PENDING", "PAID", "PUBLISHED", "REJECTED"];

export default async function CommissionHistoryPage({ searchParams }: Props) {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const { filter, search, page: pageParam } = await searchParams;

  const { rows, page, totalPages } = await getCommissionHistory({
    reviewerId: reviewer.id,
    filter: filter as CommissionFilter | undefined,
    search,
    page: Number(pageParam) || 1,
  });

  const queryString = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { filter, search, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  };

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">Referral Earnings</h1>
              <p className="mt-2 text-slate-600">
                Every manuscript referred through your link and its reward status.
              </p>
            </div>

            <Link
              href={`/reviewer/referrals/commissions/export?${queryString({})}`}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Export CSV
            </Link>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <form className="flex flex-wrap items-center gap-3" method="get">
              {filter && <input type="hidden" name="filter" value={filter} />}
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search manuscript title..."
                className="rounded-lg border p-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Search
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/reviewer/referrals/commissions?${queryString({ filter: undefined, page: undefined })}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  !filter ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                All
              </Link>

              {FILTERS.map((option) => (
                <Link
                  key={option}
                  href={`/reviewer/referrals/commissions?${queryString({ filter: option, page: undefined })}`}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    filter === option ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {formatType(option)}
                </Link>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600">
                  <th className="px-4 py-3">Manuscript</th>
                  <th className="px-4 py-3">Referral Date</th>
                  <th className="px-4 py-3">Editorial Status</th>
                  <th className="px-4 py-3">Reward Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Date Paid</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No referred manuscripts found.
                    </td>
                  </tr>
                )}

                {rows.map((row) => (
                  <tr key={row.submissionId} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.manuscriptTitle}</td>
                    <td className="px-4 py-3">
                      {row.referralDate ? row.referralDate.toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">{formatType(row.editorialStatus)}</td>
                    <td className="px-4 py-3">{formatType(row.rewardType)}</td>
                    <td className="px-4 py-3">
                      {row.rewardAmount ? `$${Number(row.rewardAmount).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          row.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.datePaid ? row.datePaid.toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link
                  href={`/reviewer/referrals/commissions?${queryString({ page: String(page - 1) })}`}
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
                  href={`/reviewer/referrals/commissions?${queryString({ page: String(page + 1) })}`}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
