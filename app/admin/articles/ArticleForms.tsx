"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  changeArticleStatus,
  deleteArticle,
  updateArticle,
  updateCorrespondingAuthor,
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
      className={`rounded-lg p-3 text-sm ${
        state.success
          ? "bg-green-50 text-green-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

type IssueOption = {
  id: string;
  number: number;
  volume: { number: number; year: number };
};

type ArticleForUpdate = {
  id: string;
  title: string;
  abstract: string;
  issueId: string | null;
  publishedAtInput: string;
  doi: string | null;
  pdfUrl: string | null;
  issn: string | null;
  accessType: string;
};

export function UpdateArticleForm({
  article,
  compatibleIssues,
}: {
  article: ArticleForUpdate;
  compatibleIssues: IssueOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateArticle,
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
      className="mt-7 space-y-5 rounded-xl bg-gray-50 p-5"
    >
      <input type="hidden" name="articleId" value={article.id} />

      <ActionBanner state={state} />

      <div>
        <label
          htmlFor={`title-${article.id}`}
          className="mb-2 block font-semibold"
        >
          Article Title
        </label>

        <input
          id={`title-${article.id}`}
          name="title"
          required
          defaultValue={article.title}
          disabled={pending}
          className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor={`abstract-${article.id}`}
          className="mb-2 block font-semibold"
        >
          Abstract
        </label>

        <textarea
          id={`abstract-${article.id}`}
          name="abstract"
          required
          rows={8}
          defaultValue={article.abstract}
          disabled={pending}
          className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor={`issue-${article.id}`}
            className="mb-2 block font-semibold"
          >
            Volume / Issue
          </label>

          <select
            id={`issue-${article.id}`}
            name="issueId"
            defaultValue={article.issueId || ""}
            disabled={pending}
            className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
          >
            <option value="">No issue assigned</option>

            {compatibleIssues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                Volume {issue.volume.number} ({issue.volume.year}), Issue{" "}
                {issue.number}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`publishedAt-${article.id}`}
            className="mb-2 block font-semibold"
          >
            Publication Date
          </label>

          <input
            id={`publishedAt-${article.id}`}
            name="publishedAt"
            type="date"
            defaultValue={article.publishedAtInput}
            disabled={pending}
            className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor={`doi-${article.id}`}
            className="mb-2 block font-semibold"
          >
            DOI
          </label>

          <input
            id={`doi-${article.id}`}
            name="doi"
            defaultValue={article.doi || ""}
            placeholder="10.xxxx/xxxxx"
            disabled={pending}
            className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor={`pdfUrl-${article.id}`}
            className="mb-2 block font-semibold"
          >
            PDF URL
          </label>

          <input
            id={`pdfUrl-${article.id}`}
            name="pdfUrl"
            type="url"
            defaultValue={article.pdfUrl || ""}
            placeholder="https://..."
            disabled={pending}
            className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`issn-${article.id}`}
          className="mb-2 block font-semibold"
        >
          Article ISSN
        </label>

        <input
          id={`issn-${article.id}`}
          name="issn"
          defaultValue={article.issn || ""}
          placeholder="0000-000X"
          disabled={pending}
          className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
        />

        <p className="mt-2 text-sm text-gray-500">
          Until this article has an ISSN, it stays visible as published on
          the public website but continues to show as &quot;Under
          Review&quot; on the author&apos;s dashboard.
        </p>
      </div>

      <div>
        <label
          htmlFor={`accessType-${article.id}`}
          className="mb-2 block font-semibold"
        >
          Access
        </label>

        <select
          id={`accessType-${article.id}`}
          name="accessType"
          required
          defaultValue={article.accessType}
          disabled={pending}
          className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
        >
          <option value="OPEN_ACCESS">
            Open Access — free to everyone, no login required
          </option>

          <option value="SUBSCRIPTION">Subscription only</option>

          <option value="PAY_PER_VIEW">Pay-per-article only</option>

          <option value="SUBSCRIPTION_OR_PAY_PER_VIEW">
            Subscription or pay-per-article
          </option>
        </select>

        <p className="mt-2 text-sm text-gray-500">
          Open Access articles can be downloaded by anyone without signing
          in. All other options require the reader to be signed in with an
          active subscription and/or a purchase of this article.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Article Changes"}
      </button>
    </form>
  );
}

type AuthorOption = {
  id: string;
  fullName: string;
  email: string | null;
};

export function UpdateCorrespondingAuthorForm({
  articleId,
  authors,
  defaultAuthorId,
}: {
  articleId: string;
  authors: AuthorOption[];
  defaultAuthorId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateCorrespondingAuthor,
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
      className="mt-5 flex flex-wrap items-end gap-4 rounded-xl bg-amber-50 p-5"
    >
      <input type="hidden" name="articleId" value={articleId} />

      <ActionBanner state={state} />

      <div className="min-w-[240px] flex-1">
        <label
          htmlFor={`corresponding-author-${articleId}`}
          className="mb-2 block font-semibold"
        >
          Corresponding Author
        </label>

        <select
          id={`corresponding-author-${articleId}`}
          name="authorId"
          defaultValue={defaultAuthorId}
          disabled={pending}
          className="w-full rounded-lg border bg-white p-3 disabled:opacity-50"
        >
          <option value="">None assigned</option>

          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.fullName}
              {author.email ? ` (${author.email})` : ""}
            </option>
          ))}
        </select>

        <p className="mt-2 text-sm text-amber-800">
          Shown to readers on the published article page. Change this if an
          author requests to be listed as the corresponding author.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
      >
        {pending ? "Updating…" : "Update Corresponding Author"}
      </button>
    </form>
  );
}

type ArticleForActions = {
  id: string;
  status: string;
  slug: string;
};

export function ArticleActionButtons({
  article,
}: {
  article: ArticleForActions;
}) {
  const router = useRouter();

  const [publishState, publishAction, publishPending] = useActionState(
    changeArticleStatus,
    IDLE_FORM_ACTION_STATE,
  );
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    changeArticleStatus,
    IDLE_FORM_ACTION_STATE,
  );
  const [draftState, draftAction, draftPending] = useActionState(
    changeArticleStatus,
    IDLE_FORM_ACTION_STATE,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    changeArticleStatus,
    IDLE_FORM_ACTION_STATE,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteArticle,
    IDLE_FORM_ACTION_STATE,
  );

  const anyPending =
    publishPending ||
    schedulePending ||
    draftPending ||
    archivePending ||
    deletePending;

  const anySucceeded =
    publishState.success ||
    scheduleState.success ||
    draftState.success ||
    archiveState.success ||
    deleteState.success;

  useEffect(() => {
    if (anySucceeded) {
      router.refresh();
    }
  }, [anySucceeded, router]);

  const errorMessage = [
    publishState,
    scheduleState,
    draftState,
    archiveState,
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
        {article.status !== "PUBLISHED" && (
          <form action={publishAction}>
            <input type="hidden" name="articleId" value={article.id} />

            <input type="hidden" name="status" value="PUBLISHED" />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {publishPending ? "Publishing…" : "Publish"}
            </button>
          </form>
        )}

        {article.status !== "SCHEDULED" && (
          <form action={scheduleAction}>
            <input type="hidden" name="articleId" value={article.id} />

            <input type="hidden" name="status" value="SCHEDULED" />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {schedulePending ? "Scheduling…" : "Schedule"}
            </button>
          </form>
        )}

        {article.status !== "DRAFT" && (
          <form action={draftAction}>
            <input type="hidden" name="articleId" value={article.id} />

            <input type="hidden" name="status" value="DRAFT" />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {draftPending ? "Returning…" : "Return to Draft"}
            </button>
          </form>
        )}

        {article.status !== "ARCHIVED" && (
          <form action={archiveAction}>
            <input type="hidden" name="articleId" value={article.id} />

            <input type="hidden" name="status" value="ARCHIVED" />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-gray-700 px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {archivePending ? "Archiving…" : "Archive"}
            </button>
          </form>
        )}

        {article.status === "PUBLISHED" && (
          <Link
            href={`/articles/${article.slug}`}
            className="rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
          >
            View Public Article
          </Link>
        )}

        {article.status !== "PUBLISHED" && (
          <form action={deleteAction}>
            <input type="hidden" name="articleId" value={article.id} />

            <button
              type="submit"
              disabled={anyPending}
              className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {deletePending ? "Deleting…" : "Delete Article"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
