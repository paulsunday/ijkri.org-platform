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

async function getPublishedArticle(slug: string) {
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

    const authorNames = article.authors.map(
        (author) => author.fullName,
    );

    const keywordNames = article.keywords.map(
        (item) => item.keyword.name,
    );

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
            siteName:
                "International Journal of Knowledge, Research and Innovation",
            publishedTime:
                article.publishedAt?.toISOString(),
            modifiedTime:
                article.updatedAt.toISOString(),
            authors: authorNames,
            images: [
                {
                    url: "/logo.png",
                    width: 1200,
                    height: 1200,
                    alt: article.title,
                },
            ],
        },

        twitter: {
            card: "summary_large_image",
            title: article.title,
            description,
            images: ["/logo.png"],
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

        other: {
            citation_title: article.title,

            citation_journal_title: article.journal.name,

            citation_publication_date:
                article.publishedAt?.toISOString().split("T")[0] || "",

            citation_volume:
                article.issue?.volume.number.toString() || "",

            citation_issue:
                article.issue?.number.toString() || "",

            citation_doi:
                article.doi || "",

            citation_pdf_url:
                article.pdfUrl || "",

            citation_abstract_html_url: canonicalUrl,

            citation_language: "en",

            citation_keywords: keywordNames.join("; "),

            ...Object.fromEntries(
                authorNames.map((author, index) => [
                    `citation_author_${index + 1}`,
                    author,
                ]),
            ),
        },
    };
}

export default async function PublicArticlePage({
    params,
}: PageProps) {
    const { slug } = await params;

    const article = await getPublishedArticle(slug);

    if (!article) {
        notFound();
    }

    const finalPdf =
        article.pdfUrl ||
        article.submission?.productionFiles.find(
            (file) =>
                file.fileType === "FINAL_PUBLICATION_FILE" ||
                file.fileType === "PDF_GALLEY" ||
                file.fileType === "PROOF_FILE",
        )?.fileUrl ||
        null;

    const authorNames = article.authors
        .map((author) => author.fullName)
        .join(", ");

    const canonicalUrl =
        `${siteUrl}/articles/${article.slug}`;

    const citation = [
        authorNames || "Unknown author",
        `(${article.publishedAt?.getFullYear() || "n.d."}).`,
        article.title + ".",
        article.journal.name + ".",
        article.issue
            ? `Vol. ${article.issue.volume.number}, Issue ${article.issue.number}.`
            : "",
        article.doi
            ? `https://doi.org/${article.doi}`
            : canonicalUrl,
    ]
        .filter(Boolean)
        .join(" ");

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        headline: article.title,
        description: article.abstract,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        datePublished:
            article.publishedAt?.toISOString(),
        dateModified:
            article.updatedAt.toISOString(),

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
        })),

        publisher: {
            "@type": "Organization",
            name: "Innovare Academic Publishing",
            logo: {
                "@type": "ImageObject",
                url: `${siteUrl}/logo.png`,
            },
        },

        isPartOf: {
            "@type": "Periodical",
            name: article.journal.name,
            issn:
                article.journal.issnOnline ||
                article.journal.issnPrint ||
                undefined,
        },

        volumeNumber:
            article.issue?.volume.number.toString(),

        issueNumber:
            article.issue?.number.toString(),

        identifier: article.doi
            ? `https://doi.org/${article.doi}`
            : canonicalUrl,

        keywords: article.keywords
            .map((item) => item.keyword.name)
            .join(", "),

        associatedMedia: finalPdf
            ? {
                "@type": "MediaObject",
                contentUrl: finalPdf,
                encodingFormat: "application/pdf",
            }
            : undefined,
    };

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd),
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
                                Volume {article.issue.volume.number},
                                Issue {article.issue.number}
                            </p>
                        )}

                        <p>
                            Published:{" "}
                            {formatDate(article.publishedAt)}
                        </p>

                        {article.doi && (
                            <p>
                                DOI:{" "}
                                <a
                                    href={`https://doi.org/${article.doi}`}
                                    target="_blank"
                                    rel="noreferrer"
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
                                rel="noreferrer"
                                className="inline-flex rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                                Download Full Article PDF
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

            {article.authors.length > 0 && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-semibold">
                        Authors
                    </h2>

                    <div className="mt-5 space-y-5">
                        {article.authors.map((author) => (
                            <article
                                key={author.id}
                                className="rounded-lg border p-5"
                            >
                                <h3 className="font-semibold">
                                    {author.fullName}
                                </h3>

                                {author.affiliation && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {author.affiliation}
                                    </p>
                                )}

                                {author.country && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {author.country}
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
                                            rel="noreferrer"
                                            className="text-blue-700 hover:underline"
                                        >
                                            {author.orcid}
                                        </a>
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {article.keywords.length > 0 && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-semibold">
                        Keywords
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-3">
                        {article.keywords.map(
                            (articleKeyword) => (
                                <span
                                    key={articleKeyword.keywordId}
                                    className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800"
                                >
                                    {articleKeyword.keyword.name}
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

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">
                    How to Cite
                </h2>

                <div className="mt-4 rounded-lg bg-gray-50 p-5 text-sm leading-6">
                    {citation}
                </div>
            </section>

            {article.references.length > 0 && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-semibold">
                        References
                    </h2>

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
                                        rel="noreferrer"
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
                <h2 className="text-xl font-semibold">
                    Publication Information
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <p>
                        <strong>Journal:</strong>{" "}
                        {article.journal.name}
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
                                <strong>Volume:</strong>{" "}
                                {article.issue.volume.number}
                            </p>

                            <p>
                                <strong>Issue:</strong>{" "}
                                {article.issue.number}
                            </p>
                        </>
                    )}

                    <p>
                        <strong>Published:</strong>{" "}
                        {formatDate(article.publishedAt)}
                    </p>

                    <p>
                        <strong>DOI status:</strong>{" "}
                        {article.doiRecord?.status ||
                            "Not registered"}
                    </p>

                    {article.category && (
                        <p>
                            <strong>Category:</strong>{" "}
                            {article.category.name}
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}