import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

import {
  clearCurrentIssue,
  createIssue,
  deleteIssue,
  publishIssue,
  setCurrentIssue,
  unpublishIssue,
  updateIssue,
} from "./actions";

function formatDate(
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

export default async function AdminIssuesPage() {
  const [volumes, issues] = await Promise.all([
    prisma.volume.findMany({
      include: {
        journal: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          number: "desc",
        },
      ],
    }),

    prisma.issue.findMany({
      include: {
        journal: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },

        volume: {
          select: {
            id: true,
            number: true,
            year: true,
            title: true,
            isPublished: true,
          },
        },

        articles: {
          select: {
            id: true,
            title: true,
            status: true,
          },
          orderBy: {
            publishedAt: "desc",
          },
        },
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

  const publishedCount = issues.filter(
    (issue) => issue.isPublished,
  ).length;

  const currentCount = issues.filter(
    (issue) => issue.isCurrent,
  ).length;

  const draftCount =
    issues.length - publishedCount;

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
          Issues
        </h1>

        <p className="mt-3 text-gray-600">
          Create, publish and manage journal issues.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Issues
          </p>

          <p className="mt-2 text-3xl font-bold">
            {issues.length}
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
            Current Issues
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-900">
            {currentCount}
          </p>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Create Issue
        </h2>

        {volumes.length === 0 ? (
          <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
            <p className="font-semibold text-yellow-900">
              No volume is available
            </p>

            <p className="mt-2 text-sm text-yellow-800">
              Create a volume before creating an issue.
            </p>

            <Link
              href="/admin/volumes"
              className="mt-4 inline-block font-semibold text-blue-700 hover:underline"
            >
              Create Volume
            </Link>
          </div>
        ) : (
          <form
            action={createIssue}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label
                htmlFor="volumeId"
                className="mb-2 block font-semibold"
              >
                Volume
              </label>

              <select
                id="volumeId"
                name="volumeId"
                required
                defaultValue=""
                className="w-full rounded-lg border p-3"
              >
                <option value="" disabled>
                  Select volume
                </option>

                {volumes.map((volume) => (
                  <option
                    key={volume.id}
                    value={volume.id}
                  >
                    {volume.journal.shortName} — Volume{" "}
                    {volume.number} ({volume.year})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="number"
                className="mb-2 block font-semibold"
              >
                Issue Number
              </label>

              <input
                id="number"
                name="number"
                type="number"
                min={1}
                required
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label
                htmlFor="title"
                className="mb-2 block font-semibold"
              >
                Issue Title
              </label>

              <input
                id="title"
                name="title"
                className="w-full rounded-lg border p-3"
                placeholder="Optional issue title"
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
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="coverImage"
                className="mb-2 block font-semibold"
              >
                Cover Image URL
              </label>

              <input
                id="coverImage"
                name="coverImage"
                type="url"
                className="w-full rounded-lg border p-3"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Create Issue
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Existing Issues
        </h2>

        {issues.length === 0 ? (
          <p className="mt-5 text-gray-600">
            No issues have been created.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {issues.map((issue) => {
              const publishedArticles =
                issue.articles.filter(
                  (article) =>
                    article.status === "PUBLISHED",
                ).length;

              return (
                <article
                  key={issue.id}
                  className="rounded-xl border p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">
                        {issue.journal.name}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold">
                        Volume {issue.volume.number}, Issue{" "}
                        {issue.number}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {issue.volume.year}
                      </p>

                      {issue.title && (
                        <p className="mt-3 text-gray-700">
                          {issue.title}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${issue.isPublished
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {issue.isPublished
                          ? "Published"
                          : "Draft"}
                      </span>

                      {issue.isCurrent && (
                        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
                          Current Issue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Articles
                      </p>

                      <p className="font-medium">
                        {issue.articles.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Published Articles
                      </p>

                      <p className="font-medium">
                        {publishedArticles}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Published Date
                      </p>

                      <p className="font-medium">
                        {formatDate(issue.publishedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Volume Status
                      </p>

                      <p className="font-medium">
                        {issue.volume.isPublished
                          ? "Published"
                          : "Draft"}
                      </p>
                    </div>
                  </div>

                  {issue.description && (
                    <div className="mt-5 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                      {issue.description}
                    </div>
                  )}

                  {issue.coverImage && (
                    <div className="mt-5">
                      <a
                        href={issue.coverImage}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        View Cover Image
                      </a>
                    </div>
                  )}

                  <form
                    action={updateIssue}
                    className="mt-6 grid gap-4 md:grid-cols-2"
                  >
                    <input
                      type="hidden"
                      name="issueId"
                      value={issue.id}
                    />

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Title
                      </label>

                      <input
                        name="title"
                        defaultValue={issue.title || ""}
                        className="w-full rounded-lg border p-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Cover Image URL
                      </label>

                      <input
                        name="coverImage"
                        type="url"
                        defaultValue={
                          issue.coverImage || ""
                        }
                        className="w-full rounded-lg border p-3"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold">
                        Description
                      </label>

                      <textarea
                        name="description"
                        rows={4}
                        defaultValue={
                          issue.description || ""
                        }
                        className="w-full rounded-lg border p-3"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-gray-800 px-5 py-3 font-semibold text-white hover:bg-black"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {!issue.isPublished ? (
                      <form action={publishIssue}>
                        <input
                          type="hidden"
                          name="issueId"
                          value={issue.id}
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                        >
                          Publish Issue
                        </button>
                      </form>
                    ) : (
                      <form action={unpublishIssue}>
                        <input
                          type="hidden"
                          name="issueId"
                          value={issue.id}
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-white hover:bg-yellow-700"
                        >
                          Unpublish Issue
                        </button>
                      </form>
                    )}

                    {issue.isPublished &&
                      !issue.isCurrent && (
                        <form action={setCurrentIssue}>
                          <input
                            type="hidden"
                            name="issueId"
                            value={issue.id}
                          />

                          <button
                            type="submit"
                            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                          >
                            Set as Current Issue
                          </button>
                        </form>
                      )}

                    {issue.isCurrent && (
                      <form action={clearCurrentIssue}>
                        <input
                          type="hidden"
                          name="issueId"
                          value={issue.id}
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
                        >
                          Clear Current Issue
                        </button>
                      </form>
                    )}

                    <Link
                      href="/admin/articles"
                      className="rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      View Articles
                    </Link>

                    {issue.articles.length === 0 && (
                      <form action={deleteIssue}>
                        <input
                          type="hidden"
                          name="issueId"
                          value={issue.id}
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                        >
                          Delete Issue
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