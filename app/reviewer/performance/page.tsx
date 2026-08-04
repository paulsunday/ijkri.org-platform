import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";
import { getPerformanceView } from "@/lib/scoring/get-performance-view";
import { GRADE_LABELS } from "@/lib/scoring/grades";
import { BreakdownChart, ScoreHistoryChart } from "@/components/scoring/performance-charts";

const FACTOR_LABELS: Record<string, string> = {
  reviewQuality: "Review quality",
  completionTime: "Completion speed",
  editorialRating: "Recent editorial ratings",
  completedReviews: "Volume of reviews",
  invitationAcceptance: "Invitation acceptance",
  referralPublication: "Referral publication rate",
  latePenalty: "On-time delivery",
  recommendationAccuracy: "Recommendation accuracy",
  withdrawalPenalty: "Assignment reliability",
};

const TREND_ARROW: Record<string, string> = { UP: "↑", DOWN: "↓", STABLE: "→" };
const TREND_COLOR: Record<string, string> = {
  UP: "text-emerald-700",
  DOWN: "text-red-700",
  STABLE: "text-slate-500",
};

export default async function ReviewerPerformancePage() {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { id: true },
  });

  const view = ambassador ? await getPerformanceView(ambassador.id) : null;

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Performance Score</h1>
            <p className="mt-2 text-slate-600">
              Your reviewer performance is visible only to you, editors, and
              the journal administrator.
            </p>
          </div>

          {!view ? (
            <div className="rounded-xl border bg-white p-8 shadow-sm text-slate-600">
              Your ambassador profile has not been set up yet.
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Overall Score
                    </p>
                    <p className="mt-1 text-5xl font-bold text-slate-950">
                      {view.score.overallScore}
                      <span className="text-2xl text-slate-400">/100</span>
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-500">Grade</p>
                    <p className="mt-1 text-4xl font-bold text-amber-600">
                      {GRADE_LABELS[view.score.grade]}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-500">Trend</p>
                    <p className={`mt-1 text-4xl font-bold ${TREND_COLOR[view.score.trend]}`}>
                      {TREND_ARROW[view.score.trend]}
                    </p>
                  </div>
                </div>

                {view.isLive && (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    This score is calculated live — it will be saved once you
                    have completed reviews, ratings, or referral outcomes.
                  </p>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Factor Breakdown</h2>
                  <div className="mt-4">
                    <BreakdownChart
                      data={Object.entries(view.score.breakdown).map(([key, factor]) => ({
                        label: FACTOR_LABELS[key] ?? key,
                        score: factor.normalizedScore,
                      }))}
                    />
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Score History</h2>
                  <div className="mt-4">
                    {view.history.length > 1 ? (
                      <ScoreHistoryChart data={view.history} />
                    ) : (
                      <p className="text-slate-500">
                        Not enough history yet to chart a trend.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-emerald-700">Strengths</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {view.score.strengths.length === 0 && (
                      <li className="list-none text-slate-500">Not enough data yet.</li>
                    )}
                    {view.score.strengths.map((strength) => (
                      <li key={strength}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-amber-700">
                    Areas for Improvement
                  </h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {view.score.improvements.length === 0 && (
                      <li className="list-none text-slate-500">
                        No specific weaknesses flagged.
                      </li>
                    )}
                    {view.score.improvements.map((improvement) => (
                      <li key={improvement}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  );
}
