import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { submitRevision } from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export default async function AuthorRevisionPage({
    params,
}: PageProps) {
    const author = await requireAnyRole(AUTHOR_ROLES);

    const { id } = await params;

    const submission =
        await prisma.submission.findFirst({
            where: {
                id,
                authorId: author.id,
            },

            include: {
                journal: true,
                author: true,
                decisions: {
                    orderBy: {
                        createdAt: "desc",
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
                files: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

    if (!submission) {
        notFound();
    }

    const latestDecision = submission.decisions[0];

    const latestVersionNumber =
        submission.versions[0]?.versionNumber || 1;

    const nextVersionNumber = latestVersionNumber + 1;

    const revisionAllowed =
        submission.status === "REVISION_REQUIRED";

    const deadlinePassed =
        latestDecision?.revisionDeadline
            ? new Date() > latestDecision.revisionDeadline
            : false;

    return (
        <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
            <div>
                <Link
                    href={`/author/submissions/${submission.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to submission
                </Link>

                <h1 className="mt-4 text-3xl font-bold">
                    Submit Revised Manuscript
                </h1>

                <p className="mt-2 text-gray-600">
                    Upload the revised manuscript and your response to
                    the editor and reviewers.
                </p>
            </div>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Manuscript Information
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
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
                            Version {latestVersionNumber}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Next version
                        </p>
                        <p className="font-medium">
                            Version {nextVersionNumber}
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Editorial Decision
                </h2>

                {!latestDecision ? (
                    <p className="mt-4 text-gray-600">
                        No editorial decision is available.
                    </p>
                ) : (
                    <div className="mt-5 space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">
                                Decision
                            </p>
                            <p className="font-semibold">
                                {formatStatus(latestDecision.decision)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">
                                Revision deadline
                            </p>
                            <p className="font-medium">
                                {latestDecision.revisionDeadline
                                    ? new Date(
                                        latestDecision.revisionDeadline,
                                    ).toLocaleDateString()
                                    : "No deadline specified"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">
                                Editor’s comments
                            </p>

                            <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4">
                                {latestDecision.comments ||
                                    "No comments were provided."}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {!revisionAllowed ? (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        Revision upload is unavailable
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        This submission currently has the status{" "}
                        <strong>
                            {formatStatus(submission.status)}
                        </strong>
                        . A revised manuscript can only be uploaded when
                        the status is Revision Required.
                    </p>
                </section>
            ) : deadlinePassed ? (
                <section className="rounded-xl border border-red-300 bg-red-50 p-6">
                    <h2 className="font-semibold text-red-900">
                        Revision deadline has passed
                    </h2>

                    <p className="mt-2 text-sm text-red-800">
                        Contact the journal editorial office before
                        attempting to submit a late revision.
                    </p>
                </section>
            ) : (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">
                        Upload Version {nextVersionNumber}
                    </h2>

                    <form
                        action={submitRevision}
                        className="mt-6 space-y-6"
                    >
                        <input
                            type="hidden"
                            name="submissionId"
                            value={submission.id}
                        />

                        <div>
                            <label
                                htmlFor="manuscriptFile"
                                className="block font-medium"
                            >
                                Revised manuscript
                            </label>

                            <p className="mt-1 text-sm text-gray-500">
                                Required. Accepted formats: PDF, DOC, or
                                DOCX. Maximum size: 20 MB.
                            </p>

                            <input
                                id="manuscriptFile"
                                name="manuscriptFile"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                required
                                className="mt-3 block w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="responseFile"
                                className="block font-medium"
                            >
                                Response to reviewers
                            </label>

                            <p className="mt-1 text-sm text-gray-500">
                                Optional but strongly recommended. Explain how
                                each reviewer comment was addressed.
                            </p>

                            <input
                                id="responseFile"
                                name="responseFile"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="mt-3 block w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="coverLetter"
                                className="block font-medium"
                            >
                                Revision cover letter
                            </label>

                            <textarea
                                id="coverLetter"
                                name="coverLetter"
                                rows={7}
                                className="mt-2 w-full rounded-lg border p-3"
                                placeholder="Dear Editor, please find attached the revised manuscript..."
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="authorNotes"
                                className="block font-medium"
                            >
                                Additional notes
                            </label>

                            <textarea
                                id="authorNotes"
                                name="authorNotes"
                                rows={5}
                                className="mt-2 w-full rounded-lg border p-3"
                                placeholder="Provide any additional information for the editorial office."
                            />
                        </div>

                        <button
                            type="submit"
                            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                        >
                            Submit Revision
                        </button>
                    </form>
                </section>
            )}

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Version History
                </h2>

                <div className="mt-5 space-y-4">
                    {submission.versions.length === 0 ? (
                        <div className="rounded-lg border p-4">
                            <p className="font-semibold">Version 1</p>

                            <p className="mt-1 text-sm text-gray-600">
                                Original manuscript submitted{" "}
                                {submission.submittedAt
                                    ? new Date(
                                        submission.submittedAt,
                                    ).toLocaleDateString()
                                    : new Date(
                                        submission.createdAt,
                                    ).toLocaleDateString()}
                            </p>

                            {submission.files.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {submission.files.map((file) => (
                                        <a
                                            key={file.id}
                                            href={`/api/submission-files/${file.id}/download`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block break-words text-sm text-blue-700 hover:underline"
                                        >
                                            {file.fileName}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {submission.versions.map((version) => (
                                <div
                                    key={version.id}
                                    className="rounded-lg border p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold">
                                                Version {version.versionNumber}
                                            </p>

                                            <p className="mt-1 break-words text-sm text-gray-600">
                                                Uploaded by {version.uploadedBy.name} on{" "}
                                                {new Date(
                                                    version.createdAt,
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <a
                                                href={`/api/submission-versions/${version.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm font-medium text-blue-700 hover:underline"
                                            >
                                                Download manuscript
                                            </a>

                                            {version.responseFileUrl && (
                                                <a
                                                    href={`/api/submission-versions/${version.id}/download?file=response`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm font-medium text-blue-700 hover:underline"
                                                >
                                                    Download response
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {version.authorNotes && (
                                        <div className="mt-4 rounded bg-gray-50 p-3 text-sm whitespace-pre-wrap break-words">
                                            {version.authorNotes}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div className="rounded-lg border p-4">
                                <p className="font-semibold">Version 1</p>

                                <p className="mt-1 text-sm text-gray-600">
                                    Original manuscript submitted{" "}
                                    {submission.submittedAt
                                        ? new Date(
                                            submission.submittedAt,
                                        ).toLocaleDateString()
                                        : new Date(
                                            submission.createdAt,
                                        ).toLocaleDateString()}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}