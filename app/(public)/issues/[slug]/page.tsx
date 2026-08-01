import Link from "next/link";
import { notFound } from "next/navigation";

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

  return (
    <Container as="main" className="py-8 sm:py-12">
      <nav className="mb-8">
        <Link
          href="/archives"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to Archives
        </Link>
      </nav>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-8 p-6 md:grid-cols-[220px_minmax(0,1fr)] md:p-8">
          <div className="mx-auto w-full max-w-[220px] md:max-w-none">
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
                  className="aspect-[3/4] w-full rounded-xl border object-cover shadow-sm"
                />
              </a>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-xl border bg-gray-100 p-5 text-center text-sm font-medium text-gray-500">
                Issue cover unavailable
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              {issue.journal.name}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                Volume {issue.volume.number}, Issue {issue.number}
              </h1>

              {issue.isCurrent && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  Current Issue
                </span>
              )}
            </div>

            {issue.title && (
              <p className="mt-3 text-xl font-medium text-gray-700">
                {issue.title}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span>Published {formatDate(issue.publishedAt)}</span>

              <span>
                {issue.articles.length} article
                {issue.articles.length === 1 ? "" : "s"}
              </span>

              {issue.journal.issnPrint && (
                <span>Print ISSN: {issue.journal.issnPrint}</span>
              )}

              {issue.journal.issnOnline && (
                <span>Online ISSN: {issue.journal.issnOnline}</span>
              )}
            </div>

            {issue.description && (
              <p className="mt-6 max-w-4xl leading-8 text-gray-600">
                {issue.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {issue.fullIssuePdf && (
                <a
                  href={issue.fullIssuePdf}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                >
                  Download Complete Issue PDF
                </a>
              )}

              <Link
                href="/archives"
                className="rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
              >
                Browse Other Issues
              </Link>
            </div>
          </div>
        </div>
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
            {issue.articles.map((article, index) => {
              const authors = article.authors
                .map((author) => author.fullName)
                .join(", ");

              const pageRange = formatPageRange(
                article.startPage,
                article.endPage,
              );

              return (
                <article key={article.id} className="py-8 first:pt-6 last:pb-6">
                  <div className="grid gap-4 sm:grid-cols-[52px_minmax(0,1fr)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
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

                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                        {pageRange && <span>{pageRange}</span>}

                        {article.publishedAt && (
                          <span>
                            Published {formatDate(article.publishedAt)}
                          </span>
                        )}

                        {article.doi && (
                          <span className="break-all">DOI: {article.doi}</span>
                        )}
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
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Container>
  );
}
