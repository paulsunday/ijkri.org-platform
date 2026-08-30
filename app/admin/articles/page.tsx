import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import {
  formatAuthorStatusLabel,
  getAuthorFacingStatus,
} from "@/lib/manuscripts/author-status";

import {
  changeArticleStatus,
  deleteArticle,
  updateArticle,
  updateCorrespondingAuthor,
} from "./actions";

function formatDate(
  value: Date | null | undefined,
) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function displayDate(
  value: Date | null | undefined,
) {
  if (!value) {
    return "Not published";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDoiStatus(status: string | undefined) {
  switch (status) {
    case "REGISTERED":
      return "Registered";

    case "FAILED":
      return "Updating";

    case "PENDING":
      return "Incoming";

    default:
      return "Not Available";
  }
}

function formatAccessType(accessType: string) {
  switch (accessType) {
    case "OPEN_ACCESS":
      return "Open Access";

    case "SUBSCRIPTION":
      return "Subscription Only";

    case "PAY_PER_VIEW":
      return "Pay-Per-Article Only";

    case "SUBSCRIPTION_OR_PAY_PER_VIEW":
      return "Subscription or Pay-Per-Article";

    default:
      return accessType;
  }
}

function accessTypeClass(accessType: string) {
  return accessType === "OPEN_ACCESS"
    ? "bg-green-100 text-green-800"
    : "bg-amber-100 text-amber-800";
}

function statusClass(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "bg-green-100 text-green-800";

    case "SCHEDULED":
      return "bg-blue-100 text-blue-800";

    case "ARCHIVED":
      return "bg-gray-200 text-gray-800";

    case "DRAFT":
      return "bg-yellow-100 text-yellow-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function AdminArticlesPage() {
  await requireAnyRole(ADMIN_ROLES);

  const [articles, issues] = await Promise.all([
    prisma.article.findMany({
      include: {
        journal: true,

        issue: {
          include: {
            volume: true,
          },
        },

        authors: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        doiRecord: true,

        submission: {
          select: {
            id: true,
            status: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.issue.findMany({
      include: {
        journal: true,
        volume: true,
      },

      orderBy: [
        {
          volume: {
            year: "desc",
          },
        },
        {
          volume: {
            number: "desc",
          },
        },
        {
          number: "desc",
        },
      ],
    }),
  ]);

  const publishedCount = articles.filter(
    (article) => article.status === "PUBLISHED",
  ).length;

  const draftCount = articles.filter(
    (article) => article.status === "DRAFT",
  ).length;

  const scheduledCount = articles.filter(
    (article) => article.status === "SCHEDULED",
  ).length;

  const archivedCount = articles.filter(
    (article) => article.status === "ARCHIVED",
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <header>
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to admin dashboard
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          Articles
        </h1>

        <p className="mt-3 text-gray-600">
          Manage article metadata, publication status,
          issue assignment, DOI and PDF files.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Articles
          </p>

          <p className="mt-2 text-3xl font-bold">
            {articles.length}
          </p>
        </article>

        <article className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">
            Draft
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {draftCount}
          </p>
        </article>

        <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm text-blue-700">
            Scheduled
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-900">
            {scheduledCount}
          </p>
        </article>

        <article className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Published
          </p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {publishedCount}
          </p>
        </article>

        <article className="rounded-xl border bg-gray-100 p-5">
          <p className="text-sm text-gray-600">
            Archived
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {archivedCount}
          </p>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Article Directory
        </h2>

        {articles.length === 0 ? (
          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-6">
            <p className="font-semibold text-yellow-900">
              No articles found
            </p>

            <p className="mt-2 text-sm text-yellow-800">
              Articles will appear here after an accepted
              manuscript reaches publication.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {articles.map((article) => {
              const compatibleIssues = issues.filter(
                (issue) =>
                  issue.journalId === article.journalId,
              );

              const authorNames =
                article.authors
                  .map((author) => author.fullName)
                  .join(", ") ||
                "Author information unavailable";

              return (
                <article
                  key={article.id}
                  className="rounded-xl border p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <p className="text-sm font-semibold text-blue-700">
                        {article.journal.name}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold">
                        {article.title}
                      </h3>

                      <p className="mt-2 text-gray-600">
                        {authorNames}
                      </p>

                      {article.issue && (
                        <p className="mt-2 text-sm text-gray-500">
                          Volume {article.issue.volume.number},
                          Issue {article.issue.number}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
                          article.status,
                        )}`}
                      >
                        {article.status}
                      </span>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${accessTypeClass(
                          article.accessType,
                        )}`}
                      >
                        {formatAccessType(article.accessType)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Published
                      </p>

                      <p className="font-medium">
                        {displayDate(article.publishedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        DOI
                      </p>

                      <p className="break-all font-medium">
                        {article.doi || "Not assigned"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        DOI Status
                      </p>

                      <p className="font-medium">
                        {formatDoiStatus(
                          article.doiRecord?.status,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Submission Status
                      </p>

                      <p className="font-medium">
                        {article.submission?.status ||
                          "Not linked"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Article ISSN
                      </p>

                      <p className="break-all font-medium">
                        {article.issn || "Not assigned"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Author Dashboard Shows
                      </p>

                      <p className="font-medium">
                        {article.submission
                          ? formatAuthorStatusLabel(
                              getAuthorFacingStatus(
                                article.submission.status,
                                { issn: article.issn },
                              ),
                            )
                          : "Not linked"}
                      </p>
                    </div>
                  </div>

                  <form
                    action={updateArticle}
                    className="mt-7 space-y-5 rounded-xl bg-gray-50 p-5"
                  >
                    <input
                      type="hidden"
                      name="articleId"
                      value={article.id}
                    />

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
                        className="w-full rounded-lg border bg-white p-3"
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
                        className="w-full rounded-lg border bg-white p-3"
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
                          className="w-full rounded-lg border bg-white p-3"
                        >
                          <option value="">
                            No issue assigned
                          </option>

                          {compatibleIssues.map((issue) => (
                            <option
                              key={issue.id}
                              value={issue.id}
                            >
                              Volume {issue.volume.number} (
                              {issue.volume.year}), Issue{" "}
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
                          defaultValue={formatDate(
                            article.publishedAt,
                          )}
                          className="w-full rounded-lg border bg-white p-3"
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
                          className="w-full rounded-lg border bg-white p-3"
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
                          className="w-full rounded-lg border bg-white p-3"
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
                        className="w-full rounded-lg border bg-white p-3"
                      />

                      <p className="mt-2 text-sm text-gray-500">
                        Until this article has an ISSN, it stays
                        visible as published on the public website
                        but continues to show as &quot;Under
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
                        className="w-full rounded-lg border bg-white p-3"
                      >
                        <option value="OPEN_ACCESS">
                          Open Access — free to everyone, no login required
                        </option>

                        <option value="SUBSCRIPTION">
                          Subscription only
                        </option>

                        <option value="PAY_PER_VIEW">
                          Pay-per-article only
                        </option>

                        <option value="SUBSCRIPTION_OR_PAY_PER_VIEW">
                          Subscription or pay-per-article
                        </option>
                      </select>

                      <p className="mt-2 text-sm text-gray-500">
                        Open Access articles can be downloaded by anyone
                        without signing in. All other options require the
                        reader to be signed in with an active subscription
                        and/or a purchase of this article.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                    >
                      Save Article Changes
                    </button>
                  </form>

                  {article.authors.length > 0 && (
                    <form
                      action={updateCorrespondingAuthor}
                      className="mt-5 flex flex-wrap items-end gap-4 rounded-xl bg-amber-50 p-5"
                    >
                      <input
                        type="hidden"
                        name="articleId"
                        value={article.id}
                      />

                      <div className="min-w-[240px] flex-1">
                        <label
                          htmlFor={`corresponding-author-${article.id}`}
                          className="mb-2 block font-semibold"
                        >
                          Corresponding Author
                        </label>

                        <select
                          id={`corresponding-author-${article.id}`}
                          name="authorId"
                          defaultValue={
                            article.authors.find(
                              (author) => author.isCorresponding,
                            )?.id || ""
                          }
                          className="w-full rounded-lg border bg-white p-3"
                        >
                          <option value="">
                            None assigned
                          </option>

                          {article.authors.map((author) => (
                            <option
                              key={author.id}
                              value={author.id}
                            >
                              {author.fullName}
                              {author.email
                                ? ` (${author.email})`
                                : ""}
                            </option>
                          ))}
                        </select>

                        <p className="mt-2 text-sm text-amber-800">
                          Shown to readers on the published article
                          page. Change this if an author requests to
                          be listed as the corresponding author.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800"
                      >
                        Update Corresponding Author
                      </button>
                    </form>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {article.status !== "PUBLISHED" && (
                      <form action={changeArticleStatus}>
                        <input
                          type="hidden"
                          name="articleId"
                          value={article.id}
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="PUBLISHED"
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                        >
                          Publish
                        </button>
                      </form>
                    )}

                    {article.status !== "SCHEDULED" && (
                      <form action={changeArticleStatus}>
                        <input
                          type="hidden"
                          name="articleId"
                          value={article.id}
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="SCHEDULED"
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                        >
                          Schedule
                        </button>
                      </form>
                    )}

                    {article.status !== "DRAFT" && (
                      <form action={changeArticleStatus}>
                        <input
                          type="hidden"
                          name="articleId"
                          value={article.id}
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="DRAFT"
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-white hover:bg-yellow-700"
                        >
                          Return to Draft
                        </button>
                      </form>
                    )}

                    {article.status !== "ARCHIVED" && (
                      <form action={changeArticleStatus}>
                        <input
                          type="hidden"
                          name="articleId"
                          value={article.id}
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="ARCHIVED"
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-gray-700 px-5 py-3 font-semibold text-white hover:bg-gray-800"
                        >
                          Archive
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
                      <form action={deleteArticle}>
                        <input
                          type="hidden"
                          name="articleId"
                          value={article.id}
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                        >
                          Delete Article
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
