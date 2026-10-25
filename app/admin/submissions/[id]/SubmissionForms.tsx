"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  addSubmissionAuthor,
  assignEditor,
  type SubmissionActionState,
} from "./actions";

const IDLE_STATE: SubmissionActionState = { success: false, message: "" };

function ActionBanner({ state }: { state: SubmissionActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`mb-4 rounded-lg p-3 text-sm ${
        state.success
          ? "bg-green-50 text-green-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

export function AssignEditorForm({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    assignEditor,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-6">
      <ActionBanner state={state} />

      <input
        type="hidden"
        name="submissionId"
        value={submissionId}
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
      >
        {pending
          ? "Assigning…"
          : "Assign Editor / Start Initial Review"}
      </button>
    </form>
  );
}

export function AddSubmissionAuthorForm({
  submissionId,
  countries,
}: {
  submissionId: string;
  countries: readonly string[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    addSubmissionAuthor,
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
      className="mt-5 grid gap-4 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <ActionBanner state={state} />
      </div>

      <input
        type="hidden"
        name="submissionId"
        value={submissionId}
      />

      <div>
        <label
          htmlFor="fullName"
          className="mb-1 block text-sm font-medium"
        >
          Full name
        </label>

        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          disabled={pending}
          className="w-full rounded-lg border p-2 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          disabled={pending}
          className="w-full rounded-lg border p-2 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="affiliation"
          className="mb-1 block text-sm font-medium"
        >
          Affiliation
        </label>

        <input
          id="affiliation"
          name="affiliation"
          type="text"
          disabled={pending}
          className="w-full rounded-lg border p-2 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="department"
          className="mb-1 block text-sm font-medium"
        >
          Department
        </label>

        <input
          id="department"
          name="department"
          type="text"
          disabled={pending}
          className="w-full rounded-lg border p-2 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="country"
          className="mb-1 block text-sm font-medium"
        >
          Country
        </label>

        <select
          id="country"
          name="country"
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-2 disabled:opacity-50"
        >
          <option value="">Select country</option>

          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="orcid"
          className="mb-1 block text-sm font-medium"
        >
          ORCID
        </label>

        <input
          id="orcid"
          name="orcid"
          type="text"
          placeholder="0000-0000-0000-0000"
          disabled={pending}
          className="w-full rounded-lg border p-2 disabled:opacity-50"
        />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add Author"}
        </button>
      </div>
    </form>
  );
}
