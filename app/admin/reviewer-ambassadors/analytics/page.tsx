import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import {
  getMonthlyReferrals,
  getMonthlyPublications,
  getReferralConversionRate,
  getTopAmbassadors,
  getTopInstitutions,
  getReferralRevenue,
  getAverageReviewCompletionTimeHours,
} from "@/lib/ambassador/analytics-queries";

import {
  MonthlyTrendChart,
  TopAmbassadorsChart,
  TopInstitutionsChart,
} from "./charts";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function AmbassadorAnalyticsPage() {
  await requireAnyRole(ADMIN_ROLES);

  const [
    monthlyReferrals,
    monthlyPublications,
    conversion,
    topAmbassadors,
    topInstitutions,
    revenue,
    averageReviewHours,
  ] = await Promise.all([
    getMonthlyReferrals(12),
    getMonthlyPublications(12),
    getReferralConversionRate(),
    getTopAmbassadors(10),
    getTopInstitutions(10),
    getReferralRevenue(),
    getAverageReviewCompletionTimeHours(),
  ]);

  return (
    <div className="p-6">
      <Link
        href="/admin/reviewer-ambassadors"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to Reviewer Ambassadors
      </Link>

      <h1 className="mt-4 text-3xl font-bold">Analytics</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Conversion Rate
          </p>
          <p className="mt-2 text-2xl font-bold">
            {(conversion.rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500">
            {conversion.published} published of {conversion.registered} registered
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Revenue from Referrals
          </p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(revenue)}</p>
          <p className="text-xs text-slate-500">APC payments on referred, published manuscripts</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Avg. Review Completion Time
          </p>
          <p className="mt-2 text-2xl font-bold">
            {averageReviewHours === null
              ? "—"
              : `${(averageReviewHours / 24).toFixed(1)} days`}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Top Institution
          </p>
          <p className="mt-2 text-2xl font-bold">
            {topInstitutions[0]?.institution ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Monthly Referrals</h2>
          <div className="mt-4">
            <MonthlyTrendChart data={monthlyReferrals} label="Referrals" color="#0f172a" />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Monthly Publications</h2>
          <div className="mt-4">
            <MonthlyTrendChart
              data={monthlyPublications}
              label="Publications"
              color="#059669"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Top Ambassadors</h2>
          <div className="mt-4">
            <TopAmbassadorsChart data={topAmbassadors} />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Top Institutions</h2>
          <div className="mt-4">
            <TopInstitutionsChart data={topInstitutions} />
          </div>
        </div>
      </div>
    </div>
  );
}
