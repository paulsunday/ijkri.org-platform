import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { updateRewardSettings } from "./actions";

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

      <form
        action={updateRewardSettings}
        className="mt-8 max-w-xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="journalId" value={journal.id} />

        <div>
          <label htmlFor="reviewReward" className="mb-1 block font-medium">
            Review Reward
          </label>

          <input
            id="reviewReward"
            name="reviewReward"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings?.reviewReward.toString() ?? "0"}
            className="w-full rounded-lg border p-3"
          />

          <p className="mt-1 text-sm text-slate-500">
            Paid to any reviewer each time they submit a review report.
          </p>
        </div>

        <div>
          <label htmlFor="submissionReward" className="mb-1 block font-medium">
            Submission Reward
          </label>

          <input
            id="submissionReward"
            name="submissionReward"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings?.submissionReward.toString() ?? "0"}
            className="w-full rounded-lg border p-3"
          />

          <p className="mt-1 text-sm text-slate-500">
            Paid to the referring reviewer when a referred author submits a
            manuscript.
          </p>
        </div>

        <div>
          <label htmlFor="publicationReward" className="mb-1 block font-medium">
            Publication Reward
          </label>

          <input
            id="publicationReward"
            name="publicationReward"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings?.publicationReward.toString() ?? "0"}
            className="w-full rounded-lg border p-3"
          />

          <p className="mt-1 text-sm text-slate-500">
            Paid to the referring reviewer when a referred manuscript is
            published.
          </p>
        </div>

        <div>
          <label htmlFor="referralBonus" className="mb-1 block font-medium">
            Referral Bonus
          </label>

          <input
            id="referralBonus"
            name="referralBonus"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings?.referralBonus.toString() ?? "0"}
            className="w-full rounded-lg border p-3"
          />

          <p className="mt-1 text-sm text-slate-500">
            Paid to the referring reviewer when a new author registers using
            their referral link.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
        >
          Save Reward Settings
        </button>
      </form>
    </div>
  );
}
