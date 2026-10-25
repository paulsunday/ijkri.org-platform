"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  markDoiFailed,
  markDoiRegistered,
  resetDoiToPending,
  submitDoiRegistration,
} from "./actions";
import { IDLE_FORM_ACTION_STATE } from "@/lib/forms/run-form-action";

type RecordForActions = {
  id: string;
  status: string;
  hasArticle: boolean;
};

export function DoiRecordActions({
  record,
  currentManagerId,
}: {
  record: RecordForActions;
  currentManagerId: string;
}) {
  const router = useRouter();

  const [submitState, submitAction, submitPending] = useActionState(
    submitDoiRegistration,
    IDLE_FORM_ACTION_STATE,
  );
  const [registeredState, registeredAction, registeredPending] =
    useActionState(markDoiRegistered, IDLE_FORM_ACTION_STATE);
  const [resetState, resetAction, resetPending] = useActionState(
    resetDoiToPending,
    IDLE_FORM_ACTION_STATE,
  );
  const [failedState, failedAction, failedPending] = useActionState(
    markDoiFailed,
    IDLE_FORM_ACTION_STATE,
  );

  const anyPending =
    submitPending || registeredPending || resetPending || failedPending;

  const anySucceeded =
    submitState.success ||
    registeredState.success ||
    resetState.success ||
    failedState.success;

  useEffect(() => {
    if (anySucceeded) {
      router.refresh();
    }
  }, [anySucceeded, router]);

  const errorMessage = [
    submitState,
    registeredState,
    resetState,
    failedState,
  ].find((state) => !state.success && state.message)?.message;

  return (
    <>
      {errorMessage && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4">
        {record.hasArticle && record.status !== "REGISTERED" && (
          <form action={submitAction}>
            <input type="hidden" name="doiRecordId" value={record.id} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitPending ? "Submitting…" : "Submit to Crossref"}
            </button>
          </form>
        )}

        {record.status !== "REGISTERED" && (
          <form action={registeredAction}>
            <input type="hidden" name="doiRecordId" value={record.id} />

            <input type="hidden" name="userId" value={currentManagerId} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {registeredPending ? "Marking…" : "Mark Registered Manually"}
            </button>
          </form>
        )}

        {record.status !== "PENDING" && (
          <form action={resetAction}>
            <input type="hidden" name="doiRecordId" value={record.id} />

            <input type="hidden" name="userId" value={currentManagerId} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {resetPending ? "Resetting…" : "Reset to Pending"}
            </button>
          </form>
        )}
      </div>

      {record.status !== "REGISTERED" && (
        <form
          action={failedAction}
          className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5"
        >
          <input type="hidden" name="doiRecordId" value={record.id} />

          <input type="hidden" name="userId" value={currentManagerId} />

          <label
            htmlFor={`failureReason-${record.id}`}
            className="mb-2 block font-semibold text-red-900"
          >
            Registration Failure
          </label>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              id={`failureReason-${record.id}`}
              name="failureReason"
              type="text"
              required
              disabled={anyPending}
              placeholder="Describe the registration error..."
              className="flex-1 rounded-lg border p-3 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {failedPending ? "Marking…" : "Mark Failed"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
