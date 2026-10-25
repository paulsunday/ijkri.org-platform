"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { IDLE_FORM_ACTION_STATE } from "@/lib/forms/run-form-action";

import { approveWithdrawal, rejectWithdrawal } from "./actions";

export function WithdrawalReviewActions({
  withdrawalId,
}: {
  withdrawalId: string;
}) {
  const router = useRouter();

  const [approveState, approveAction, approvePending] = useActionState(
    approveWithdrawal,
    IDLE_FORM_ACTION_STATE,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectWithdrawal,
    IDLE_FORM_ACTION_STATE,
  );

  const anyPending = approvePending || rejectPending;
  const anySucceeded = approveState.success || rejectState.success;

  useEffect(() => {
    if (anySucceeded) {
      router.refresh();
    }
  }, [anySucceeded, router]);

  const errorMessage = [approveState, rejectState].find(
    (state) => !state.success && state.message,
  )?.message;

  return (
    <div className="flex flex-col gap-2">
      {errorMessage && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <form action={approveAction}>
        <input type="hidden" name="withdrawalId" value={withdrawalId} />
        <button
          type="submit"
          disabled={anyPending}
          className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {approvePending ? "Approving…" : "Approve & Pay"}
        </button>
      </form>

      <form action={rejectAction} className="flex flex-col gap-2">
        <input type="hidden" name="withdrawalId" value={withdrawalId} />
        <input
          name="reviewNotes"
          placeholder="Rejection reason"
          required
          disabled={anyPending}
          className="rounded-lg border p-2 text-sm"
        />
        <button
          type="submit"
          disabled={anyPending}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {rejectPending ? "Rejecting…" : "Reject"}
        </button>
      </form>
    </div>
  );
}
