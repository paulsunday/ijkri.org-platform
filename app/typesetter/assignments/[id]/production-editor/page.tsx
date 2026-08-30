import Link from "next/link";
import { notFound } from "next/navigation";

import { isSuperAdmin, requireAnyRole } from "@/lib/auth/permissions";
import { TYPESETTER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { RichTextEditor } from "@/components/production/RichTextEditor";

import {
    generateProductionPdf,
    saveProductionDraft,
    updateProductionCorrespondingAuthor,
} from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatDate(value: Date | null | undefined) {
    if (!value) {
        return "Not yet available";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(value);
}

export default async function ProductionEditorPage({
    params,
}: PageProps) {
    const typesetter = await requireAnyRole(TYPESETTER_ROLES);

    const { id } = await params;

    const assignment = await prisma.productionAssignment.findFirst({
        where: {
            id,
            stage: "TYPESETTING",
            ...(isSuperAdmin(typesetter)
                ? {}
                : {
                    assigneeId: typesetter.id,
                }),
        },
        select: {
            id: true,
            status: true,
            submission: {
                select: {
                    id: true,
                    title: true,
                    abstract: true,
                    submittedAt: true,

                    journal: {
                        select: {
                            name: true,
                            issnPrint: true,
                            issnOnline: true,
                        },
                    },

                    submissionAuthors: {
                        orderBy: {
                            sortOrder: "asc",
                        },
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            affiliation: true,
                            orcid: true,
                            isCorresponding: true,
                        },
                    },

                    keywords: {
                        select: {
                            keyword: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },

                    decisions: {
                        where: {
                            decision: "ACCEPTED",
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                        take: 1,
                        select: {
                            createdAt: true,
                        },
                    },

                    article: {
                        select: {
                            title: true,
                            abstract: true,
                            body: true,
                            doi: true,
                            publishedAt: true,

                            issue: {
                                select: {
                                    number: true,
                                    volume: {
                                        select: {
                                            number: true,
                                            year: true,
                                        },
                                    },
                                },
                            },

                            references: {
                                orderBy: {
                                    sortOrder: "asc",
                                },
                                select: {
                                    citation: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!assignment) {
        notFound();
    }

    const canEdit =
        assignment.status === "IN_PROGRESS" ||
        assignment.status === "CHANGES_REQUESTED";

    if (!canEdit) {
        return (
            <main className="mx-auto max-w-5xl space-y-6 p-8">
                <Link
                    href={`/typesetter/assignments/${assignment.id}`}
                    className="text-sm text-blue-700 hover:underline"
                >
                    ← Back to Assignment
                </Link>

                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h1 className="text-xl font-semibold text-yellow-900">
                        Production Editor unavailable
                    </h1>

                    <p className="mt-2 text-sm text-yellow-800">
                        Start this typesetting assignment before editing
                        the production article.
                    </p>
                </section>
            </main>
        );
    }

    const submission = assignment.submission;
    const article = submission.article;

    const initialTitle = article?.title || submission.title;
    const initialAbstractHtml = article?.abstract || submission.abstract;
    const initialBodyHtml = article?.body || "";
    const initialReferencesText =
        article?.references.map((reference) => reference.citation).join("\n") ||
        "";

    const correspondingAuthor = submission.submissionAuthors.find(
        (author) => author.isCorresponding,
    );

    const acceptedAt = submission.decisions[0]?.createdAt ?? null;
    const volume = article?.issue?.volume;

    return (
        <main className="mx-auto max-w-6xl space-y-8 p-8">
            <Link
                href={`/typesetter/assignments/${assignment.id}`}
                className="text-sm text-blue-700 hover:underline"
            >
                ← Back to Assignment
            </Link>

            <div>
                <h1 className="text-3xl font-bold">Production Editor</h1>

                <p className="mt-2 text-gray-600">
                    Prepare the article for publication directly in
                    IJKRI, then generate the publication-ready PDF
                    automatically. The article&apos;s own structure is
                    preserved — there is no required section format.
                </p>
            </div>

            <section className="rounded-xl border bg-white p-6">
                <h2 className="text-xl font-semibold">
                    Production Metadata
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                    Retrieved automatically. Volume, issue, and DOI are
                    assigned when the article is published.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                    <div>
                        <p className="text-sm text-gray-500">Journal</p>
                        <p className="font-medium">{submission.journal.name}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">ISSN</p>
                        <p className="font-medium">
                            {submission.journal.issnOnline ||
                                submission.journal.issnPrint ||
                                "Not assigned"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">DOI</p>
                        <p className="font-medium">
                            {article?.doi || "Not yet assigned"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Volume / Issue
                        </p>
                        <p className="font-medium">
                            {volume && article?.issue
                                ? `Volume ${volume.number}, Issue ${article.issue.number}`
                                : "Assigned at publication"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Received</p>
                        <p className="font-medium">
                            {formatDate(submission.submittedAt)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Accepted</p>
                        <p className="font-medium">
                            {formatDate(acceptedAt)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Published</p>
                        <p className="font-medium">
                            {formatDate(article?.publishedAt)}
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-6">
                <h2 className="text-xl font-semibold">Authors</h2>

                <div className="mt-4 space-y-3">
                    {submission.submissionAuthors.map((author) => (
                        <div
                            key={author.id}
                            className="rounded-lg border p-4"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">
                                    {author.fullName}
                                </p>

                                {author.isCorresponding && (
                                    <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800">
                                        Corresponding Author
                                    </span>
                                )}
                            </div>

                            <p className="mt-1 text-sm text-gray-600">
                                {author.affiliation || "No affiliation on file"}
                            </p>

                            <p className="text-sm text-gray-500">
                                {author.email || "No email on file"}
                                {author.orcid ? ` · ORCID ${author.orcid}` : ""}
                            </p>
                        </div>
                    ))}
                </div>

                <form
                    action={updateProductionCorrespondingAuthor}
                    className="mt-5 flex flex-wrap items-end gap-4 rounded-lg bg-slate-50 p-4"
                >
                    <input
                        type="hidden"
                        name="assignmentId"
                        value={assignment.id}
                    />

                    <div className="min-w-[240px] flex-1">
                        <label
                            htmlFor="submissionAuthorId"
                            className="mb-2 block text-sm font-semibold"
                        >
                            Corresponding Author
                        </label>

                        <select
                            id="submissionAuthorId"
                            name="submissionAuthorId"
                            defaultValue={correspondingAuthor?.id || ""}
                            className="w-full rounded-lg border bg-white p-2.5 text-sm"
                        >
                            <option value="">None assigned</option>

                            {submission.submissionAuthors.map((author) => (
                                <option key={author.id} value={author.id}>
                                    {author.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        Update
                    </button>
                </form>
            </section>

            <form
                id="production-form"
                action={saveProductionDraft}
                className="space-y-8"
            >
                <input
                    type="hidden"
                    name="assignmentId"
                    value={assignment.id}
                />

                <section className="rounded-xl border bg-white p-6">
                    <label
                        htmlFor="title"
                        className="mb-2 block text-xl font-semibold"
                    >
                        Article Title
                    </label>

                    <input
                        id="title"
                        name="title"
                        defaultValue={initialTitle}
                        required
                        className="w-full rounded-lg border p-3 text-lg font-semibold"
                    />
                </section>

                <section className="rounded-xl border bg-white p-6">
                    <h2 className="mb-1 text-xl font-semibold">Abstract</h2>

                    <p className="mb-3 text-sm text-gray-500">
                        Displayed separately from the body in the final
                        PDF.
                    </p>

                    <RichTextEditor
                        name="abstractHtml"
                        initialContent={initialAbstractHtml}
                        minHeightClassName="min-h-[140px]"
                        placeholder="Abstract"
                    />
                </section>

                <section className="rounded-xl border bg-white p-6">
                    <h2 className="text-xl font-semibold">Keywords</h2>

                    <p className="mt-1 text-sm text-gray-600">
                        {submission.keywords.length > 0
                            ? submission.keywords
                                .map((item) => item.keyword.name)
                                .join(", ")
                            : "No keywords on file for this manuscript."}
                    </p>
                </section>

                <section className="rounded-xl border bg-white p-6">
                    <h2 className="mb-1 text-xl font-semibold">Body</h2>

                    <p className="mb-3 text-sm text-gray-500">
                        The complete article. Use headings, lists, tables
                        and images as needed — the article&apos;s own
                        structure is preserved; no predefined sections
                        are required.
                    </p>

                    <RichTextEditor
                        name="bodyHtml"
                        initialContent={initialBodyHtml}
                        minHeightClassName="min-h-[480px]"
                        placeholder="Article body"
                    />
                </section>

                <section className="rounded-xl border bg-white p-6">
                    <h2 className="mb-1 text-xl font-semibold">
                        References
                    </h2>

                    <p className="mb-3 text-sm text-gray-500">
                        One reference per line, in the order they should
                        appear.
                    </p>

                    <textarea
                        name="referencesText"
                        rows={10}
                        defaultValue={initialReferencesText}
                        placeholder={
                            "Smith, J. (2024). Example title. Journal Name, 1(1), 1-10."
                        }
                        className="w-full rounded-lg border p-3 font-mono text-sm"
                    />
                </section>

                <section className="rounded-xl border bg-white p-6">
                    <h2 className="mb-4 text-xl font-semibold">Actions</h2>

                    <div className="flex flex-wrap gap-4">
                        <button
                            type="submit"
                            formAction={saveProductionDraft}
                            className="rounded-lg border border-gray-400 px-6 py-3 font-semibold text-gray-800 hover:bg-gray-50"
                        >
                            Save Draft
                        </button>

                        <button
                            type="submit"
                            formAction={`/api/production/preview-pdf?assignmentId=${assignment.id}`}
                            formTarget="_blank"
                            className="rounded-lg border border-blue-700 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
                        >
                            Preview PDF
                        </button>

                        <button
                            type="submit"
                            formAction={generateProductionPdf}
                            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                        >
                            Generate PDF
                        </button>
                    </div>

                    <p className="mt-4 text-sm text-gray-500">
                        Generate PDF saves the draft, produces the
                        publication-ready PDF, and attaches it to this
                        assignment. Once you are satisfied, return to the
                        assignment page and use the existing Submit for
                        Review action to hand it off to your editor.
                    </p>
                </section>
            </form>
        </main>
    );
}
