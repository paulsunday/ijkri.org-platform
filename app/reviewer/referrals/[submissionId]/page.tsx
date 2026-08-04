import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";

type Props = {
  params: Promise<{ submissionId: string }>;
};

const TIMELINE_STAGES = [
  "REGISTERED",
  "SUBMITTED",
  "DESK_REVIEW",
  "PEER_REVIEW",
  "REVISION_REQUIRED",
  "ACCEPTED",
  "PUBLISHED",
  "REJECTED",
] as const;

function formatStage(stage: string) {
  return stage
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function ReferralSubmissionTimelinePage({
  params,
}: Props) {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const { submissionId } = await params;

  /*
   * Confidentiality: this select intentionally excludes abstract, files,
   * review content, and decision comments. A referring reviewer may
   * monitor progress but must never access confidential review material.
   */
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, referrerReviewerId: reviewer.id },
    select: {
      id: true,
      title: true,
      status: true,
      submittedAt: true,
    },
  });

  if (!submission) {
    notFound();
  }

  const events = await prisma.referralEvent.findMany({
    where: { reviewerId: reviewer.id, submissionId },
    orderBy: { occurredAt: "asc" },
  });

  const reachedStages = new Set(events.map((event) => event.stage));

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-6">
          <Link
            href="/reviewer/referrals"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Back to Referral Centre
          </Link>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{submission.title}</h1>

            <p className="mt-2 text-slate-600">
              Current status: <strong>{formatStage(submission.status)}</strong>
            </p>

            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              You referred this manuscript&apos;s author. To protect editorial
              confidentiality, review reports, files, and decision comments
              are not visible here — only the manuscript&apos;s progress.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Referral Status Timeline</h2>

            <ol className="mt-6 space-y-4">
              {TIMELINE_STAGES.map((stage) => {
                const reached = reachedStages.has(stage);
                const event = events.find((entry) => entry.stage === stage);

                return (
                  <li
                    key={stage}
                    className={`flex items-center gap-4 rounded-lg border p-4 ${
                      reached
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        reached
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {reached ? "✓" : ""}
                    </span>

                    <div>
                      <p className="font-semibold">{formatStage(stage)}</p>

                      {event && (
                        <p className="text-sm text-slate-500">
                          {event.occurredAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </main>
      </div>
    </section>
  );
}
