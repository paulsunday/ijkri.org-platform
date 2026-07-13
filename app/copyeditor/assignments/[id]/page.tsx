import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    addCopyeditingNote,
    startCopyediting,
    submitCopyediting,
} from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

function formatDate(value: Date | null | undefined) {
    if (!value) {
        return "Not specified";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

export default async function CopyeditorAssignmentPage({
    params,
}: PageProps) {
    const copyeditor =
        await requireRole("COPYEDITOR");
    const { id } = await params;

    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id,
                assigneeId: copyeditor.id,
                stage: "COPYEDITING",
            },

            include: {
                submission: {
                    include: {
                        journal: true,
                        author: true,

                        files: {
                            orderBy: {
                                createdAt: "asc",
                            },
                        },

                        versions: {
                            orderBy: {
                                versionNumber: "desc",
                            },

                            take: 1,
                        },
                    },
                },

                assignee: true,
                assignedBy: true,

                files: {
                    include: {
                        uploadedBy: true,
                    },

                    orderBy: {
                        createdAt: "desc",
                    },
                },

                notes: {
                    include: {
                        author: true,
                    },

                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });

    if (!assignment) {
        notFound();
    }


    const latestSubmissionVersion =
        assignment.submission.versions[0];

    const canStart =
        assignment.status === "PENDING" ||
        assignment.status === "CHANGES_REQUESTED";

    const canSubmit =
        assignment.status === "IN_PROGRESS" ||
        assignment.status === "CHANGES_REQUESTED";

    const hasBeenSubmitted =
        assignment.status === "SUBMITTED";

    const hasBeenApproved =
        assignment.status === "APPROVED";

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href="/copyeditor/dashboard"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to copyeditor dashboard
                </Link>

                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Copyediting Assignment
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Copyediting round {assignment.round}
                        </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold">
                        {formatStatus(assignment.status)}
                    </span>
                </div>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">
                    {assignment.submission.title}
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <p className="text-sm text-gray-500">
                            Journal
                        </p>

                        <p className="font-medium">
                            {assignment.submission.journal.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Author
                        </p>

                        <p className="font-medium">
                            {assignment.submission.author.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Manuscript type
                        </p>

                        <p className="font-medium">
                            {assignment.submission.manuscriptType ||
                                "Not specified"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Copyeditor
                        </p>

                        <p className="font-medium">
                            {assignment.assignee.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Assigned by
                        </p>

                        <p className="font-medium">
                            {assignment.assignedBy.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Deadline
                        </p>

                        <p className="font-medium">
                            {formatDate(assignment.dueDate)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Started
                        </p>

                        <p className="font-medium">
                            {formatDate(assignment.startedAt)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Submitted
                        </p>

                        <p className="font-medium">
                            {formatDate(assignment.submittedAt)}
                        </p>
                    </div>
                </div>

                {assignment.instructions && (
                    <div className="mt-6">
                        <h3 className="font-semibold">
                            Editor Instructions
                        </h3>

                        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-yellow-50 p-4 text-sm">
                            {assignment.instructions}
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Abstract
                </h2>

                <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-5">
                    {assignment.submission.abstract}
                </div>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Source Manuscript
                </h2>

                {latestSubmissionVersion ? (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                        <div>
                            <p className="font-semibold">
                                Accepted manuscript — Version{" "}
                                {latestSubmissionVersion.versionNumber}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                                {latestSubmissionVersion.manuscriptFileName ||
                                    "Revised manuscript"}
                            </p>
                        </div>

                        <a
                            href={latestSubmissionVersion.manuscriptFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                        >
                            Download Source Manuscript
                        </a>
                    </div>
                ) : assignment.submission.files.length === 0 ? (
                    <p className="mt-4 text-gray-600">
                        No manuscript file was found.
                    </p>
                ) : (
                    <div className="mt-5 space-y-3">
                        {assignment.submission.files.map((file) => (
                            <div
                                key={file.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                            >
                                <div>
                                    <p className="font-semibold">
                                        {file.fileName}
                                    </p>

                                    <p className="mt-1 text-sm text-gray-600">
                                        {file.label ||
                                            file.fileType ||
                                            "Submission file"}
                                    </p>
                                </div>

                                <a
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                >
                                    Download
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {canStart && (
                <section className="rounded-xl border border-blue-300 bg-blue-50 p-6">
                    <h2 className="text-xl font-semibold text-blue-900">
                        Begin Copyediting
                    </h2>

                    <p className="mt-2 text-blue-800">
                        Start the assignment before submitting a
                        copyedited manuscript.
                    </p>

                    <form
                        action={startCopyediting}
                        className="mt-5"
                    >
                        <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                        />

                        <button
                            type="submit"
                            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                        >
                            {assignment.status === "CHANGES_REQUESTED"
                                ? "Resume Copyediting"
                                : "Start Copyediting"}
                        </button>
                    </form>
                </section>
            )}

            {canSubmit && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">
                        Submit Copyedited Manuscript
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        During development, paste the storage URL of the
                        completed file. Direct file uploading will be
                        connected when the permanent storage service is
                        configured.
                    </p>

                    <form
                        action={submitCopyediting}
                        className="mt-6 space-y-6"
                    >
                        <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                        />



                        <div>
                            <label
                                htmlFor="fileName"
                                className="mb-2 block font-semibold"
                            >
                                File Name
                            </label>

                            <input
                                id="fileName"
                                name="fileName"
                                type="text"
                                required
                                placeholder="copyedited-manuscript.docx"
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="fileUrl"
                                className="mb-2 block font-semibold"
                            >
                                File URL
                            </label>

                            <input
                                id="fileUrl"
                                name="fileUrl"
                                type="url"
                                required
                                placeholder="https://storage.example.com/copyedited-manuscript.docx"
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="mimeType"
                                className="mb-2 block font-semibold"
                            >
                                MIME Type
                            </label>

                            <select
                                id="mimeType"
                                name="mimeType"
                                defaultValue="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="w-full rounded-lg border p-3"
                            >
                                <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">
                                    Microsoft Word (.docx)
                                </option>

                                <option value="application/pdf">
                                    PDF
                                </option>

                                <option value="application/msword">
                                    Microsoft Word (.doc)
                                </option>

                                <option value="text/plain">
                                    Plain text
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="description"
                                className="mb-2 block font-semibold"
                            >
                                File Description
                            </label>

                            <input
                                id="description"
                                name="description"
                                type="text"
                                placeholder="Language and reference corrections completed."
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="note"
                                className="mb-2 block font-semibold"
                            >
                                Submission Note
                            </label>

                            <textarea
                                id="note"
                                name="note"
                                rows={6}
                                className="w-full rounded-lg border p-3"
                                placeholder="Summarize the corrections made and identify any matters requiring editorial attention."
                            />
                        </div>

                        <button
                            type="submit"
                            className="rounded-lg bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-800"
                        >
                            Submit Copyediting
                        </button>
                    </form>
                </section>
            )}

            {hasBeenSubmitted && (
                <section className="rounded-xl border border-purple-300 bg-purple-50 p-6">
                    <h2 className="text-xl font-semibold text-purple-900">
                        Copyediting Submitted
                    </h2>

                    <p className="mt-2 text-purple-800">
                        The copyedited manuscript has been sent to the
                        editor for approval.
                    </p>
                </section>
            )}

            {hasBeenApproved && (
                <section className="rounded-xl border border-green-300 bg-green-50 p-6">
                    <h2 className="text-xl font-semibold text-green-900">
                        Copyediting Approved
                    </h2>

                    <p className="mt-2 text-green-800">
                        The editor approved this copyediting assignment.
                        The manuscript may proceed to typesetting.
                    </p>
                </section>
            )}

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Copyedited Files
                </h2>

                {assignment.files.length === 0 ? (
                    <p className="mt-4 text-gray-600">
                        No copyedited files have been submitted.
                    </p>
                ) : (
                    <div className="mt-5 space-y-4">
                        {assignment.files.map((file) => (
                            <article
                                key={file.id}
                                className="rounded-lg border p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="font-semibold">
                                            {file.fileName}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            Version {file.versionNumber}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            Uploaded by {file.uploadedBy.name} on{" "}
                                            {formatDate(file.createdAt)}
                                        </p>
                                    </div>

                                    <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                    >
                                        Download
                                    </a>
                                </div>

                                {file.description && (
                                    <p className="mt-4 text-sm">
                                        {file.description}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Production Notes
                </h2>

                <form
                    action={addCopyeditingNote}
                    className="mt-5 space-y-4"
                >
                    <input
                        type="hidden"
                        name="assignmentId"
                        value={assignment.id}
                    />

                    <input
                        type="hidden"
                        name="isInternal"
                        value="true"
                    />

                    <textarea
                        name="message"
                        rows={5}
                        required
                        className="w-full rounded-lg border p-3"
                        placeholder="Add an internal copyediting note..."
                    />

                    <button
                        type="submit"
                        className="rounded-lg border border-gray-500 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-100"
                    >
                        Add Note
                    </button>
                </form>

                {assignment.notes.length === 0 ? (
                    <p className="mt-6 text-gray-600">
                        No production notes have been added.
                    </p>
                ) : (
                    <div className="mt-6 space-y-4">
                        {assignment.notes.map((note) => (
                            <article
                                key={note.id}
                                className="rounded-lg bg-gray-50 p-4"
                            >
                                <div className="flex flex-wrap justify-between gap-3">
                                    <p className="font-semibold">
                                        {note.author.name}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {formatDate(note.createdAt)}
                                    </p>
                                </div>

                                <p className="mt-3 whitespace-pre-wrap text-sm">
                                    {note.message}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}