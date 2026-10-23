import Link from "next/link";
import { notFound } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";



type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(date: Date | null | undefined) {
    if (!date) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default async function EditorRevisionHistoryPage({
    params,
}: PageProps) {
    const editor =
        await requireAnyRole(EDITORIAL_ROLES);
    const { id } = await params;

    const submission = await prisma.submission.findUnique({
        where: {
            id,
        },
        include: {
            journal: true,
            author: true,

            files: {
                orderBy: {
                    createdAt: "asc",
                },
            },

            versions: {
                include: {
                    uploadedBy: true,
                },
                orderBy: {
                    versionNumber: "desc",
                },
            },

            decisions: {
                include: {
                    editor: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });

    if (!submission) {
        notFound();
    }
    if (!isSuperAdmin(editor)) {
        const editorJournalRole =
            await prisma.userJournalRole.findFirst({
                where: {
                    userId: editor.id,
                    journalId: submission.journalId,
                    role: {
                        in: EDITORIAL_ROLES,
                    },
                },
                select: {
                    id: true,
                },
            });

        if (!editorJournalRole) {
            notFound();
        }
    }
    const newestVersion = submission.versions[0];

    const currentVersionNumber =
        newestVersion?.versionNumber ?? 1;

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href={`/editor/submissions/${submission.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to editor workspace
                </Link>

                <Link
                    href={`/editor/submissions/${submission.id}/review-rounds`}
                    className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800"
                >
                    Review-Round Summary
                </Link>

                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Revision History
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Review all manuscript versions and the author’s
                            responses before making another editorial decision.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {newestVersion &&
                            submission.status !== "ACCEPTED" &&
                            submission.status !== "REJECTED" &&
                            submission.status !== "PUBLISHED" &&
                            submission.status !== "WITHDRAWN" && (
                                <Link
                                    href={`/editor/submissions/${submission.id}/review-rounds/new`}
                                    className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
                                >
                                    Start Next Review Round
                                </Link>

                            )}

                        <Link
                            href={`/editor/submissions/${submission.id}/decisions`}
                            className="rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
                        >
                            Make Editorial Decision
                        </Link>
                    </div>

                </div>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Manuscript Information
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">
                            Manuscript title
                        </p>
                        <p className="font-medium">
                            {submission.title}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Journal
                        </p>
                        <p className="font-medium">
                            {submission.journal.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Author
                        </p>
                        <p className="font-medium">
                            {submission.author.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Author email
                        </p>
                        <p className="font-medium">
                            {submission.author.email}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Current status
                        </p>
                        <p className="font-medium">
                            {formatStatus(submission.status)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Current version
                        </p>
                        <p className="font-medium">
                            Version {currentVersionNumber}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Original submission date
                        </p>
                        <p className="font-medium">
                            {formatDate(
                                submission.submittedAt ??
                                submission.createdAt,
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Manuscript type
                        </p>
                        <p className="font-medium">
                            {submission.manuscriptType ||
                                "Not specified"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Latest Revision
                </h2>

                {!newestVersion ? (
                    <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                        <p className="font-semibold text-yellow-900">
                            No revised version has been uploaded.
                        </p>

                        <p className="mt-2 text-sm text-yellow-800">
                            The manuscript currently contains only its
                            original submission files.
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-blue-950">
                                    Version {newestVersion.versionNumber}
                                </p>

                                <p className="mt-1 text-sm text-blue-800">
                                    Uploaded by {newestVersion.uploadedBy.name} on{" "}
                                    {formatDate(newestVersion.createdAt)}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <a
                                    href={`/api/submission-versions/${newestVersion.id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                >
                                    Download Revised Manuscript
                                </a>

                                {newestVersion.responseFileUrl && (
                                    <a
                                        href={`/api/submission-versions/${newestVersion.id}/download?file=response`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                                    >
                                        Download Response to Reviewers
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 grid gap-5">
                            <div>
                                <p className="text-sm font-semibold text-blue-950">
                                    Revised manuscript filename
                                </p>

                                <p className="mt-1 text-sm text-blue-900">
                                    {newestVersion.manuscriptFileName ||
                                        "Filename not recorded"}
                                </p>
                            </div>

                            {newestVersion.responseFileName && (
                                <div>
                                    <p className="text-sm font-semibold text-blue-950">
                                        Response file
                                    </p>

                                    <p className="mt-1 text-sm text-blue-900">
                                        {newestVersion.responseFileName}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm font-semibold text-blue-950">
                                    Revision cover letter
                                </p>

                                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-gray-800">
                                    {newestVersion.coverLetter ||
                                        "No revision cover letter was provided."}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-blue-950">
                                    Additional author notes
                                </p>

                                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-gray-800">
                                    {newestVersion.authorNotes ||
                                        "No additional notes were provided."}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    All Manuscript Versions
                </h2>

                <div className="mt-6 space-y-5">
                    {submission.versions.map((version) => (
                        <article
                            key={version.id}
                            className="rounded-xl border p-5"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Version {version.versionNumber}
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-600">
                                        Uploaded by {version.uploadedBy.name} on{" "}
                                        {formatDate(version.createdAt)}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <a
                                        href={`/api/submission-versions/${version.id}/download`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-semibold text-blue-700 hover:underline"
                                    >
                                        Download manuscript
                                    </a>

                                    {version.responseFileUrl && (
                                        <a
                                            href={`/api/submission-versions/${version.id}/download?file=response`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm font-semibold text-blue-700 hover:underline"
                                        >
                                            Download response
                                        </a>
                                    )}
                                </div>
                            </div>

                            {version.coverLetter && (
                                <div className="mt-5">
                                    <p className="text-sm font-semibold">
                                        Cover letter
                                    </p>

                                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                                        {version.coverLetter}
                                    </div>
                                </div>
                            )}

                            {version.authorNotes && (
                                <div className="mt-5">
                                    <p className="text-sm font-semibold">
                                        Author notes
                                    </p>

                                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                                        {version.authorNotes}
                                    </div>
                                </div>
                            )}
                        </article>
                    ))}

                    <article className="rounded-xl border p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Version 1 — Original Submission
                                </h3>

                                <p className="mt-1 text-sm text-gray-600">
                                    Submitted by {submission.author.name} on{" "}
                                    {formatDate(
                                        submission.submittedAt ??
                                        submission.createdAt,
                                    )}
                                </p>
                            </div>
                        </div>

                        {submission.files.length === 0 ? (
                            <p className="mt-4 text-sm text-gray-600">
                                No original manuscript files were found.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-2">
                                {submission.files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                {file.fileName}
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                {file.label ||
                                                    file.fileType ||
                                                    "Submission file"}
                                            </p>
                                        </div>

                                        <a
                                            href={`/api/submission-files/${file.id}/download`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm font-semibold text-blue-700 hover:underline"
                                        >
                                            Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Editorial Decision History
                </h2>

                {submission.decisions.length === 0 ? (
                    <p className="mt-4 text-gray-600">
                        No editorial decisions have been recorded.
                    </p>
                ) : (
                    <div className="mt-5 space-y-4">
                        {submission.decisions.map((decision) => (
                            <article
                                key={decision.id}
                                className="rounded-lg border p-4"
                            >
                                <div className="flex flex-wrap justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            {formatStatus(decision.decision)}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            By {decision.editor.name} on{" "}
                                            {formatDate(decision.createdAt)}
                                        </p>
                                    </div>

                                    {decision.revisionDeadline && (
                                        <p className="text-sm font-medium">
                                            Deadline:{" "}
                                            {formatDate(
                                                decision.revisionDeadline,
                                            )}
                                        </p>
                                    )}
                                </div>

                                {decision.comments && (
                                    <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                                        {decision.comments}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}