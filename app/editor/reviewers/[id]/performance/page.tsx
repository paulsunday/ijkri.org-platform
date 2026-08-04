import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { getPerformanceView } from "@/lib/scoring/get-performance-view";
import { GRADE_LABELS } from "@/lib/scoring/grades";
import { BreakdownChart, ScoreHistoryChart } from "@/components/scoring/performance-charts";

type Props = {
  params: Promise<{ id: string }>;
};

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

export default async function EditorReviewerPerformancePage({ params }: Props) {
  await requireAnyRole(EDITORIAL_ROLES);

  const { id } = await params;

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: id },
    select: { id: true, user: { select: { name: true, email: true } } },
  });

  if (!ambassador) {
    notFound();
  }

  const view = await getPerformanceView(ambassador.id);

  if (!view) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/editor/submissions"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back
      </Link>

      <h1 className="mt-4 text-3xl font-bold">
        {ambassador.user.name}&apos;s Performance
      </h1>
      <p className="text-slate-600">{ambassador.user.email}</p>

      <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <p className="text-sm font-semibold text-slate-500">Overall Score</p>
            <p className="mt-1 text-4xl font-bold">{view.score.overallScore}/100</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500">Grade</p>
            <p className="mt-1 text-4xl font-bold text-amber-600">
              {GRADE_LABELS[view.score.grade]}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
              <p className="text-slate-500">Not enough history yet.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
