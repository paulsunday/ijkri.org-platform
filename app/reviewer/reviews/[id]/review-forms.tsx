"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  acceptReview,
  declineReview,
  submitReview,
  type ReviewActionState,
} from "./actions";

const IDLE_STATE: ReviewActionState = { success: false, message: "" };

function ActionErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      {message}
    </div>
  );
}

export function InvitationResponseForms({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const router = useRouter();

  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptReview,
    IDLE_STATE,
  );

  const [declineState, declineAction, declinePending] = useActionState(
    declineReview,
    IDLE_STATE,
  );

  useEffect(() => {
    if (acceptState.success || declineState.success) {
      router.refresh();
    }
  }, [acceptState.success, declineState.success, router]);

  const errorMessage = !acceptState.success && acceptState.message
    ? acceptState.message
    : !declineState.success && declineState.message
      ? declineState.message
      : null;

  const pending = acceptPending || declinePending;

  return (
    <>
      {errorMessage && <ActionErrorBanner message={errorMessage} />}

      <div className="flex flex-wrap gap-4">
        <form action={acceptAction}>
          <input type="hidden" name="assignmentId" value={assignmentId} />

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {acceptPending ? "Accepting..." : "Accept Review"}
          </button>
        </form>

        <form action={declineAction}>
          <input type="hidden" name="assignmentId" value={assignmentId} />

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {declinePending ? "Declining..." : "Decline Review"}
          </button>
        </form>
      </div>
    </>
  );
}

export function SubmitReviewForm({
  assignmentId,
  reviewRound,
}: {
  assignmentId: string;
  reviewRound: number;
}) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    submitReview,
    IDLE_STATE,
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
      className="mt-8 space-y-8"
    >
      <input type="hidden" name="assignmentId" value={assignmentId} />

      {!state.success && state.message && (
        <ActionErrorBanner message={state.message} />
      )}

      <div>
        <label htmlFor="score" className="mb-2 block font-semibold">
          Overall Score (1–10)
        </label>

        <input
          id="score"
          type="number"
          name="score"
          min={1}
          max={10}
          step={1}
          required
          disabled={pending}
          className="w-40 rounded-lg border p-3 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="recommendation" className="mb-2 block font-semibold">
          Recommendation
        </label>

        <select
          id="recommendation"
          name="recommendation"
          required
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-60"
        >
          <option value="" disabled>
            Select recommendation
          </option>
          <option value="ACCEPT">Accept</option>
          <option value="MINOR_REVISION">Minor Revision</option>
          <option value="MAJOR_REVISION">Major Revision</option>
          <option value="REJECT">Reject</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="commentsToAuthor"
          className="mb-2 block font-semibold"
        >
          Comments to the Author
        </label>

        <textarea
          id="commentsToAuthor"
          name="commentsToAuthor"
          rows={10}
          required
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-60"
          placeholder="Provide constructive comments that may be shared with the author."
        />
      </div>

      <div>
        <label
          htmlFor="commentsToEditor"
          className="mb-2 block font-semibold"
        >
          Confidential Comments to the Editor
        </label>

        <textarea
          id="commentsToEditor"
          name="commentsToEditor"
          rows={7}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-60"
          placeholder="Optional confidential comments for the editor."
        />
      </div>

      <div>
        <label htmlFor="attachments" className="mb-2 block font-semibold">
          Reviewer Attachments (Optional)
        </label>

        <input
          id="attachments"
          name="attachments"
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          disabled={pending}
          className="block w-full rounded-lg border p-3 disabled:opacity-60"
        />

        <p className="mt-2 text-sm text-gray-500">
          Upload annotated manuscripts or any supporting review documents.
          Maximum 5 files.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-700 px-8 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Submitting..." : `Submit Round ${reviewRound} Review`}
      </button>
    </form>
  );
}
