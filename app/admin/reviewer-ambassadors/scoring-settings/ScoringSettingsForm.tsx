"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

import { updateScoringSettings } from "./actions";

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

type WeightField = { key: string; label: string; defaultValue: number };

export function ScoringSettingsForm({
  journalId,
  weightFields,
  settings,
}: {
  journalId: string;
  weightFields: WeightField[];
  settings: Record<string, number> | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateScoringSettings,
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
      className="mt-8 max-w-xl space-y-4 rounded-xl border bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="journalId" value={journalId} />

      <ActionBanner state={state} />

      {weightFields.map((field) => (
        <div key={field.key}>
          <label htmlFor={field.key} className="mb-1 block font-medium">
            {field.label}
          </label>

          <input
            id={field.key}
            name={field.key}
            type="number"
            min="0"
            max="100"
            required
            defaultValue={settings ? settings[field.key] : field.defaultValue}
            disabled={pending}
            className="w-full rounded-lg border p-3"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
      >
        {pending ? "Saving…" : "Save Weights"}
      </button>
    </form>
  );
}
