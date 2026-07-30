import Link from "next/link";
import { prisma } from "@/lib/prisma";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

import {
  markDoiFailed,
  markDoiRegistered,
  resetDoiToPending,
  submitDoiRegistration,
} from "./actions";

function formatDate(
  value: Date | null | undefined,
) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function statusClass(status: string) {
  switch (status) {
    case "REGISTERED":
      return "bg-green-100 text-green-800";

    case "FAILED":
      return "bg-red-100 text-red-800";

    case "PENDING":
      return "bg-yellow-100 text-yellow-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function DoiRecordsPage() {
  const currentManager =
    await requireAnyRole(ADMIN_ROLES);
  const records = await prisma.doiRecord.findMany({
    include: {
      article: {
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
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingCount = records.filter(
    (record) => record.status === "PENDING",
  ).length;

  const registeredCount = records.filter(
    (record) => record.status === "REGISTERED",
  ).length;

  const failedCount = records.filter(
    (record) => record.status === "FAILED",
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
          DOI Records
        </h1>

        <p className="mt-3 text-gray-600">
          Manage article DOI metadata and registration status.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total DOI Records
          </p>

          <p className="mt-2 text-3xl font-bold">
            {records.length}
          </p>
        </article>

        <article className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">
            Pending
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {pendingCount}
          </p>
        </article>

        <article className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Registered
          </p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {registeredCount}
          </p>
        </article>

        <article className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            Failed
          </p>

          <p className="mt-2 text-3xl font-bold text-red-900">
            {failedCount}
          </p>
        </article>
      </section>

      {!currentManager && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-6">
          <h2 className="font-semibold text-red-900">
            No DOI manager found
          </h2>

          <p className="mt-2 text-sm text-red-800">
            An active user must have an administrator,
            editor-in-chief, managing-editor or publisher role.
          </p>
        </section>
      )}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">
            DOI Registration Queue
          </h2>

          <p className="text-sm text-gray-500">
            Automated registration submits deposit XML to Crossref
            (test.crossref.org unless production credentials are
            configured).
          </p>
        </div>

        {records.length === 0 ? (
          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-6">
            <p className="font-semibold text-yellow-900">
              No DOI records found
            </p>

            <p className="mt-2 text-sm text-yellow-800">
              A DOI record is created when an article is
              published with a DOI value.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {records.map((record) => {
              const article = record.article;

              const authorNames =
                article?.authors
                  .map((author) => author.fullName)
                  .join(", ") ||
                "Author information unavailable";

              const metadata =
                record.metadata &&
                  typeof record.metadata === "object" &&
                  !Array.isArray(record.metadata)
                  ? record.metadata
                  : null;

              const failureReason =
                metadata &&
                  "failureReason" in metadata
                  ? String(metadata.failureReason)
                  : null;

              return (
                <article
                  key={record.id}
                  className="rounded-xl border p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold">
                          {record.doi}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            record.status,
                          )}`}
                        >
                          {record.status}
                        </span>
                      </div>

                      <p className="mt-3 font-medium">
                        {article?.title ||
                          "Article not linked"}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        {authorNames}
                      </p>

                      {article && (
                        <p className="mt-2 text-sm text-gray-500">
                          {article.journal.name}
                          {article.issue
                            ? ` — Volume ${article.issue.volume.number}, Issue ${article.issue.number}`
                            : ""}
                        </p>
                      )}
                    </div>

                    {article && (
                      <Link
                        href={`/articles/${article.slug}`}
                        className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        View Article
                      </Link>
                    )}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-gray-500">
                        Created
                      </p>

                      <p className="font-medium">
                        {formatDate(record.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Registered
                      </p>

                      <p className="font-medium">
                        {formatDate(record.registeredAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Updated
                      </p>

                      <p className="font-medium">
                        {formatDate(record.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {failureReason && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <strong>Failure reason:</strong>{" "}
                      {failureReason}
                    </div>
                  )}

                  {currentManager && (
                    <div className="mt-6 flex flex-wrap gap-4">
                      {article &&
                        record.status !== "REGISTERED" && (
                          <form
                            action={submitDoiRegistration}
                          >
                            <input
                              type="hidden"
                              name="doiRecordId"
                              value={record.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                              Submit to Crossref
                            </button>
                          </form>
                        )}

                      {record.status !== "REGISTERED" && (
                        <form action={markDoiRegistered}>
                          <input
                            type="hidden"
                            name="doiRecordId"
                            value={record.id}
                          />

                          <input
                            type="hidden"
                            name="userId"
                            value={currentManager.id}
                          />

                          <button
                            type="submit"
                            className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                          >
                            Mark Registered Manually
                          </button>
                        </form>
                      )}

                      {record.status !== "PENDING" && (
                        <form action={resetDoiToPending}>
                          <input
                            type="hidden"
                            name="doiRecordId"
                            value={record.id}
                          />

                          <input
                            type="hidden"
                            name="userId"
                            value={currentManager.id}
                          />

                          <button
                            type="submit"
                            className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-white hover:bg-yellow-700"
                          >
                            Reset to Pending
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {currentManager &&
                    record.status !== "REGISTERED" && (
                      <form
                        action={markDoiFailed}
                        className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5"
                      >
                        <input
                          type="hidden"
                          name="doiRecordId"
                          value={record.id}
                        />

                        <input
                          type="hidden"
                          name="userId"
                          value={currentManager.id}
                        />

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
                            placeholder="Describe the registration error..."
                            className="flex-1 rounded-lg border p-3"
                          />

                          <button
                            type="submit"
                            className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                          >
                            Mark Failed
                          </button>
                        </div>
                      </form>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
