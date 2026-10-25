"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createVolume,
  deleteVolume,
  toggleVolumePublished,
  updateVolume,
} from "./actions";
import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

function ActionBanner({ state }: { state: FormActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`rounded-lg p-3 text-sm md:col-span-2 ${
        state.success
          ? "bg-green-50 text-green-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

type Journal = {
  id: string;
  name: string;
};

export function CreateVolumeForm({ journals }: { journals: Journal[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createVolume,
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
      className="mt-6 grid gap-5 md:grid-cols-2"
    >
      <ActionBanner state={state} />

      <div className="md:col-span-2">
        <label
          htmlFor="journalId"
          className="mb-2 block font-semibold"
        >
          Journal
        </label>

        <select
          id="journalId"
          name="journalId"
          required
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-3"
        >
          <option value="" disabled>
            Select journal
          </option>

          {journals.map((journal) => (
            <option
              key={journal.id}
              value={journal.id}
            >
              {journal.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="number"
          className="mb-2 block font-semibold"
        >
          Volume Number
        </label>

        <input
          id="number"
          name="number"
          type="number"
          min={1}
          required
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <label
          htmlFor="year"
          className="mb-2 block font-semibold"
        >
          Year
        </label>

        <input
          id="year"
          name="year"
          type="number"
          min={1900}
          max={2200}
          required
          defaultValue={new Date().getFullYear()}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div className="md:col-span-2">
        <label
          htmlFor="title"
          className="mb-2 block font-semibold"
        >
          Title
        </label>

        <input
          id="title"
          name="title"
          disabled={pending}
          className="w-full rounded-lg border p-3"
          placeholder="Optional volume title"
        />
      </div>

      <div className="md:col-span-2">
        <label
          htmlFor="description"
          className="mb-2 block font-semibold"
        >
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={5}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Volume"}
        </button>
      </div>
    </form>
  );
}

type VolumeForEdit = {
  id: string;
  number: number;
  year: number;
  title: string | null;
  description: string | null;
};

export function UpdateVolumeForm({ volume }: { volume: VolumeForEdit }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateVolume,
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
      className="mt-6 grid gap-4 md:grid-cols-2"
    >
      <input
        type="hidden"
        name="volumeId"
        value={volume.id}
      />

      <ActionBanner state={state} />

      <div>
        <label
          htmlFor={`number-${volume.id}`}
          className="mb-2 block text-sm font-semibold"
        >
          Volume Number
        </label>

        <input
          id={`number-${volume.id}`}
          name="number"
          type="number"
          min={1}
          required
          defaultValue={volume.number}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <label
          htmlFor={`year-${volume.id}`}
          className="mb-2 block text-sm font-semibold"
        >
          Year
        </label>

        <input
          id={`year-${volume.id}`}
          name="year"
          type="number"
          min={1900}
          max={2200}
          required
          defaultValue={volume.year}
          disabled={pending}
          className="w-full rounded-lg border p-3"
        />
      </div>

      <input
        name="title"
        defaultValue={volume.title || ""}
        placeholder="Volume title"
        disabled={pending}
        className="rounded-lg border p-3"
      />

      <textarea
        name="description"
        defaultValue={volume.description || ""}
        rows={3}
        placeholder="Description"
        disabled={pending}
        className="rounded-lg border p-3"
      />

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-800 px-5 py-3 font-semibold text-white hover:bg-black disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

type VolumeForActions = {
  id: string;
  isPublished: boolean;
  articleCount: number;
};

export function VolumeActionButtons({ volume }: { volume: VolumeForActions }) {
  const router = useRouter();

  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleVolumePublished,
    IDLE_FORM_ACTION_STATE,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteVolume,
    IDLE_FORM_ACTION_STATE,
  );

  const anyPending = togglePending || deletePending;

  const anySucceeded = toggleState.success || deleteState.success;

  useEffect(() => {
    if (anySucceeded) {
      router.refresh();
    }
  }, [anySucceeded, router]);

  const errorMessage = [toggleState, deleteState].find(
    (state) => !state.success && state.message,
  )?.message;

  return (
    <div className="mt-6 space-y-3">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <form action={toggleAction}>
          <input
            type="hidden"
            name="volumeId"
            value={volume.id}
          />

          <button
            type="submit"
            disabled={anyPending}
            className={`rounded-lg px-5 py-3 font-semibold text-white disabled:opacity-50 ${
              volume.isPublished
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {togglePending
              ? volume.isPublished
                ? "Unpublishing…"
                : "Publishing…"
              : volume.isPublished
                ? "Unpublish Volume"
                : "Publish Volume"}
          </button>
        </form>

        <Link
          href="/admin/issues"
          className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Manage Issues
        </Link>

        {volume.articleCount === 0 && (
          <form action={deleteAction}>
            <input
              type="hidden"
              name="volumeId"
              value={volume.id}
            />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {deletePending ? "Deleting…" : "Delete Volume"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
