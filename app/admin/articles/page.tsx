import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import {
  formatAuthorStatusLabel,
  getAuthorFacingStatus,
} from "@/lib/manuscripts/author-status";

import {
  ArticleActionButtons,
  UpdateArticleForm,
  UpdateCorrespondingAuthorForm,
} from "./ArticleForms";

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

                  <UpdateArticleForm
                    article={{
                      id: article.id,
                      title: article.title,
                      abstract: article.abstract,
                      issueId: article.issueId,
                      publishedAtInput: formatDate(
                        article.publishedAt,
                      ),
                      doi: article.doi,
                      pdfUrl: article.pdfUrl,
                      issn: article.issn,
                      accessType: article.accessType,
                    }}
                    compatibleIssues={compatibleIssues}
                  />

                  {article.authors.length > 0 && (
                    <UpdateCorrespondingAuthorForm
                      articleId={article.id}
                      authors={article.authors.map((author) => ({
                        id: author.id,
                        fullName: author.fullName,
                        email: author.email,
                      }))}
                      defaultAuthorId={
                        article.authors.find(
                          (author) => author.isCorresponding,
                        )?.id || ""
                      }
                    />
                  )}

                  <ArticleActionButtons
                    article={{
                      id: article.id,
                      status: article.status,
                      slug: article.slug,
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
