"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

import {
  adjustEarnings,
  suspendAmbassador,
  reactivateAmbassador,
  regenerateReferralCode,
  issueManualCertificate,
} from "./actions";

function ActionBanner({ state }: { state: FormActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`mb-3 rounded-lg p-3 text-sm ${
        state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

export function AdjustEarningsForm({
  ambassadorId,
  currency,
}: {
  ambassadorId: string;
  currency: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    adjustEarnings,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="ambassadorId" value={ambassadorId} />

      <ActionBanner state={state} />

      <div>
        <label htmlFor="amount" className="mb-1 block text-sm font-medium">
          Amount ({currency}, use negative to deduct)
        </label>

        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          required
          disabled={pending}
          className="w-full rounded-lg border p-2"
        />
      </div>

      <div>
        <label htmlFor="reason" className="mb-1 block text-sm font-medium">
          Reason
        </label>

        <textarea
          id="reason"
          name="reason"
          required
          rows={3}
          disabled={pending}
          className="w-full rounded-lg border p-2"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {pending ? "Applying…" : "Apply Adjustment"}
      </button>
    </form>
  );
}

type AmbassadorForStatus = {
  id: string;
  status: string;
  suspendedReason: string | null;
};

export function AmbassadorStatusForm({
  ambassador,
}: {
  ambassador: AmbassadorForStatus;
}) {
  const router = useRouter();
  const [suspendState, suspendAction, suspendPending] = useActionState(
    suspendAmbassador,
    IDLE_FORM_ACTION_STATE,
  );
  const [reactivateState, reactivateAction, reactivatePending] =
    useActionState(reactivateAmbassador, IDLE_FORM_ACTION_STATE);

  useEffect(() => {
    if (suspendState.success || reactivateState.success) {
      router.refresh();
    }
  }, [suspendState.success, reactivateState.success, router]);

  if (ambassador.status === "ACTIVE") {
    return (
      <form action={suspendAction} className="mt-4 space-y-3">
        <input type="hidden" name="ambassadorId" value={ambassador.id} />

        <ActionBanner state={suspendState} />

        <textarea
          name="reason"
          required
          rows={3}
          placeholder="Reason for suspension"
          disabled={suspendPending}
          className="w-full rounded-lg border p-2"
        />

        <button
          type="submit"
          disabled={suspendPending}
          className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          {suspendPending ? "Suspending…" : "Suspend Ambassador"}
        </button>
      </form>
    );
  }

  return (
    <form action={reactivateAction} className="mt-4">
      <input type="hidden" name="ambassadorId" value={ambassador.id} />

      <ActionBanner state={reactivateState} />

      {ambassador.suspendedReason && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {ambassador.suspendedReason}
        </p>
      )}

      <button
        type="submit"
        disabled={reactivatePending}
        className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        {reactivatePending ? "Reactivating…" : "Reactivate Ambassador"}
      </button>
    </form>
  );
}

export function RegenerateCodeForm({ ambassadorId }: { ambassadorId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    regenerateReferralCode,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="ambassadorId" value={ambassadorId} />

      <ActionBanner state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
      >
        {pending ? "Regenerating…" : "Regenerate Code"}
      </button>
    </form>
  );
}

export function IssueCertificateForm({ ambassadorId }: { ambassadorId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    issueManualCertificate,
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
      className="mt-4 flex flex-wrap items-end gap-4"
    >
      <input type="hidden" name="ambassadorId" value={ambassadorId} />

      <div className="w-full">
        <ActionBanner state={state} />
      </div>

      <div>
        <label htmlFor="type" className="mb-1 block text-sm font-medium">
          Certificate
        </label>

        <select
          id="type"
          name="type"
          required
          disabled={pending}
          className="rounded-lg border p-2"
        >
          <option value="OUTSTANDING_REVIEWER">Outstanding Reviewer</option>
          <option value="TOP_REVIEWER">Top Reviewer</option>
          <option value="TOP_AMBASSADOR">Top Ambassador</option>
        </select>
      </div>

      <div>
        <label htmlFor="periodLabel" className="mb-1 block text-sm font-medium">
          Period (optional, e.g. 2026)
        </label>

        <input
          id="periodLabel"
          name="periodLabel"
          type="text"
          disabled={pending}
          className="rounded-lg border p-2"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {pending ? "Issuing…" : "Issue Certificate"}
      </button>
    </form>
  );
}
