import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

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

function truncateAbstract(abstract: string, maxLength = 220) {
  if (abstract.length <= maxLength) {
    return abstract;
  }

  return `${abstract.slice(0, maxLength).trimEnd()}…`;
}

export default async function PublicIssuePage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const issue = await prisma.issue.findUnique({
    where: {
      slug,
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
          description: true,
          logo: true,
        },
      },

      volume: {
        select: {
          id: true,
          number: true,
          year: true,
          title: true,
        },
      },

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
            publishedAt: "asc",
          },
        ],
      },
    },
  });

  if (!issue || !issue.isPublished) {
    notFound();
  }

  const startPages = issue.articles
    .map((article) => article.startPage)
    .filter((page): page is number => page !== null);

  const endPages = issue.articles
    .map((article) => article.endPage)
    .filter((page): page is number => page !== null);

  const issuePageRange =
    startPages.length > 0 && endPages.length > 0
      ? `Pages ${Math.min(...startPages)}–${Math.max(...endPages)}`
      : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <nav className="mb-8">
        <Link
          href="/archives"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to Archives
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
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
                  alt={`Cover for Volume ${issue.volume.number}, Issue ${issue.number}`}
                  className="aspect-[3/4] w-full object-cover"
                />
              </a>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center bg-gray-100 p-5 text-center text-sm font-medium text-gray-500">
                Issue cover unavailable
              </div>
            )}

            <div className="space-y-4 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                  {issue.journal.shortName || issue.journal.name}
                </p>

                <p className="mt-1 text-lg font-bold text-gray-950">
                  Volume {issue.volume.number}, Issue {issue.number}
                </p>

                {issue.isCurrent && (
                  <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    Current Issue
                  </span>
                )}
              </div>

              <dl className="space-y-2 border-t pt-4 text-sm text-gray-600">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Published</dt>
                  <dd className="text-right font-medium text-gray-800">
                    {formatDate(issue.publishedAt)}
                  </dd>
                </div>

                {issuePageRange && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Pages</dt>
                    <dd className="text-right font-medium text-gray-800">
                      {issuePageRange}
                    </dd>
                  </div>
                )}

                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Articles</dt>
                  <dd className="text-right font-medium text-gray-800">
                    {issue.articles.length}
                  </dd>
                </div>

                {issue.journal.issnPrint && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Print ISSN</dt>
                    <dd className="text-right font-medium text-gray-800">
                      {issue.journal.issnPrint}
                    </dd>
                  </div>
                )}

                {issue.journal.issnOnline && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Online ISSN</dt>
                    <dd className="text-right font-medium text-gray-800">
                      {issue.journal.issnOnline}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="space-y-2 border-t pt-4">
                {issue.fullIssuePdf && (
                  <a
                    href={issue.fullIssuePdf}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg bg-red-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-red-800"
                  >
                    Download Complete Issue PDF
                  </a>
                )}

                <Link
                  href="/archives"
                  className="block rounded-lg border border-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Browse Other Issues
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              {issue.journal.name}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Volume {issue.volume.number}, Issue {issue.number}
            </h1>

            {issue.title && (
              <p className="mt-2 text-xl font-medium text-gray-700">
                {issue.title}
              </p>
            )}

            {issue.description && (
              <p className="mt-5 max-w-4xl leading-8 text-gray-600">
                {issue.description}
              </p>
            )}
          </section>

          {issue.editorial && (
            <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Editorial
              </p>

              <h2 className="mt-3 text-2xl font-bold text-blue-950">
                Editor&apos;s Note
              </h2>

              <div className="mt-5 whitespace-pre-wrap leading-8 text-blue-950">
                {issue.editorial}
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="border-b pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Published articles
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-950">
                Table of Contents
              </h2>
            </div>

            {issue.articles.length === 0 ? (
              <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                <p className="font-semibold text-yellow-900">
                  No published articles are available in this issue.
                </p>
              </div>
            ) : (
              <div className="mt-6 divide-y rounded-2xl border bg-white px-6 shadow-sm sm:px-8">
                {issue.articles.map((article) => {
                  const authors = article.authors
                    .map((author) => author.fullName)
                    .join(", ");

                  const pageRange = formatPageRange(
                    article.startPage,
                    article.endPage,
                  );

                  return (
                    <article
                      key={article.id}
                      className="py-8 first:pt-6 last:pb-6"
                    >
                      {article.category && (
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                          {article.category.name}
                        </p>
                      )}

                      <h3 className="mt-2 text-xl font-bold leading-8 text-gray-950">
                        <Link
                          href={`/articles/${article.slug}`}
                          className="hover:text-blue-700"
                        >
                          {article.title}
                        </Link>
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {authors || "Author information unavailable"}
                      </p>

                      {article.abstract && (
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
                          {truncateAbstract(article.abstract)}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                        {pageRange && <span>{pageRange}</span>}

                        {article.publishedAt && (
                          <span>
                            Published {formatDate(article.publishedAt)}
                          </span>
                        )}

                        {article.doi && <span>DOI: {article.doi}</span>}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-4 text-sm">
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
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
