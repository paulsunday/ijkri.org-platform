import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { PROOFREADER_ROLES } from "@/lib/auth/role-groups";

import {
    addProofreadingNote,
    startProofreading,
    submitProofreading,
} from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatDate(
    value: Date | null | undefined,
) {
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

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

function statusClass(status: string) {
    switch (status) {
        case "PENDING":
            return "bg-yellow-100 text-yellow-800";
        case "IN_PROGRESS":
            return "bg-blue-100 text-blue-800";
        case "SUBMITTED":
            return "bg-purple-100 text-purple-800";
        case "CHANGES_REQUESTED":
            return "bg-orange-100 text-orange-800";
        case "APPROVED":
            return "bg-green-100 text-green-800";
        case "CANCELLED":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-700";
    }
}

function fileTypeLabel(fileType: string) {
    return fileType
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export default async function ProofreaderAssignmentPage({
    params,
}: PageProps) {
    const proofreader =
        await requireAnyRole(PROOFREADER_ROLES);
    const { id } = await params;

    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id,
                stage: "PROOFREADING",

                ...(isSuperAdmin(proofreader)
                    ? {}
                    : {
                        assigneeId: proofreader.id,
                    }),
            },

            include: {
                submission: {
                    include: {
                        author: true,
                        journal: true,
                        productionFiles: {
                            include: {
                                uploadedBy: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                            orderBy: [
                                {
                                    versionNumber: "desc",
                                },
                                {
                                    createdAt: "desc",
                                },
                            ],
                        },
                    },
                },

                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                assignedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                notes: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },

                files: {
                    include: {
                        uploadedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            versionNumber: "desc",
                        },
                        {
                            createdAt: "desc",
                        },
                    ],
                },
            },
        });

    if (!assignment) {
        notFound();
    }

    const sourceFiles =
        assignment.submission.productionFiles.filter(
            (file) =>
                file.fileType === "TYPESET_DOCUMENT" ||
                file.fileType === "PDF_GALLEY" ||
                file.fileType === "HTML_GALLEY" ||
                file.fileType === "XML_GALLEY",
        );

    const proofFiles = assignment.files.filter(
        (file) => file.fileType === "PROOF_FILE",
    );

    const canStart =
        assignment.status === "PENDING" ||
        assignment.status === "CHANGES_REQUESTED";

    const canSubmit =
        assignment.status === "IN_PROGRESS" ||
        assignment.status === "CHANGES_REQUESTED";

    return (
        <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href="/proofreader/dashboard"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to proofreader dashboard
                </Link>

                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Proofreading Workspace
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Review the final galley, report errors and submit the proof.
                        </p>
                    </div>

                    <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
                            assignment.status,
                        )}`}
                    >
                        {formatStatus(assignment.status)}
                    </span>
                </div>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Assignment Summary
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <p className="text-sm text-gray-500">
                            Manuscript
                        </p>
                        <p className="font-medium">
                            {assignment.submission.title}
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
                            Journal
                        </p>
                        <p className="font-medium">
                            {assignment.submission.journal.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Proofreader
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
                            Round
                        </p>
                        <p className="font-medium">
                            {assignment.round}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Assigned
                        </p>
                        <p className="font-medium">
                            {formatDate(assignment.createdAt)}
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
                            Instructions
                        </h3>

                        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                            {assignment.instructions}
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Files for Proofreading
                </h2>

                {sourceFiles.length === 0 ? (
                    <p className="mt-4 text-gray-600">
                        No approved typesetting files are available.
                    </p>
                ) : (
                    <div className="mt-6 space-y-4">
                        {sourceFiles.map((file) => (
                            <article
                                key={file.id}
                                className="rounded-xl border p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold">
                                            {file.fileName}
                                        </h3>

                                        <p className="mt-1 text-sm text-gray-600">
                                            {fileTypeLabel(file.fileType)}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            Version {file.versionNumber}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            Uploaded by {file.uploadedBy.name}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            {formatDate(file.createdAt)}
                                        </p>
                                    </div>

                                    <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                    >
                                        Download File
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Proof Files
                </h2>

                {proofFiles.length === 0 ? (
                    <p className="mt-4 text-gray-600">
                        No proof file has been submitted.
                    </p>
                ) : (
                    <div className="mt-6 space-y-4">
                        {proofFiles.map((file) => (
                            <article
                                key={file.id}
                                className="rounded-xl border p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold">
                                            {file.fileName}
                                        </h3>

                                        <p className="mt-1 text-sm text-gray-600">
                                            Version {file.versionNumber}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            {formatDate(file.createdAt)}
                                        </p>

                                        {file.description && (
                                            <p className="mt-3 whitespace-pre-wrap text-sm">
                                                {file.description}
                                            </p>
                                        )}
                                    </div>

                                    <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
                                    >
                                        Download Proof
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Production Notes
                </h2>

                {assignment.notes.length === 0 ? (
                    <p className="mt-4 text-gray-600">
                        No proofreading notes yet.
                    </p>
                ) : (
                    <div className="mt-6 space-y-4">
                        {assignment.notes.map((note) => (
                            <article
                                key={note.id}
                                className="rounded-lg bg-gray-50 p-5"
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

                <form
                    action={addProofreadingNote}
                    className="mt-6 space-y-4"
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

                    <div>
                        <label
                            htmlFor="message"
                            className="mb-2 block font-semibold"
                        >
                            Add Note
                        </label>

                        <textarea
                            id="message"
                            name="message"
                            rows={5}
                            required
                            className="w-full rounded-lg border p-3"
                            placeholder="Record typographical, layout or publication issues."
                        />
                    </div>

                    <button
                        type="submit"
                        className="rounded-lg bg-gray-800 px-5 py-3 font-semibold text-white hover:bg-black"
                    >
                        Save Note
                    </button>
                </form>
            </section>

            {canStart && (
                <section className="rounded-xl border border-blue-300 bg-blue-50 p-6">
                    <h2 className="text-xl font-semibold text-blue-900">
                        Start Proofreading
                    </h2>

                    <form
                        action={startProofreading}
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
                            Start Proofreading
                        </button>
                    </form>
                </section>
            )}

            {canSubmit && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">
                        Submit Proofreading
                    </h2>

                    <form
                        action={submitProofreading}
                        className="mt-6 space-y-5"
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
                                Proof File Name
                            </label>

                            <input
                                id="fileName"
                                name="fileName"
                                type="text"
                                className="w-full rounded-lg border p-3"
                                placeholder="proof-v1.pdf"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="fileUrl"
                                className="mb-2 block font-semibold"
                            >
                                Proof File URL
                            </label>

                            <input
                                id="fileUrl"
                                name="fileUrl"
                                type="url"
                                className="w-full rounded-lg border p-3"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="mimeType"
                                className="mb-2 block font-semibold"
                            >
                                MIME Type
                            </label>

                            <input
                                id="mimeType"
                                name="mimeType"
                                type="text"
                                defaultValue="application/pdf"
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="description"
                                className="mb-2 block font-semibold"
                            >
                                File Description
                            </label>

                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="note"
                                className="mb-2 block font-semibold"
                            >
                                Proofreading Summary
                            </label>

                            <textarea
                                id="note"
                                name="note"
                                rows={6}
                                className="w-full rounded-lg border p-3"
                                placeholder="Summarise the corrections made or remaining issues."
                            />
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border p-4">
                            <input
                                type="checkbox"
                                name="noCorrectionsRequired"
                                value="true"
                                className="mt-1"
                            />

                            <span>
                                No corrections were required, and no proof file needs to be uploaded.
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
                        >
                            Submit Proofreading
                        </button>
                    </form>
                </section>
            )}

            {assignment.status === "SUBMITTED" && (
                <section className="rounded-xl border border-purple-300 bg-purple-50 p-6">
                    <h2 className="font-semibold text-purple-900">
                        Proofreading Submitted
                    </h2>

                    <p className="mt-2 text-sm text-purple-800">
                        The editor has been notified and will review the proof.
                    </p>
                </section>
            )}

            {assignment.status === "APPROVED" && (
                <section className="rounded-xl border border-green-300 bg-green-50 p-6">
                    <h2 className="font-semibold text-green-900">
                        Proofreading Approved
                    </h2>
                </section>
            )}
        </main>
    );
}