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

export default async function CurrentIssuePage() {
  const currentIssue = await prisma.issue.findFirst({
    where: {
      isCurrent: true,
      isPublished: true,
    },

    include: {
      journal: true,

      volume: true,

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

          keywords: {
            include: {
              keyword: true,
            },
          },
        },

        orderBy: {
          publishedAt: "desc",
        },
      },
    },

    orderBy: {
      publishedAt: "desc",
    },
  });

  if (!currentIssue) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header>
          <h1 className="text-4xl font-bold">
            Current Issue
          </h1>

          <p className="mt-3 text-gray-600">
            View the latest published issue and articles.
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-yellow-300 bg-yellow-50 p-8">
          <h2 className="text-xl font-semibold text-yellow-900">
            No current issue is available
          </h2>

          <p className="mt-2 text-yellow-800">
            A published issue must be marked as current before it appears here.
          </p>

          <Link
            href="/archives"
            className="mt-5 inline-block font-semibold text-blue-700 hover:underline"
          >
            Browse the archives
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <header className="rounded-xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          {currentIssue.journal.name}
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          Current Issue
        </h1>

        <div className="mt-4 space-y-1 text-gray-700">
          <p className="text-lg font-semibold">
            Volume {currentIssue.volume.number}, Issue{" "}
            {currentIssue.number}
          </p>

          {currentIssue.title && (
            <p>{currentIssue.title}</p>
          )}

          <p>
            Published: {formatDate(currentIssue.publishedAt)}
          </p>
        </div>

        {currentIssue.description && (
          <p className="mt-5 max-w-4xl leading-7 text-gray-600">
            {currentIssue.description}
          </p>
        )}
      </header>

      {currentIssue.articles.length === 0 ? (
        <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-8">
          <h2 className="text-xl font-semibold text-yellow-900">
            No published articles in this issue
          </h2>

          <p className="mt-2 text-yellow-800">
            Published articles assigned to this issue will appear here.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Articles
            </h2>

            <p className="text-sm text-gray-500">
              {currentIssue.articles.length} article
              {currentIssue.articles.length === 1 ? "" : "s"}
            </p>
          </div>

          {currentIssue.articles.map((article) => {
            const authorNames = article.authors
              .map((author) => author.fullName)
              .join(", ");

            return (
              <article
                key={article.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-4xl">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="text-2xl font-semibold text-gray-900 hover:text-blue-700"
                    >
                      {article.title}
                    </Link>

                    <p className="mt-3 text-gray-700">
                      {authorNames || "Author information unavailable"}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Published {formatDate(article.publishedAt)}
                    </p>

                    {article.doi && (
                      <p className="mt-2 text-sm">
                        DOI:{" "}
                        <a
                          href={`https://doi.org/${article.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline"
                        >
                          {article.doi}
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                    >
                      View Article
                    </Link>

                    {article.pdfUrl && (
                      <a
                        href={article.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>

                <p className="mt-5 line-clamp-4 leading-7 text-gray-600">
                  {article.abstract}
                </p>

                {article.keywords.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {article.keywords.map((articleKeyword) => (
                      <span
                        key={articleKeyword.keywordId}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800"
                      >
                        {articleKeyword.keyword.name}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <div>
        <Link
          href="/archives"
          className="font-semibold text-blue-700 hover:underline"
        >
          Browse all archived issues →
        </Link>
      </div>
    </main>
  );
}
