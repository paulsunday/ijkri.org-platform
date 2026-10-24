"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  clearCurrentIssue,
  createIssue,
  deleteIssue,
  publishIssue,
  setCurrentIssue,
  unpublishIssue,
  updateIssue,
  type IssueActionState,
} from "./actions";

const IDLE_STATE: IssueActionState = { success: false, message: "" };

function ActionBanner({ state }: { state: IssueActionState }) {
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

type Volume = {
  id: string;
  number: number;
  year: number;
  journal: { shortName: string };
};

export function CreateIssueForm({ volumes }: { volumes: Volume[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createIssue,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-6 grid gap-5 md:grid-cols-2">
      <ActionBanner state={state} />

      <div className="md:col-span-2">
        <label htmlFor="volumeId" className="mb-2 block font-semibold">
          Volume
        </label>

        <select
          id="volumeId"
          name="volumeId"
          required
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        >
          <option value="" disabled>
            Select volume
          </option>

          {volumes.map((volume) => (
            <option key={volume.id} value={volume.id}>
              {volume.journal.shortName} — Volume {volume.number} (
              {volume.year})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="number" className="mb-2 block font-semibold">
          Issue Number
        </label>

        <input
          id="number"
          name="number"
          type="number"
          min={1}
          required
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="title" className="mb-2 block font-semibold">
          Issue Title
        </label>

        <input
          id="title"
          name="title"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
          placeholder="Optional issue title"
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="description" className="mb-2 block font-semibold">
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={5}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="editorial" className="mb-2 block font-semibold">
          Editorial or Editor&apos;s Note
        </label>

        <textarea
          id="editorial"
          name="editorial"
          rows={7}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
          placeholder="Write the editor's introduction or note for this issue."
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="coverImageFile" className="mb-2 block font-semibold">
          Cover Image
        </label>

        <input
          id="coverImageFile"
          name="coverImageFile"
          type="file"
          accept="image/png,image/jpeg"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />

        <p className="mt-2 text-sm text-gray-500">
          PNG or JPEG, up to 5 MB. Or paste an already-hosted image URL
          below instead.
        </p>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="coverImage" className="mb-2 block font-semibold">
          Cover Image URL
        </label>

        <input
          id="coverImage"
          name="coverImage"
          type="url"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
          placeholder="https://..."
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="fullIssuePdf" className="mb-2 block font-semibold">
          Complete Issue PDF URL
        </label>

        <input
          id="fullIssuePdf"
          name="fullIssuePdf"
          type="url"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
          placeholder="https://example.com/complete-issue.pdf"
        />

        <p className="mt-2 text-sm text-gray-500">
          Enter the URL of the PDF containing all articles in this issue.
        </p>
      </div>

      <div>
        <label htmlFor="publishedAt" className="mb-2 block font-semibold">
          Planned Publication Date
        </label>

        <input
          id="publishedAt"
          name="publishedAt"
          type="date"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Issue"}
        </button>
      </div>
    </form>
  );
}

type IssueForEdit = {
  id: string;
  slug: string | null;
  title: string | null;
  coverImage: string | null;
  fullIssuePdf: string | null;
  description: string | null;
  editorial: string | null;
  publishedAtInput: string;
};

export function UpdateIssueForm({ issue }: { issue: IssueForEdit }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateIssue,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="issueId" value={issue.id} />

      <ActionBanner state={state} />

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-semibold">
          Issue Slug
        </label>

        <input
          name="slug"
          required
          defaultValue={issue.slug || ""}
          disabled={pending}
          className="w-full rounded-lg border p-3 font-mono disabled:opacity-50"
          placeholder="journal-volume-1-issue-1-2026"
        />

        <p className="mt-2 text-xs text-gray-500">
          Use lowercase words separated by hyphens. This becomes the
          public issue URL.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Title</label>

        <input
          name="title"
          defaultValue={issue.title || ""}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Replace Cover Image
        </label>

        <input
          name="coverImageFile"
          type="file"
          accept="image/png,image/jpeg"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />

        <p className="mt-2 text-xs text-gray-500">
          PNG or JPEG, up to 5 MB. Uploading a file replaces the URL
          below.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Cover Image URL
        </label>

        <input
          name="coverImage"
          type="url"
          defaultValue={issue.coverImage || ""}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Complete Issue PDF URL
        </label>

        <input
          name="fullIssuePdf"
          type="url"
          defaultValue={issue.fullIssuePdf || ""}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
          placeholder="https://example.com/complete-issue.pdf"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Publication Date
        </label>

        <input
          name="publishedAt"
          type="date"
          defaultValue={issue.publishedAtInput}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-semibold">
          Description
        </label>

        <textarea
          name="description"
          rows={4}
          defaultValue={issue.description || ""}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-semibold">
          Editorial or Editor&apos;s Note
        </label>

        <textarea
          name="editorial"
          rows={7}
          defaultValue={issue.editorial || ""}
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

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

type IssueForActions = {
  id: string;
  isPublished: boolean;
  isCurrent: boolean;
  articleCount: number;
};

export function IssueActionButtons({ issue }: { issue: IssueForActions }) {
  const router = useRouter();

  const [publishState, publishAction, publishPending] = useActionState(
    publishIssue,
    IDLE_STATE,
  );
  const [unpublishState, unpublishAction, unpublishPending] =
    useActionState(unpublishIssue, IDLE_STATE);
  const [setCurrentState, setCurrentAction, setCurrentPending] =
    useActionState(setCurrentIssue, IDLE_STATE);
  const [clearCurrentState, clearCurrentAction, clearCurrentPending] =
    useActionState(clearCurrentIssue, IDLE_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteIssue,
    IDLE_STATE,
  );

  const anyPending =
    publishPending ||
    unpublishPending ||
    setCurrentPending ||
    clearCurrentPending ||
    deletePending;

  const anySucceeded =
    publishState.success ||
    unpublishState.success ||
    setCurrentState.success ||
    clearCurrentState.success ||
    deleteState.success;

  useEffect(() => {
    if (anySucceeded) {
      router.refresh();
    }
  }, [anySucceeded, router]);

  const errorMessage = [
    publishState,
    unpublishState,
    setCurrentState,
    clearCurrentState,
    deleteState,
  ].find((state) => !state.success && state.message)?.message;

  return (
    <div className="mt-6 space-y-3">
      {errorMessage && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!issue.isPublished ? (
          <form action={publishAction}>
            <input type="hidden" name="issueId" value={issue.id} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {publishPending ? "Publishing…" : "Publish Issue"}
            </button>
          </form>
        ) : (
          <form action={unpublishAction}>
            <input type="hidden" name="issueId" value={issue.id} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {unpublishPending ? "Unpublishing…" : "Unpublish Issue"}
            </button>
          </form>
        )}

        {issue.isPublished && !issue.isCurrent && (
          <form action={setCurrentAction}>
            <input type="hidden" name="issueId" value={issue.id} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {setCurrentPending ? "Setting…" : "Set as Current Issue"}
            </button>
          </form>
        )}

        {issue.isCurrent && (
          <form action={clearCurrentAction}>
            <input type="hidden" name="issueId" value={issue.id} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {clearCurrentPending ? "Clearing…" : "Clear Current Issue"}
            </button>
          </form>
        )}

        <Link
          href="/admin/articles"
          className="rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
        >
          View Articles
        </Link>

        {issue.articleCount === 0 && (
          <form action={deleteAction}>
            <input type="hidden" name="issueId" value={issue.id} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {deletePending ? "Deleting…" : "Delete Issue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
