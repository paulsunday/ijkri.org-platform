import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import { publishSubmission } from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

const PUBLICATION_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
] as const;

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export default async function PublicationPage({
    params,
}: PageProps) {
    const editor = await requireAnyRole([
        ...PUBLICATION_ROLES,
    ]);

    const { id } = await params;

    const submission =
        await prisma.submission.findUnique({
            where: {
                id,
            },
            include: {
                author: true,
                journal: true,
            },
        });

    if (!submission) {
        notFound();
    }

    const publicationRole =
        await prisma.userJournalRole.findFirst({
            where: {
                userId: editor.id,
                journalId: submission.journalId,
                role: {
                    in: [...PUBLICATION_ROLES],
                },
            },
            select: {
                id: true,
            },
        });

    if (!publicationRole) {
        notFound();
    }

    const issues = await prisma.issue.findMany({
        where: {
            journalId: submission.journalId,
            isPublished: true,
        },
        include: {
            volume: true,
        },
        orderBy: [
            {
                volume: {
                    number: "desc",
                },
            },
            {
                number: "desc",
            },
        ],
    });

    const canPublish =
        submission.status ===
        "READY_FOR_PUBLICATION";

    return (
        <main className="mx-auto max-w-5xl space-y-8 p-8">
            <Link
                href={`/editor/submissions/${submission.id}`}
                className="text-blue-700 hover:underline"
            >
                ← Back
            </Link>

            <div>
                <h1 className="text-3xl font-bold">
                    Publish Article
                </h1>

                <p className="mt-2 text-gray-600">
                    Final publication workflow.
                </p>
            </div>

            <section className="rounded-xl border bg-white p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <strong>Title</strong>
                        <p>{submission.title}</p>
                    </div>

                    <div>
                        <strong>Author</strong>
                        <p>{submission.author.name}</p>
                    </div>

                    <div>
                        <strong>Journal</strong>
                        <p>{submission.journal.name}</p>
                    </div>

                    <div>
                        <strong>Status</strong>
                        <p>
                            {formatStatus(submission.status)}
                        </p>
                    </div>
                </div>
            </section>

            {!canPublish ? (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        Publication unavailable
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        This manuscript must have the status Ready
                        for Publication before it can be published.
                    </p>
                </section>
            ) : issues.length === 0 ? (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        No published issue available
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        Create and publish an issue for this journal
                        before publishing the article.
                    </p>
                </section>
            ) : (
                <form
                    action={publishSubmission}
                    className="space-y-6 rounded-xl border bg-white p-6"
                >
                    <input
                        type="hidden"
                        name="submissionId"
                        value={submission.id}
                    />

                    <div>
                        <label
                            htmlFor="issueId"
                            className="mb-2 block font-semibold"
                        >
                            Volume / Issue
                        </label>

                        <select
                            id="issueId"
                            name="issueId"
                            required
                            defaultValue=""
                            className="w-full rounded border p-3"
                        >
                            <option value="" disabled>
                                Select Issue
                            </option>

                            {issues.map((issue) => (
                                <option
                                    key={issue.id}
                                    value={issue.id}
                                >
                                    Volume {issue.volume.number} Issue{" "}
                                    {issue.number}
                                    {issue.title
                                        ? ` — ${issue.title}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="doi"
                            className="mb-2 block font-semibold"
                        >
                            DOI
                        </label>

                        <input
                            id="doi"
                            type="text"
                            name="doi"
                            className="w-full rounded border p-3"
                            placeholder="10.xxxx/xxxxx"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="publicationDate"
                            className="mb-2 block font-semibold"
                        >
                            Publication Date
                        </label>

                        <input
                            id="publicationDate"
                            type="date"
                            name="publicationDate"
                            required
                            className="w-full rounded border p-3"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="pdfUrl"
                            className="mb-2 block font-semibold"
                        >
                            PDF URL (optional)
                        </label>

                        <input
                            id="pdfUrl"
                            type="url"
                            name="pdfUrl"
                            className="w-full rounded border p-3"
                            placeholder="https://..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
                    >
                        Publish Article
                    </button>
                </form>
            )}
        </main>
    );
}