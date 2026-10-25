"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { overrideConflict } from "./actions";
import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

function ActionBanner({ state }: { state: FormActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`rounded-lg p-2 text-xs ${
        state.success
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

export function OverrideConflictForm({
  conflictId,
}: {
  conflictId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    overrideConflict,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="conflictId" value={conflictId} />

      <ActionBanner state={state} />

      <input
        name="overrideReason"
        placeholder="Override reason"
        required
        disabled={pending}
        className="rounded-lg border p-2 text-sm disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Overriding…" : "Override"}
      </button>
    </form>
  );
}
