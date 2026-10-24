import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

import {
  CreateIssueForm,
  IssueActionButtons,
  UpdateIssueForm,
} from "./IssueForms";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Not published";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDateInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

export default async function AdminIssuesPage() {
  await requireAnyRole([...ADMIN_ROLES]);

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

  const publishedCount = issues.filter((issue) => issue.isPublished).length;

  const currentCount = issues.filter((issue) => issue.isCurrent).length;

  const draftCount = issues.length - publishedCount;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <header>
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to admin dashboard
        </Link>

        <h1 className="mt-4 text-4xl font-bold">Issues</h1>

        <p className="mt-3 text-gray-600">
          Create, publish and manage journal issues.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Issues</p>

          <p className="mt-2 text-3xl font-bold">{issues.length}</p>
        </article>

        <article className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">Published</p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {publishedCount}
          </p>
        </article>

        <article className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">Draft</p>

          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {draftCount}
          </p>
        </article>

        <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm text-blue-700">Current Issues</p>

          <p className="mt-2 text-3xl font-bold text-blue-900">
            {currentCount}
          </p>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Create Issue</h2>

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
          <CreateIssueForm volumes={volumes} />
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Existing Issues</h2>

        {issues.length === 0 ? (
          <p className="mt-5 text-gray-600">No issues have been created.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {issues.map((issue) => {
              const publishedArticles = issue.articles.filter(
                (article) => article.status === "PUBLISHED",
              ).length;

              return (
                <article key={issue.id} className="rounded-xl border p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">
                        {issue.journal.name}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold">
                        Volume {issue.volume.number}, Issue {issue.number}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {issue.volume.year}
                      </p>

                      {issue.slug && (
                        <p className="mt-2 text-xs text-gray-500">
                          Slug: <span className="font-mono">{issue.slug}</span>
                        </p>
                      )}

                      {issue.title && (
                        <p className="mt-3 text-gray-700">{issue.title}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          issue.isPublished
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {issue.isPublished ? "Published" : "Draft"}
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
                      <p className="text-sm text-gray-500">Articles</p>

                      <p className="font-medium">{issue.articles.length}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Published Articles
                      </p>

                      <p className="font-medium">{publishedArticles}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Published Date</p>

                      <p className="font-medium">
                        {formatDate(issue.publishedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Volume Status</p>

                      <p className="font-medium">
                        {issue.volume.isPublished ? "Published" : "Draft"}
                      </p>
                    </div>
                  </div>

                  {issue.description && (
                    <div className="mt-5 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                      {issue.description}
                    </div>
                  )}

                  {issue.editorial && (
                    <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <p className="font-semibold text-blue-900">Editorial</p>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-blue-900">
                        {issue.editorial}
                      </p>
                    </div>
                  )}

                  {issue.coverImage && (
                    <div className="mt-5">
                      <a
                        href={issue.coverImage}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={issue.coverImage}
                          alt={`Cover for Volume ${issue.volume.number}, Issue ${issue.number}`}
                          className="h-40 w-auto rounded-lg border object-cover"
                        />
                      </a>
                    </div>
                  )}

                  {issue.fullIssuePdf && (
                    <div className="mt-5">
                      <a
                        href={issue.fullIssuePdf}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700 hover:bg-red-100"
                      >
                        View Complete Issue PDF
                      </a>
                    </div>
                  )}

                  <UpdateIssueForm
                    issue={{
                      id: issue.id,
                      slug: issue.slug,
                      title: issue.title,
                      coverImage: issue.coverImage,
                      fullIssuePdf: issue.fullIssuePdf,
                      description: issue.description,
                      editorial: issue.editorial,
                      publishedAtInput: formatDateInput(
                        issue.publishedAt,
                      ),
                    }}
                  />

                  <IssueActionButtons
                    issue={{
                      id: issue.id,
                      isPublished: issue.isPublished,
                      isCurrent: issue.isCurrent,
                      articleCount: issue.articles.length,
                    }}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
