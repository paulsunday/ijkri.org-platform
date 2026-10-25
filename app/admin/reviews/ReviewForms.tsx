"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

import {
  cancelReviewerAssignment,
  sendReviewerReminder,
} from "./actions";

function ActionErrorBanner({ state }: { state: FormActionState }) {
  if (state.success || !state.message) return null;

  return (
    <div
      role="alert"
      className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800"
    >
      {state.message}
    </div>
  );
}

export function SendReviewerReminderForm({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    sendReviewerReminder,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="assignmentId"
        value={assignmentId}
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send Reminder"}
      </button>

      <ActionErrorBanner state={state} />
    </form>
  );
}

export function CancelReviewerAssignmentForm({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    cancelReviewerAssignment,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="assignmentId"
        value={assignmentId}
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove Assignment"}
      </button>

      <ActionErrorBanner state={state} />
    </form>
  );
}
