"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

import { updateRewardSettings } from "./actions";

function ActionBanner({ state }: { state: FormActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`rounded-lg p-3 text-sm ${
        state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

type RewardSettingsValues = {
  reviewReward: string;
  submissionReward: string;
  publicationReward: string;
  referralBonus: string;
};

export function RewardSettingsForm({
  journalId,
  values,
}: {
  journalId: string;
  values: RewardSettingsValues;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateRewardSettings,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="mt-8 max-w-xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="journalId" value={journalId} />

      <ActionBanner state={state} />

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
          defaultValue={values.reviewReward}
          disabled={pending}
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
          defaultValue={values.submissionReward}
          disabled={pending}
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
          defaultValue={values.publicationReward}
          disabled={pending}
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
          defaultValue={values.referralBonus}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />

        <p className="mt-1 text-sm text-slate-500">
          Paid to the referring reviewer when a new author registers using
          their referral link.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
      >
        {pending ? "Saving…" : "Save Reward Settings"}
      </button>
    </form>
  );
}
