import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

type PageProps = {
    params: Promise<{
        slug: string;
    }>;
};

type CitationAuthor = {
    fullName: string;
};

function formatDate(
    value: Date | null | undefined,
) {
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
    const cleaned = abstract
        .replace(/\s+/g, " ")
        .trim();

    if (cleaned.length <= 160) {
        return cleaned;
    }

    return `${cleaned
        .slice(0, 157)
        .trim()}...`;
}

/*
 * Converts a stored full name into an APA-style name.
 *
 * This journal currently stores names in surname-first order:
 * Kala-Dokubo Esther Boma
 * becomes:
 * Kala-Dokubo, E. B.
 */
function formatApaAuthorName(
    fullName: string,
) {
    const nameParts = fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean);

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
            const firstCharacter =
                namePart.charAt(0).toUpperCase();

            return firstCharacter
                ? `${firstCharacter}.`
                : "";
        })
        .filter(Boolean)
        .join(" ");

    return initials
        ? `${surname}, ${initials}`
        : surname;
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
function formatCitationAuthors(
    authors: CitationAuthor[],
) {
    const formattedAuthors = authors
        .map((author) =>
            formatApaAuthorName(
                author.fullName,
            ),
        )
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

    const authorsBeforeLast =
        formattedAuthors
            .slice(0, -1)
            .join(", ");

    const finalAuthor =
        formattedAuthors[
        formattedAuthors.length - 1
        ];

    return `${authorsBeforeLast}, & ${finalAuthor}`;
}

function sentenceCaseTitle(
    value: string,
) {
    const cleaned = value.trim();

    if (!cleaned) {
        return "";
    }

    return (
        cleaned.charAt(0).toUpperCase() +
        cleaned.slice(1)
    );
}

async function getPublishedArticle(
    slug: string,
) {
    return prisma.article.findFirst({
        where: {
            slug,
            status: "PUBLISHED",
        },

        include: {
            journal: true,

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

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;

    const article =
        await getPublishedArticle(slug);

    if (!article) {
        return {
            title: "Article Not Found",

            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const canonicalUrl =
        `${siteUrl}/articles/${article.slug}`;

    const description =
        createDescription(article.abstract);

    const authorNames =
        article.authors.map(
            (author) => author.fullName,
        );

    const keywordNames =
        article.keywords.map(
            (item) => item.keyword.name,
        );

    return {
        title: article.title,
        description,

        keywords: keywordNames,

        authors: authorNames.map(
            (name) => ({
                name,
            }),
        ),

        alternates: {
            canonical: canonicalUrl,
        },

        openGraph: {
            type: "article",
            url: canonicalUrl,
            title: article.title,
            description,

            siteName:
                "International Journal of Knowledge, Research and Innovation",

            publishedTime:
                article.publishedAt?.toISOString(),

            modifiedTime:
                article.updatedAt.toISOString(),

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
            images: [
                "/opengraph-image.png",
            ],
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
            citation_title:
                article.title,

            citation_journal_title:
                article.journal.name,

            citation_publication_date:
                article.publishedAt
                    ?.toISOString()
                    .split("T")[0] || "",

            citation_volume:
                article.issue?.volume.number
                    .toString() || "",

            citation_issue:
                article.issue?.number
                    .toString() || "",

            citation_doi:
                article.doi || "",

            citation_pdf_url:
                article.pdfUrl
                    ? article.pdfUrl.startsWith(
                        "http",
                    )
                        ? article.pdfUrl
                        : `${siteUrl}${article.pdfUrl}`
                    : "",

            citation_abstract_html_url:
                canonicalUrl,

            citation_language:
                "en",

            citation_keywords:
                keywordNames.join("; "),

            /*
             * Next.js metadata objects cannot contain
             * repeated object keys, so each author gets
             * a numbered metadata key.
             */
            ...Object.fromEntries(
                authorNames.map(
                    (authorName, index) => [
                        `citation_author_${index + 1
                        }`,
                        authorName,
                    ],
                ),
            ),
        },
    };
}

export default async function PublicArticlePage({
    params,
}: PageProps) {
    const { slug } = await params;

    const article =
        await getPublishedArticle(slug);

    if (!article) {
        notFound();
    }

    const productionFile =
        article.submission
            ?.productionFiles.find(
                (file) =>
                    file.fileType ===
                    "FINAL_PUBLICATION_FILE" ||
                    file.fileType ===
                    "PDF_GALLEY" ||
                    file.fileType ===
                    "PROOF_FILE",
            );

    const finalPdf =
        article.pdfUrl ||
        (productionFile
            ? `/api/production-files/${productionFile.id}/download`
            : null);

    const authorNames =
        article.authors
            .map(
                (author) =>
                    author.fullName,
            )
            .join(", ");

    const canonicalUrl =
        `${siteUrl}/articles/${article.slug}`;

    /*
     * Step 6.4:
     * Generate a complete citation using every
     * ArticleAuthor record in sort order.
     */
    const publicationYear =
        article.publishedAt
            ?.getFullYear() ||
        new Date().getFullYear();

    const citationAuthors =
        formatCitationAuthors(
            article.authors,
        );

    const citationDestination =
        article.doi
            ? `https://doi.org/${article.doi}`
            : canonicalUrl;

    const volumeIssue =
        article.issue
            ? `${article.issue.volume.number}(${article.issue.number})`
            : "";

    const citation = [
        `${citationAuthors} (${publicationYear}).`,
        `${sentenceCaseTitle(
            article.title,
        )}.`,
        article.journal.name,
        volumeIssue
            ? `${volumeIssue}.`
            : "",
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
        "@context":
            "https://schema.org",

        "@type":
            "ScholarlyArticle",

        headline:
            article.title,

        description:
            article.abstract,

        url:
            canonicalUrl,

        mainEntityOfPage:
            canonicalUrl,

        datePublished:
            article.publishedAt?.toISOString(),

        dateModified:
            article.updatedAt.toISOString(),

        author:
            article.authors.map(
                (author) => ({
                    "@type": "Person",
                    name: author.fullName,

                    affiliation:
                        author.affiliation
                            ? {
                                "@type":
                                    "Organization",
                                name:
                                    author.affiliation,
                            }
                            : undefined,

                    identifier:
                        author.orcid ||
                        undefined,

                    sameAs:
                        author.orcid
                            ? `https://orcid.org/${author.orcid.replace(
                                "https://orcid.org/",
                                "",
                            )}`
                            : undefined,
                }),
            ),

        publisher: {
            "@type":
                "Organization",

            name:
                "Innovare Academic Publishing",

            logo: {
                "@type":
                    "ImageObject",

                url:
                    `${siteUrl}/icon.png`,
            },
        },

        isPartOf: {
            "@type":
                "Periodical",

            name:
                article.journal.name,

            issn:
                article.journal
                    .issnOnline ||
                article.journal
                    .issnPrint ||
                undefined,
        },

        volumeNumber:
            article.issue?.volume.number
                .toString(),

        issueNumber:
            article.issue?.number
                .toString(),

        identifier:
            article.doi
                ? `https://doi.org/${article.doi}`
                : canonicalUrl,

        keywords:
            article.keywords
                .map(
                    (item) =>
                        item.keyword.name,
                )
                .join(", "),

        associatedMedia:
            publicPdfUrl
                ? {
                    "@type":
                        "MediaObject",

                    contentUrl:
                        publicPdfUrl,

                    encodingFormat:
                        "application/pdf",
                }
                : undefined,
    };

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html:
                        JSON.stringify(
                            jsonLd,
                        ),
                }}
            />

            <header>
                <Link
                    href="/current-issue"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to Current Issue
                </Link>

                <div className="mt-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                        {article.journal.name}
                    </p>

                    <h1 className="mt-3 text-4xl font-bold leading-tight">
                        {article.title}
                    </h1>

                    <div className="mt-5 space-y-2 text-gray-700">
                        <p className="text-lg font-medium">
                            {authorNames ||
                                "Author information unavailable"}
                        </p>

                        {article.issue && (
                            <p>
                                Volume{" "}
                                {
                                    article.issue
                                        .volume.number
                                }
                                , Issue{" "}
                                {
                                    article.issue
                                        .number
                                }
                            </p>
                        )}

                        <p>
                            Published:{" "}
                            {formatDate(
                                article.publishedAt,
                            )}
                        </p>

                        {article.doi && (
                            <p>
                                DOI:{" "}
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

                    {finalPdf && (
                        <div className="mt-6">
                            <a
                                href={finalPdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                                View Full Article PDF
                            </a>
                        </div>
                    )}
                </div>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">
                    Abstract
                </h2>

                <div className="mt-4 whitespace-pre-wrap leading-7 text-gray-700">
                    {article.abstract}
                </div>
            </section>

            {article.authors.length >
                0 && (
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-semibold">
                            Authors
                        </h2>

                        <div className="mt-5 space-y-5">
                            {article.authors.map(
                                (author) => (
                                    <article
                                        key={author.id}
                                        className="rounded-lg border p-5"
                                    >
                                        <h3 className="font-semibold">
                                            {
                                                author.fullName
                                            }
                                        </h3>

                                        {author.affiliation && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                {
                                                    author.affiliation
                                                }
                                            </p>
                                        )}

                                        {author.country && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                {
                                                    author.country
                                                }
                                            </p>
                                        )}

                                        {author.orcid && (
                                            <p className="mt-2 text-sm">
                                                ORCID:{" "}
                                                <a
                                                    href={`https://orcid.org/${author.orcid.replace(
                                                        "https://orcid.org/",
                                                        "",
                                                    )}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-700 hover:underline"
                                                >
                                                    {
                                                        author.orcid
                                                    }
                                                </a>
                                            </p>
                                        )}
                                    </article>
                                ),
                            )}
                        </div>
                    </section>
                )}

            {article.keywords.length >
                0 && (
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-semibold">
                            Keywords
                        </h2>

                        <div className="mt-4 flex flex-wrap gap-3">
                            {article.keywords.map(
                                (
                                    articleKeyword,
                                ) => (
                                    <span
                                        key={
                                            articleKeyword.keywordId
                                        }
                                        className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800"
                                    >
                                        {
                                            articleKeyword
                                                .keyword.name
                                        }
                                    </span>
                                ),
                            )}
                        </div>
                    </section>
                )}

            {article.body && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-semibold">
                        Article
                    </h2>

                    <div className="mt-5 whitespace-pre-wrap leading-7 text-gray-700">
                        {article.body}
                    </div>
                </section>
            )}

            {/* Step 6.5: Corrected citation output */}
            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">
                    How to Cite
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                    APA 7th edition
                </p>

                <div className="mt-5 rounded-lg bg-gray-50 p-5">
                    <p className="leading-7 text-gray-800">
                        {citation}
                    </p>
                </div>
            </section>

            {article.references.length >
                0 && (
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-semibold">
                            References
                        </h2>

                        <ol className="mt-5 list-decimal space-y-4 pl-6 text-sm leading-6">
                            {article.references.map(
                                (reference) => (
                                    <li
                                        key={
                                            reference.id
                                        }
                                    >
                                        <p>
                                            {
                                                reference.citation
                                            }
                                        </p>

                                        {reference.doi && (
                                            <p className="mt-1 text-blue-700">
                                                DOI:{" "}
                                                {
                                                    reference.doi
                                                }
                                            </p>
                                        )}

                                        {reference.url && (
                                            <a
                                                href={
                                                    reference.url
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 block text-blue-700 hover:underline"
                                            >
                                                View source
                                            </a>
                                        )}
                                    </li>
                                ),
                            )}
                        </ol>
                    </section>
                )}

            <section className="rounded-xl border bg-gray-50 p-6">
                <h2 className="text-xl font-semibold">
                    Publication Information
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <p>
                        <strong>
                            Journal:
                        </strong>{" "}
                        {article.journal.name}
                    </p>

                    <p>
                        <strong>
                            ISSN:
                        </strong>{" "}
                        {article.journal
                            .issnOnline ||
                            article.journal
                                .issnPrint ||
                            "Not available"}
                    </p>

                    {article.issue && (
                        <>
                            <p>
                                <strong>
                                    Volume:
                                </strong>{" "}
                                {
                                    article.issue
                                        .volume.number
                                }
                            </p>

                            <p>
                                <strong>
                                    Issue:
                                </strong>{" "}
                                {
                                    article.issue
                                        .number
                                }
                            </p>
                        </>
                    )}

                    <p>
                        <strong>
                            Published:
                        </strong>{" "}
                        {formatDate(
                            article.publishedAt,
                        )}
                    </p>

                    <p>
                        <strong>
                            DOI status:
                        </strong>{" "}
                        {article.doiRecord
                            ?.status ||
                            "Not registered"}
                    </p>

                    {article.category && (
                        <p>
                            <strong>
                                Category:
                            </strong>{" "}
                            {
                                article.category
                                    .name
                            }
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}