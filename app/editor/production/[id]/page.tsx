import Link from "next/link";
import { notFound } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import {
    approveCopyediting,
    returnCopyeditingForChanges,
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
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
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

export default async function EditorProductionReviewPage({
    params,
}: PageProps) {
    const editor =
        await requireAnyRole(EDITORIAL_ROLES);
    const { id } = await params;

    const assignment =
        await prisma.productionAssignment.findUnique({
            where: {
                id,
            },

            include: {
                submission: {
                    include: {
                        author: true,
                        journal: true,
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
            },
        });

    if (!assignment) {
        notFound();
    }

    if (assignment.stage !== "COPYEDITING") {
        notFound();
    }

    if (!isSuperAdmin(editor)) {
        const editorJournalRole =
            await prisma.userJournalRole.findFirst({
                where: {
                    userId: editor.id,
                    journalId:
                        assignment.submission.journalId,
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

    const copyeditedFiles = assignment.files.filter(
        (file) =>
            file.fileType === "COPYEDITED_MANUSCRIPT",
    );

    const canReview =
        assignment.status === "SUBMITTED" &&
        copyeditedFiles.length > 0;

    return (
        <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href={`/editor/submissions/${assignment.submissionId}/production`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to production workflow
                </Link>

                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Review Copyediting
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Review the copyedited manuscript and either
                            approve it or return it for corrections.
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
                            Copyeditor
                        </p>

                        <p className="font-medium">
                            {assignment.assignee.name}
                        </p>

                        <p className="text-sm text-gray-500">
                            {assignment.assignee.email}
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
                            Copyediting Instructions
                        </h3>

                        <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                            {assignment.instructions}
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Copyedited Files
                </h2>

                {copyeditedFiles.length === 0 ? (
                    <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                        <p className="font-semibold text-yellow-900">
                            No copyedited file has been submitted.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {copyeditedFiles.map((file) => (
                            <article
                                key={file.id}
                                className="rounded-xl border p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="break-words font-semibold">
                                                {file.fileName}
                                            </h3>

                                            {file.isFinal && (
                                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                                    Approved Final
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-2 text-sm text-gray-600">
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
                                        href={`/api/production-files/${file.id}/download`}
                                        className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
                                    >
                                        Download
                                    </a>

                                </div>

                                {file.description && (
                                    <div className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                                        {file.description}
                                    </div>
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

                {assignment.notes.length === 0 ? (
                    <p className="mt-4 text-gray-600">
                        No production notes have been added.
                    </p>
                ) : (
                    <div className="mt-6 space-y-4">
                        {assignment.notes.map((note) => (
                            <article
                                key={note.id}
                                className="rounded-lg bg-gray-50 p-5"
                            >
                                <div className="flex flex-wrap justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="break-words font-semibold">
                                            {note.author.name}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            {note.isInternal
                                                ? "Internal production note"
                                                : "Shared note"}
                                        </p>
                                    </div>

                                    <p className="text-sm text-gray-500">
                                        {formatDate(note.createdAt)}
                                    </p>
                                </div>

                                <p className="mt-4 whitespace-pre-wrap break-words text-sm">
                                    {note.message}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {assignment.status !== "SUBMITTED" && (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        Review unavailable
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        The copyeditor must submit the assignment before
                        the editor can approve it or return it.
                    </p>
                </section>
            )}

            {assignment.status === "SUBMITTED" &&
                copyeditedFiles.length === 0 && (
                    <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                        <h2 className="font-semibold text-yellow-900">
                            Submitted file missing
                        </h2>

                        <p className="mt-2 text-sm text-yellow-800">
                            The assignment is marked submitted, but no
                            copyedited manuscript file was found.
                        </p>
                    </section>
                )}

            {canReview && (
                <section className="grid gap-6 lg:grid-cols-2">
                    <article className="rounded-xl border border-green-300 bg-green-50 p-6">
                        <h2 className="text-xl font-semibold text-green-900">
                            Approve Copyediting
                        </h2>

                        <p className="mt-2 text-sm text-green-800">
                            The newest file will become the approved final
                            copyedited manuscript. The submission will move
                            to typesetting.
                        </p>

                        <form
                            action={approveCopyediting}
                            className="mt-6 space-y-5"
                        >
                            <input
                                type="hidden"
                                name="assignmentId"
                                value={assignment.id}
                            />

                            <div>
                                <label
                                    htmlFor="approvalNote"
                                    className="mb-2 block font-semibold text-green-900"
                                >
                                    Approval Note
                                </label>

                                <textarea
                                    id="approvalNote"
                                    name="approvalNote"
                                    rows={6}
                                    className="w-full rounded-lg border p-3"
                                    placeholder="Copyediting reviewed and approved for typesetting."
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
                            >
                                Approve Copyediting
                            </button>
                        </form>
                    </article>

                    <article className="rounded-xl border border-orange-300 bg-orange-50 p-6">
                        <h2 className="text-xl font-semibold text-orange-900">
                            Return for Corrections
                        </h2>

                        <p className="mt-2 text-sm text-orange-800">
                            Explain the required corrections and return the
                            assignment to the copyeditor.
                        </p>

                        <form
                            action={returnCopyeditingForChanges}
                            className="mt-6 space-y-5"
                        >
                            <input
                                type="hidden"
                                name="assignmentId"
                                value={assignment.id}
                            />

                            <input
                                type="hidden"
                                name="editorId"
                                value={editor.id}
                            />

                            <div>
                                <label
                                    htmlFor="correctionNote"
                                    className="mb-2 block font-semibold text-orange-900"
                                >
                                    Required Corrections
                                </label>

                                <textarea
                                    id="correctionNote"
                                    name="correctionNote"
                                    rows={7}
                                    required
                                    className="w-full rounded-lg border p-3"
                                    placeholder="Describe the changes the copyeditor must make."
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="dueDate"
                                    className="mb-2 block font-semibold text-orange-900"
                                >
                                    New Deadline
                                </label>

                                <input
                                    id="dueDate"
                                    name="dueDate"
                                    type="date"
                                    className="w-full rounded-lg border p-3"
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-lg bg-orange-700 px-6 py-3 font-semibold text-white hover:bg-orange-800"
                            >
                                Return for Corrections
                            </button>
                        </form>
                    </article>
                </section>
            )}
        </main>
    );
}