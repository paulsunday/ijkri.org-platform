import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/layout/container";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

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

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const topicKeywords = !query
    ? await prisma.keyword.findMany({
      where: {
        articles: {
          some: {
            article: { status: "PUBLISHED" },
          },
        },
      },

      select: {
        id: true,
        name: true,

        _count: {
          select: { articles: true },
        },
      },

      orderBy: {
        articles: { _count: "desc" },
      },

      take: 24,
    })
    : [];

  const articles = query
    ? await prisma.article.findMany({
      where: {
        status: "PUBLISHED",

        OR: [
          {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },

          {
            abstract: {
              contains: query,
              mode: "insensitive",
            },
          },

          {
            doi: {
              contains: query,
              mode: "insensitive",
            },
          },

          {
            authors: {
              some: {
                fullName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },

          {
            keywords: {
              some: {
                keyword: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          },

          {
            journal: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        ],
      },

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

        keywords: {
          include: {
            keyword: true,
          },
        },
      },

      orderBy: {
        publishedAt: "desc",
      },

      take: 100,
    })
    : [];

  return (
    <Container as="main" className="space-y-8 py-8 sm:py-12">
      <header>
        <h1 className="text-4xl font-bold">
          Search Articles
        </h1>

        <p className="mt-3 text-gray-600">
          Search published research by title, author, abstract,
          keyword or DOI.
        </p>
      </header>

      <form
        action="/search"
        method="GET"
        className="rounded-xl border bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="q"
          className="mb-2 block font-semibold"
        >
          Search
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Enter title, author, keyword or DOI..."
            className="flex-1 rounded-lg border px-4 py-3"
          />

          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Search
          </button>
        </div>
      </form>

      {!query ? (
        <>
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-8">
            <h2 className="text-xl font-semibold text-blue-900">
              Start your search
            </h2>

            <p className="mt-2 text-blue-800">
              Enter a research topic, author, article title,
              keyword or DOI.
            </p>
          </section>

          {topicKeywords.length > 0 && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">
                Browse by Research Topic
              </h2>

              <p className="mt-2 text-gray-600">
                Keywords used most often across published articles.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {topicKeywords.map((keyword) => (
                  <Link
                    key={keyword.id}
                    href={`/search?q=${encodeURIComponent(
                      keyword.name,
                    )}`}
                    className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
                  >
                    {keyword.name}
                    <span className="ml-1.5 text-blue-500">
                      {keyword._count.articles}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : articles.length === 0 ? (
        <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-8">
          <h2 className="text-xl font-semibold text-yellow-900">
            No results found
          </h2>

          <p className="mt-2 text-yellow-800">
            No published article matched “{query}”.
          </p>

          <p className="mt-2 text-sm text-yellow-700">
            Try fewer words or a broader search term.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">
              Search Results
            </h2>

            <p className="text-sm text-gray-500">
              {articles.length} result
              {articles.length === 1 ? "" : "s"} for “{query}”
            </p>
          </div>

          {articles.map((article) => {
            const authors = article.authors
              .map((author) => author.fullName)
              .join(", ");

            return (
              <article
                key={article.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <Link
                  href={`/articles/${article.slug}`}
                  className="text-2xl font-semibold text-gray-900 hover:text-blue-700"
                >
                  {article.title}
                </Link>

                <p className="mt-3 text-gray-700">
                  {authors || "Author information unavailable"}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                  <span>{article.journal.name}</span>

                  {article.issue && (
                    <span>
                      Volume {article.issue.volume.number},
                      Issue {article.issue.number}
                    </span>
                  )}

                  <span>
                    Published {formatDate(article.publishedAt)}
                  </span>
                </div>

                {article.doi && (
                  <p className="mt-3 text-sm">
                    DOI:{" "}
                    <a
                      href={`https://doi.org/${article.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-medium text-blue-700 hover:underline"
                    >
                      {article.doi}
                    </a>
                  </p>
                )}

                <p className="mt-5 line-clamp-4 leading-7 text-gray-600">
                  {article.abstract}
                </p>

                {article.keywords.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {article.keywords.map((articleKeyword) => (
                      <Link
                        key={articleKeyword.keywordId}
                        href={`/search?q=${encodeURIComponent(
                          articleKeyword.keyword.name,
                        )}`}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800 hover:bg-blue-100"
                      >
                        {articleKeyword.keyword.name}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
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
              </article>
            );
          })}
        </section>
      )}
    </Container>
  );
}
