"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

type CampaignFormValues = {
  name?: string;
  description?: string | null;
  rewardMultiplier?: string | number;
  reviewBonus?: string | number;
  submissionBonus?: string | number;
  publicationBonus?: string | number;
  referralBonus?: string | number;
  startDate?: Date | string;
  endDate?: Date | string;
  targetDiscipline?: string | null;
  targetCountry?: string | null;
  targetInstitution?: string | null;
  maxBudget?: string | number | null;
  bannerImageUrl?: string | null;
};

function toDateInputValue(value: Date | string | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

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

export function CampaignForm({
  action,
  campaignId,
  values,
  submitLabel,
}: {
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  campaignId?: string;
  values?: CampaignFormValues;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    action,
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
      encType="multipart/form-data"
      className="mt-6 max-w-2xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      {campaignId && <input type="hidden" name="campaignId" value={campaignId} />}

      <ActionBanner state={state} />

      <div>
        <label htmlFor="name" className="mb-1 block font-medium">
          Campaign Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={values?.name}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="mb-1 block font-medium">
            Start Date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={toDateInputValue(values?.startDate)}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="mb-1 block font-medium">
            End Date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={toDateInputValue(values?.endDate)}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>
      </div>

      <div>
        <label htmlFor="rewardMultiplier" className="mb-1 block font-medium">
          Reward Multiplier
        </label>
        <input
          id="rewardMultiplier"
          name="rewardMultiplier"
          type="number"
          step="0.1"
          min="1"
          defaultValue={values?.rewardMultiplier?.toString() ?? "1"}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
        <p className="mt-1 text-sm text-slate-500">
          Applied on top of the base reward, e.g. 1.5 = 50% more.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="reviewBonus" className="mb-1 block font-medium">
            Review Bonus (USD)
          </label>
          <input
            id="reviewBonus"
            name="reviewBonus"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values?.reviewBonus?.toString() ?? "0"}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="submissionBonus" className="mb-1 block font-medium">
            Submission Bonus (USD)
          </label>
          <input
            id="submissionBonus"
            name="submissionBonus"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values?.submissionBonus?.toString() ?? "0"}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="publicationBonus" className="mb-1 block font-medium">
            Publication Bonus (USD)
          </label>
          <input
            id="publicationBonus"
            name="publicationBonus"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values?.publicationBonus?.toString() ?? "0"}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="referralBonus" className="mb-1 block font-medium">
            Referral Bonus (USD)
          </label>
          <input
            id="referralBonus"
            name="referralBonus"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values?.referralBonus?.toString() ?? "0"}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="targetDiscipline" className="mb-1 block font-medium">
            Target Discipline
          </label>
          <input
            id="targetDiscipline"
            name="targetDiscipline"
            type="text"
            placeholder="e.g. Research Article"
            defaultValue={values?.targetDiscipline ?? ""}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="targetCountry" className="mb-1 block font-medium">
            Target Country
          </label>
          <input
            id="targetCountry"
            name="targetCountry"
            type="text"
            defaultValue={values?.targetCountry ?? ""}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label htmlFor="targetInstitution" className="mb-1 block font-medium">
            Target Institution
          </label>
          <input
            id="targetInstitution"
            name="targetInstitution"
            type="text"
            defaultValue={values?.targetInstitution ?? ""}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>
      </div>

      <div>
        <label htmlFor="maxBudget" className="mb-1 block font-medium">
          Maximum Budget (USD, optional)
        </label>
        <input
          id="maxBudget"
          name="maxBudget"
          type="number"
          step="0.01"
          min="0"
          defaultValue={values?.maxBudget?.toString() ?? ""}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <label htmlFor="banner" className="mb-1 block font-medium">
          Campaign Banner
        </label>

        {values?.bannerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={values.bannerImageUrl}
            alt="Current campaign banner"
            className="mb-3 h-32 rounded-lg border object-cover"
          />
        )}

        <input
          id="banner"
          name="banner"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
