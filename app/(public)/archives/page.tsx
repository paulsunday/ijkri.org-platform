import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export default async function ArchivesPage() {
  const volumes = await prisma.volume.findMany({
    where: {
      isPublished: true,
    },

    include: {
      journal: true,

      issues: {
        where: {
          isPublished: true,
        },

        include: {
          articles: {
            where: {
              status: "PUBLISHED",
            },

            include: {
              authors: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },

            orderBy: {
              publishedAt: "desc",
            },
          },
        },

        orderBy: {
          number: "desc",
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
  });

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-4xl font-bold">
          Archives
        </h1>

        <p className="mt-3 text-gray-600">
          Browse published volumes, issues and articles.
        </p>
      </header>

      {volumes.length === 0 ? (
        <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-8">
          <h2 className="text-xl font-semibold text-yellow-900">
            No published volumes found
          </h2>

          <p className="mt-2 text-yellow-800">
            Published volumes and issues will appear here.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          {volumes.map((volume) => (
            <section
              key={volume.id}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="border-b pb-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  {volume.journal.name}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Volume {volume.number} ({volume.year})
                </h2>

                {volume.title && (
                  <p className="mt-2 text-gray-700">
                    {volume.title}
                  </p>
                )}

                {volume.description && (
                  <p className="mt-3 text-gray-600">
                    {volume.description}
                  </p>
                )}
              </div>

              {volume.issues.length === 0 ? (
                <p className="mt-5 text-gray-600">
                  No published issues in this volume.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  {volume.issues.map((issue) => (
                    <article
                      key={issue.id}
                      className="rounded-lg border p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold">
                            Issue {issue.number}
                            {issue.title
                              ? ` — ${issue.title}`
                              : ""}
                          </h3>

                          <p className="mt-2 text-sm text-gray-500">
                            Published {formatDate(issue.publishedAt)}
                          </p>

                          {issue.isCurrent && (
                            <span className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                              Current Issue
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-500">
                          {issue.articles.length} article
                          {issue.articles.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      {issue.description && (
                        <p className="mt-4 text-gray-600">
                          {issue.description}
                        </p>
                      )}

                      {issue.articles.length > 0 && (
                        <div className="mt-6 divide-y">
                          {issue.articles.map((article) => {
                            const authors = article.authors
                              .map((author) => author.fullName)
                              .join(", ");

                            return (
                              <div
                                key={article.id}
                                className="py-5 first:pt-0 last:pb-0"
                              >
                                <Link
                                  href={`/articles/${article.id}`}
                                  className="text-lg font-semibold text-gray-900 hover:text-blue-700"
                                >
                                  {article.title}
                                </Link>

                                <p className="mt-2 text-sm text-gray-600">
                                  {authors ||
                                    "Author information unavailable"}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                  <Link
                                    href={`/articles/${article.id}`}
                                    className="font-semibold text-blue-700 hover:underline"
                                  >
                                    View Article
                                  </Link>

                                  {article.pdfUrl && (
                                    <a
                                      href={article.pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-blue-700 hover:underline"
                                    >
                                      Download PDF
                                    </a>
                                  )}

                                  {article.doi && (
                                    <a
                                      href={`https://doi.org/${article.doi}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-blue-700 hover:underline"
                                    >
                                      DOI
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}