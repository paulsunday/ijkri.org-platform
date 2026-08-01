import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Container } from "@/components/layout/container";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Publication date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatPageRange(startPage: number | null, endPage: number | null) {
  if (startPage && endPage) {
    if (startPage === endPage) {
      return `Page ${startPage}`;
    }

    return `Pages ${startPage}–${endPage}`;
  }

  if (startPage) {
    return `From page ${startPage}`;
  }

  if (endPage) {
    return `Up to page ${endPage}`;
  }

  return null;
}

export default async function ArchivesPage() {
  const volumes = await prisma.volume.findMany({
    where: {
      isPublished: true,

      issues: {
        some: {
          isPublished: true,
        },
      },
    },

    include: {
      journal: {
        select: {
          id: true,
          name: true,
          shortName: true,
          slug: true,
          issnPrint: true,
          issnOnline: true,
        },
      },

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

              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },

            orderBy: [
              {
                startPage: "asc",
              },
              {
                publishedAt: "desc",
              },
            ],
          },
        },

        orderBy: [
          {
            isCurrent: "desc",
          },
          {
            number: "desc",
          },
        ],
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

  const totalIssues = volumes.reduce(
    (total, volume) => total + volume.issues.length,
    0,
  );

  const totalArticles = volumes.reduce(
    (volumeTotal, volume) =>
      volumeTotal +
      volume.issues.reduce(
        (issueTotal, issue) => issueTotal + issue.articles.length,
        0,
      ),
    0,
  );

  return (
    <Container as="main" className="py-8 sm:py-12">
      <header className="border-b pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Journal publications
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
          Archives
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600">
          Browse published volumes, issues and scholarly articles from the
          journal archive.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Published volumes</p>

          <p className="mt-2 text-3xl font-bold text-gray-950">
            {volumes.length}
          </p>
        </article>

        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Published issues</p>

          <p className="mt-2 text-3xl font-bold text-gray-950">{totalIssues}</p>
        </article>

        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Published articles
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-950">
            {totalArticles}
          </p>
        </article>
      </section>

      {volumes.length === 0 ? (
        <section className="mt-8 rounded-xl border border-yellow-300 bg-yellow-50 p-8">
          <h2 className="text-xl font-semibold text-yellow-900">
            No published archives available
          </h2>

          <p className="mt-2 text-yellow-800">
            Published volumes, issues and articles will appear here.
          </p>
        </section>
      ) : (
        <div className="mt-10 space-y-10">
          {volumes.map((volume) => (
            <section
              key={volume.id}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              <header className="border-b bg-gray-50 px-6 py-6 sm:px-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  {volume.journal.name}
                </p>

                <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-950">
                      Volume {volume.number} ({volume.year})
                    </h2>

                    {volume.title && (
                      <p className="mt-2 text-lg text-gray-700">
                        {volume.title}
                      </p>
                    )}
                  </div>

                  <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
                    {volume.issues.length} issue
                    {volume.issues.length === 1 ? "" : "s"}
                  </p>
                </div>

                {volume.description && (
                  <p className="mt-4 max-w-4xl leading-7 text-gray-600">
                    {volume.description}
                  </p>
                )}

                {(volume.journal.issnPrint || volume.journal.issnOnline) && (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                    {volume.journal.issnPrint && (
                      <span>Print ISSN: {volume.journal.issnPrint}</span>
                    )}

                    {volume.journal.issnOnline && (
                      <span>Online ISSN: {volume.journal.issnOnline}</span>
                    )}
                  </div>
                )}
              </header>

              <div className="space-y-8 p-6 sm:p-8">
                {volume.issues.map((issue) => (
                  <article
                    key={issue.id}
                    className="rounded-xl border border-gray-200 p-5 sm:p-6"
                  >
                    <div className="grid gap-6 md:grid-cols-[160px_minmax(0,1fr)]">
                      <div className="mx-auto w-full max-w-[160px] md:max-w-none">
                        {issue.coverImage ? (
                          <a
                            href={issue.coverImage}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={issue.coverImage}
                              alt={`Cover for Volume ${volume.number}, Issue ${issue.number}`}
                              className="aspect-[3/4] w-full rounded-lg border object-cover shadow-sm"
                            />
                          </a>
                        ) : (
                          <div className="flex aspect-[3/4] items-center justify-center rounded-lg border bg-gray-100 p-4 text-center text-sm font-medium text-gray-500">
                            Issue cover unavailable
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-bold text-gray-950">
                                Volume {volume.number}, Issue {issue.number}
                              </h3>

                              {issue.isCurrent && (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                  Current Issue
                                </span>
                              )}
                            </div>

                            {issue.title && (
                              <p className="mt-2 text-lg font-medium text-gray-700">
                                {issue.title}
                              </p>
                            )}

                            <p className="mt-3 text-sm text-gray-500">
                              Published {formatDate(issue.publishedAt)}
                            </p>
                          </div>

                          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
                            {issue.articles.length} article
                            {issue.articles.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {issue.description && (
                          <p className="mt-5 leading-7 text-gray-600">
                            {issue.description}
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                          {issue.slug ? (
                            <Link
                              href={`/issues/${issue.slug}`}
                              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                              View Complete Issue
                            </Link>
                          ) : (
                            <span className="rounded-lg bg-gray-200 px-5 py-3 font-semibold text-gray-500">
                              Issue page unavailable
                            </span>
                          )}

                          {issue.fullIssuePdf && (
                            <a
                              href={issue.fullIssuePdf}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 hover:bg-red-100"
                            >
                              Download Complete Issue
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {issue.articles.length > 0 && (
                      <div className="mt-8 border-t pt-6">
                        <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                          Articles in this issue
                        </h4>

                        <div className="mt-4 divide-y">
                          {issue.articles.map((article) => {
                            const authors = article.authors
                              .map((author) => author.fullName)
                              .join(", ");

                            const pageRange = formatPageRange(
                              article.startPage,
                              article.endPage,
                            );

                            return (
                              <div
                                key={article.id}
                                className="py-5 first:pt-0 last:pb-0"
                              >
                                {article.category && (
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                    {article.category.name}
                                  </p>
                                )}

                                <Link
                                  href={`/articles/${article.slug}`}
                                  className="text-lg font-semibold leading-7 text-gray-950 hover:text-blue-700"
                                >
                                  {article.title}
                                </Link>

                                <p className="mt-2 text-sm text-gray-600">
                                  {authors || "Author information unavailable"}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                                  {pageRange && <span>{pageRange}</span>}

                                  {article.doi && (
                                    <span className="break-all">
                                      DOI: {article.doi}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                  <Link
                                    href={`/articles/${article.slug}`}
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
                                      Open DOI
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
