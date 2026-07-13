import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageProps = {
    params: Promise<{
        id: string;
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

export default async function PublicArticlePage({
    params,
}: PageProps) {
    const { id } = await params;

    const article = await prisma.article.findUnique({
        where: {
            id,
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

    if (!article || article.status !== "PUBLISHED") {
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

    const citation = [
        authorNames || "Unknown author",
        `(${article.publishedAt?.getFullYear() || "n.d."}).`,
        article.title + ".",
        article.journal.name + ".",
        article.issue
            ? `Vol. ${article.issue.volume.number}, Issue ${article.issue.number}.`
            : "",
        article.doi ? `https://doi.org/${article.doi}` : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
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
                            {authorNames || "Author information unavailable"}
                        </p>

                        {article.issue && (
                            <p>
                                Volume {article.issue.volume.number}, Issue{" "}
                                {article.issue.number}
                            </p>
                        )}

                        <p>
                            Published: {formatDate(article.publishedAt)}
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
                                        ORCID: {author.orcid}
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
                        {article.doiRecord?.status || "Not registered"}
                    </p>
                </div>
            </section>
        </main>
    );
}