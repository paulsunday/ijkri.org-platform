import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import ArticleSidebar from "@/components/articles/article-sidebar";
import ArticleActions from "@/components/articles/article-actions";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://ijkri.org";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type CitationAuthor = {
  fullName: string;
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

function createDescription(abstract: string) {
  const cleaned = abstract.replace(/\s+/g, " ").trim();

  if (cleaned.length <= 160) {
    return cleaned;
  }

  return `${cleaned.slice(0, 157).trim()}...`;
}

/*
 * Converts a stored full name into an APA-style name.
 *
 * This journal currently stores names in surname-first order:
 * Kala-Dokubo Esther Boma
 * becomes:
 * Kala-Dokubo, E. B.
 */
function formatApaAuthorName(fullName: string) {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return "";
  }

  if (nameParts.length === 1) {
    return nameParts[0];
  }

  const surname = nameParts[0];

  const initials = nameParts
    .slice(1)
    .map((namePart) => {
      const firstCharacter = namePart.charAt(0).toUpperCase();

      return firstCharacter ? `${firstCharacter}.` : "";
    })
    .filter(Boolean)
    .join(" ");

  return initials ? `${surname}, ${initials}` : surname;
}

/*
 * Produces an APA-style author list.
 *
 * One author:
 * Kala-Dokubo, E. B.
 *
 * Two authors:
 * Kala-Dokubo, E. B., & Agbaeze, E. K.
 *
 * Three or more authors:
 * Author, A. A., Author, B. B., & Author, C. C.
 */
function formatCitationAuthors(authors: CitationAuthor[]) {
  const formattedAuthors = authors
    .map((author) => formatApaAuthorName(author.fullName))
    .filter(Boolean);

  if (formattedAuthors.length === 0) {
    return "Author information unavailable";
  }

  if (formattedAuthors.length === 1) {
    return formattedAuthors[0];
  }

  if (formattedAuthors.length === 2) {
    return `${formattedAuthors[0]}, & ${formattedAuthors[1]}`;
  }

  const authorsBeforeLast = formattedAuthors.slice(0, -1).join(", ");

  const finalAuthor = formattedAuthors[formattedAuthors.length - 1];

  return `${authorsBeforeLast}, & ${finalAuthor}`;
}

function sentenceCaseTitle(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

async function getPublishedArticle(slug: string) {
  return prisma.article.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },

    include: {
      journal: {
        include: {
          publisher: true,
        },
      },

      issue: {
        include: {
          volume: true,
        },
      },

      category: true,

      /*
       * Step 6.3:
       * Always load article authors in publication order.
       */
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

      references: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      doiRecord: true,

      submission: {
        include: {
          productionFiles: {
            where: {
              isFinal: true,
            },

            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });
}

function normalizeOrcid(
  orcid: string | null | undefined,
): string | null {
  const trimmed = orcid
    ?.replace("https://orcid.org/", "")
    .trim();

  return trimmed || null;
}

/**
 * Authors are stored as free-text ArticleAuthor rows (no
 * relation to User), so a verified ORCID iD is confirmed by
 * matching the author's ORCID string against a User account
 * that has completed ORCID OAuth verification.
 */
async function getVerifiedOrcidSet(
  orcids: (string | null)[],
): Promise<Set<string>> {
  const uniqueOrcids = Array.from(
    new Set(orcids.filter((value): value is string => Boolean(value))),
  );

  if (uniqueOrcids.length === 0) {
    return new Set();
  }

  const verifiedUsers = await prisma.user.findMany({
    where: {
      orcid: {
        in: uniqueOrcids,
      },
      orcidVerifiedAt: {
        not: null,
      },
    },
    select: {
      orcid: true,
    },
  });

  return new Set(
    verifiedUsers
      .map((user) => user.orcid)
      .filter((value): value is string => Boolean(value)),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const article = await getPublishedArticle(slug);

  if (!article) {
    return {
      title: "Article Not Found",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl = `${siteUrl}/articles/${article.slug}`;

  const description = createDescription(article.abstract);
  const authorNames = article.authors.map((author) => author.fullName);

  const keywordNames = article.keywords.map((item) => item.keyword.name);

  return {
    title: article.title,
    description,

    keywords: keywordNames,

    authors: authorNames.map((name) => ({
      name,
    })),

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: article.title,
      description,

      siteName: "International Journal of Knowledge, Research and Innovation",

      publishedTime: article.publishedAt?.toISOString(),

      modifiedTime: article.updatedAt.toISOString(),
      authors: authorNames,

      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: ["/opengraph-image.png"],
    },

    robots: {
      index: true,
      follow: true,

      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },

    /*
     * Academic metadata used by Google Scholar
     * and related scholarly discovery services.
     */
    other: {
      citation_title: article.title,

      citation_journal_title: article.journal.name,

      citation_issn:
        article.journal.issnOnline || article.journal.issnPrint || "",

      citation_publisher:
        article.journal.publisher?.name || article.journal.name,

      citation_publication_date:
        article.publishedAt?.toISOString().split("T")[0] || "",

      citation_volume: article.issue?.volume.number.toString() || "",

      citation_issue: article.issue?.number.toString() || "",

      citation_doi: article.doi || "",

      citation_pdf_url: article.pdfUrl
        ? article.pdfUrl.startsWith("http")
          ? article.pdfUrl
          : `${siteUrl}${article.pdfUrl}`
        : "",

      citation_abstract_html_url: canonicalUrl,

      citation_language: "en",

      citation_keywords: keywordNames.join("; "),
      citation_author: authorNames,

      /*
       * Next.js metadata objects cannot contain
       * repeated object keys, so each author gets
       * a numbered metadata key.
       */
    },
  };
}

export default async function PublicArticlePage({ params }: PageProps) {
  const { slug } = await params;

  const article = await getPublishedArticle(slug);

  if (!article) {
    notFound();
  }

  const verifiedOrcids = await getVerifiedOrcidSet(
    article.authors.map((author) => normalizeOrcid(author.orcid)),
  );

  const productionFile = article.submission?.productionFiles.find(
    (file) =>
      file.fileType === "FINAL_PUBLICATION_FILE" ||
      file.fileType === "PDF_GALLEY" ||
      file.fileType === "PROOF_FILE",
  );

  const finalPdf =
    article.pdfUrl ||
    (productionFile
      ? `/api/production-files/${productionFile.id}/download`
      : null);

  const canonicalUrl = `${siteUrl}/articles/${article.slug}`;

  /*
   * Step 6.4:
   * Generate a complete citation using every
   * ArticleAuthor record in sort order.
   */
  const publicationYear =
    article.publishedAt?.getFullYear() || new Date().getFullYear();

  const citationAuthors = formatCitationAuthors(article.authors);

  const citationDestination = article.doi
    ? `https://doi.org/${article.doi}`
    : canonicalUrl;

  const volumeIssue = article.issue
    ? `${article.issue.volume.number}(${article.issue.number})`
    : "";

  const citation = [
    `${citationAuthors} (${publicationYear}).`,
    `${sentenceCaseTitle(article.title)}.`,
    article.journal.name,
    volumeIssue ? `${volumeIssue}.` : "",
    citationDestination,
  ]
    .filter(Boolean)
    .join(" ");

  const publicPdfUrl = finalPdf
    ? finalPdf.startsWith("http")
      ? finalPdf
      : `${siteUrl}${finalPdf}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",

    "@type": "ScholarlyArticle",

    headline: article.title,

    description: article.abstract,

    url: canonicalUrl,

    mainEntityOfPage: canonicalUrl,

    datePublished: article.publishedAt?.toISOString(),

    dateModified: article.updatedAt.toISOString(),

    author: article.authors.map((author) => ({
      "@type": "Person",
      name: author.fullName,

      affiliation: author.affiliation
        ? {
            "@type": "Organization",
            name: author.affiliation,
          }
        : undefined,

      identifier: author.orcid || undefined,

      sameAs: author.orcid
        ? `https://orcid.org/${author.orcid.replace("https://orcid.org/", "")}`
        : undefined,
    })),

    publisher: {
      "@type": "Organization",

      name: "Innovare Academic Publishing",

      logo: {
        "@type": "ImageObject",

        url: `${siteUrl}/icon.png`,
      },
    },

    isPartOf: {
      "@type": "Periodical",

      name: article.journal.name,

      issn:
        article.journal.issnOnline || article.journal.issnPrint || undefined,
    },

    volumeNumber: article.issue?.volume.number.toString(),

    issueNumber: article.issue?.number.toString(),

    identifier: article.doi ? `https://doi.org/${article.doi}` : canonicalUrl,

    keywords: article.keywords.map((item) => item.keyword.name).join(", "),

    associatedMedia: publicPdfUrl
      ? {
          "@type": "MediaObject",

          contentUrl: publicPdfUrl,

          encodingFormat: "application/pdf",
        }
      : undefined,
  };

  return (
    <main className="bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/"
              className="font-medium text-slate-600 hover:text-blue-700"
            >
              Journal Home
            </Link>

            <Link
              href="/current-issue"
              className="font-medium text-slate-600 hover:text-blue-700"
            >
              Current Issue
            </Link>

            <Link
              href="/archives"
              className="font-medium text-slate-600 hover:text-blue-700"
            >
              Archives
            </Link>

            <Link
              href="/about"
              className="font-medium text-slate-600 hover:text-blue-700"
            >
              About the Journal
            </Link>

            <Link
              href="/author-guidelines"
              className="font-medium text-slate-600 hover:text-blue-700"
            >
              Author Guidelines
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/current-issue"
            className="inline-flex items-center text-sm font-semibold text-blue-700 hover:underline"
          >
            ← Back to Current Issue
          </Link>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ArticleSidebar
            journalName={article.journal.name}
            volume={article.issue?.volume.number}
            issue={article.issue?.number}
            publishedDate={formatDate(article.publishedAt)}
            doi={article.doi}
            issnPrint={article.journal.issnPrint}
            issnOnline={article.journal.issnOnline}
          />

          <article className="min-w-0 space-y-8">
            <header className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b bg-slate-900 px-7 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                    {article.category?.name || "Research Article"}
                  </p>

                  {article.issue && (
                    <p className="text-sm text-slate-300">
                      Volume {article.issue.volume.number}, Issue{" "}
                      {article.issue.number}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-7 py-8 md:px-10 md:py-10">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  {article.journal.name}
                </p>

                <h1 className="mt-4 max-w-5xl text-3xl font-bold leading-tight tracking-tight text-slate-950 md:text-5xl">
                  {article.title}
                </h1>

                {article.authors.length > 0 ? (
                  <div className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-2">
                    {article.authors.map((author, index) => (
                      <span
                        key={author.id}
                        className="inline-flex items-center"
                      >
                        <a
                          href={`#author-${author.id}`}
                          className="text-lg font-semibold text-blue-800 hover:underline"
                        >
                          {author.fullName}
                        </a>

                        <sup className="ml-1 text-xs font-bold text-slate-500">
                          {index + 1}
                        </sup>

                        {index < article.authors.length - 1 && (
                          <span className="ml-1 text-slate-400">,</span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-7 text-lg text-slate-600">
                    Author information unavailable
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t pt-6 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Published:
                    </span>{" "}
                    {formatDate(article.publishedAt)}
                  </p>

                  {article.issue && (
                    <p>
                      <span className="font-semibold text-slate-900">
                        Issue:
                      </span>{" "}
                      Volume {article.issue.volume.number}, Issue{" "}
                      {article.issue.number}
                    </p>
                  )}

                  {article.doi && (
                    <p>
                      <span className="font-semibold text-slate-900">DOI:</span>{" "}
                      <a
                        href={`https://doi.org/${article.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {article.doi}
                      </a>
                    </p>
                  )}
                </div>

                <ArticleActions
                  articleTitle={article.title}
                  articleUrl={canonicalUrl}
                  citation={citation}
                  doi={article.doi}
                  pdfUrl={finalPdf}
                />
              </div>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Abstract</h2>

              <div className="mt-4 whitespace-pre-wrap leading-7 text-gray-700">
                {article.abstract}
              </div>
            </section>

            {article.authors.length > 0 && (
              <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b bg-slate-50 px-6 py-5 md:px-8">
                  <h2 className="text-2xl font-bold text-slate-950">
                    Author Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Institutional affiliations, countries, and ORCID records of
                    the article authors.
                  </p>
                </div>

                <div className="divide-y divide-slate-200">
                  {article.authors.map((author, index) => {
                    const cleanOrcid = normalizeOrcid(
                      author.orcid,
                    );

                    const isOrcidVerified = Boolean(
                      cleanOrcid &&
                        verifiedOrcids.has(cleanOrcid),
                    );

                    return (
                      <div
                        id={`author-${author.id}`}
                        key={author.id}
                        className="scroll-mt-28 grid gap-4 px-6 py-6 md:grid-cols-[48px_minmax(0,1fr)] md:px-8"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-800">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <h3 className="text-lg font-bold text-slate-950">
                              {author.fullName}
                            </h3>

                            {index === 0 && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                                First Author
                              </span>
                            )}
                          </div>

                          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                            {author.affiliation && (
                              <p>
                                <span className="font-semibold text-slate-800">
                                  Affiliation:
                                </span>{" "}
                                {author.affiliation}
                              </p>
                            )}

                            {author.country && (
                              <p>
                                <span className="font-semibold text-slate-800">
                                  Country:
                                </span>{" "}
                                {author.country}
                              </p>
                            )}

                            {cleanOrcid && (
                              <p>
                                <span className="font-semibold text-slate-800">
                                  ORCID:
                                </span>{" "}
                                <a
                                  href={`https://orcid.org/${cleanOrcid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-700 hover:underline"
                                >
                                  {cleanOrcid}
                                </a>
                                {isOrcidVerified && (
                                  <span className="ml-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                                    Verified
                                  </span>
                                )}
                              </p>
                            )}

                            {!author.affiliation &&
                              !author.country &&
                              !cleanOrcid && (
                                <p className="text-slate-500">
                                  No additional author information is available.
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {article.keywords.length > 0 && (
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">Keywords</h2>

                <div className="mt-4 flex flex-wrap gap-3">
                  {article.keywords.map((articleKeyword) => (
                    <span
                      key={articleKeyword.keywordId}
                      className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800"
                    >
                      {articleKeyword.keyword.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {article.body && (
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">Article</h2>

                <div className="mt-5 whitespace-pre-wrap leading-7 text-gray-700">
                  {article.body}
                </div>
              </section>
            )}

            {/* Step 6.5: Corrected citation output */}
            <section
              id="how-to-cite"
              className="scroll-mt-28 rounded-xl border bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-semibold">How to Cite</h2>

              <p className="mt-2 text-sm text-gray-600">APA 7th edition</p>

              <div className="mt-5 rounded-lg bg-gray-50 p-5">
                <p className="leading-7 text-gray-800">{citation}</p>
              </div>
            </section>

            {article.references.length > 0 && (
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">References</h2>

                <ol className="mt-5 list-decimal space-y-4 pl-6 text-sm leading-6">
                  {article.references.map((reference) => (
                    <li key={reference.id}>
                      <p>{reference.citation}</p>

                      {reference.doi && (
                        <p className="mt-1 text-blue-700">
                          DOI: {reference.doi}
                        </p>
                      )}

                      {reference.url && (
                        <a
                          href={reference.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-blue-700 hover:underline"
                        >
                          View source
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="rounded-xl border bg-gray-50 p-6">
              <h2 className="text-xl font-semibold">Publication Information</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <p>
                  <strong>Journal:</strong> {article.journal.name}
                </p>

                <p>
                  <strong>ISSN:</strong>{" "}
                  {article.journal.issnOnline ||
                    article.journal.issnPrint ||
                    "Not available"}
                </p>

                {article.issue && (
                  <>
                    <p>
                      <strong>Volume:</strong> {article.issue.volume.number}
                    </p>

                    <p>
                      <strong>Issue:</strong> {article.issue.number}
                    </p>
                  </>
                )}

                <p>
                  <strong>Published:</strong> {formatDate(article.publishedAt)}
                </p>

                <p>
                  <strong>DOI status:</strong>{" "}
                  {article.doiRecord?.status || "Not registered"}
                </p>

                {article.category && (
                  <p>
                    <strong>Category:</strong> {article.category.name}
                  </p>
                )}
              </div>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}
