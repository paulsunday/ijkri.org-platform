import Link from "next/link";

import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import { ScoringSettingsForm } from "./ScoringSettingsForm";

const WEIGHT_FIELDS: { key: string; label: string; defaultValue: number }[] = [
  { key: "reviewQualityWeight", label: "Review Quality Score", defaultValue: 20 },
  { key: "completionTimeWeight", label: "Average Review Completion Time", defaultValue: 15 },
  { key: "editorialRatingWeight", label: "Editorial Rating (recency-weighted)", defaultValue: 15 },
  { key: "completedReviewsWeight", label: "Number of Completed Reviews", defaultValue: 10 },
  { key: "invitationAcceptanceWeight", label: "Acceptance of Editorial Invitations", defaultValue: 10 },
  { key: "referralPublicationWeight", label: "Referral Publication Rate", defaultValue: 10 },
  { key: "latePenaltyWeight", label: "On-Time Delivery (fewer late reviews)", defaultValue: 10 },
  { key: "recommendationAccuracyWeight", label: "Recommendation Accuracy", defaultValue: 5 },
  { key: "withdrawalPenaltyWeight", label: "Assignment Reliability (withdrawal rate)", defaultValue: 5 },
];

export default async function ScoringSettingsPage() {
  await requireRole("SUPER_ADMIN");

  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!journal) {
    return (
      <div className="p-6">
        <p className="text-slate-600">No active journal was found.</p>
      </div>
    );
  }

  const settings = await prisma.reviewerScoringSettings.findUnique({
    where: { journalId: journal.id },
  });

  return (
    <div className="p-6">
      <Link
        href="/admin/reviewer-ambassadors"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to Reviewer Ambassadors
      </Link>

      <h1 className="mt-4 text-3xl font-bold">Reviewer Performance Scoring Weights</h1>

      <p className="mt-2 text-slate-600">
        The 9 factors below must sum to exactly 100. Only Super Admin can
        change these.
      </p>

      <ScoringSettingsForm
        journalId={journal.id}
        weightFields={WEIGHT_FIELDS}
        settings={settings as unknown as Record<string, number> | null}
      />
    </div>
  );
}
