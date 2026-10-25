import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { RewardSettingsForm } from "./RewardSettingsForm";

export default async function AmbassadorRewardSettingsPage() {
  await requireAnyRole(ADMIN_ROLES);

  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, currency: true },
  });

  if (!journal) {
    return (
      <div className="p-6">
        <p className="text-slate-600">No active journal was found.</p>
      </div>
    );
  }

  const settings = await prisma.ambassadorRewardSetting.findUnique({
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

      <h1 className="mt-4 text-3xl font-bold">Reward Settings</h1>

      <p className="mt-2 text-slate-600">
        Configure how much reviewers earn for each action. Amounts are in{" "}
        {journal.currency}. Leaving an amount at 0 disables that reward.
      </p>

      <RewardSettingsForm
        journalId={journal.id}
        values={{
          reviewReward: settings?.reviewReward.toString() ?? "0",
          submissionReward: settings?.submissionReward.toString() ?? "0",
          publicationReward: settings?.publicationReward.toString() ?? "0",
          referralBonus: settings?.referralBonus.toString() ?? "0",
        }}
      />
    </div>
  );
}
