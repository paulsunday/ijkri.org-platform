import Link from "next/link";
import { notFound } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { TYPESETTER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import {
    startTypesetting,
    submitTypesetting,
    uploadProductionFile,
} from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatDate(
    date: Date | null | undefined,
) {
    if (!date) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export default async function TypesetterWorkspace({
    params,
}: PageProps) {
    const typesetter =
        await requireAnyRole(TYPESETTER_ROLES);

    const { id } = await params;

    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id,
                stage: "TYPESETTING",

                ...(isSuperAdmin(typesetter)
                    ? {}
                    : {
                        assigneeId: typesetter.id,
                    }),
            },

            include: {
                assignee: true,

                submission: {
                    include: {
                        author: true,
                        journal: true,

                        productionFiles: {
                            orderBy: {
                                createdAt: "desc",
                            },
                        },

                        productionNotes: {
                            orderBy: {
                                createdAt: "desc",
                            },

                            include: {
                                author: true,
                            },
                        },
                    },
                },
            },
        });

    if (!assignment) {
        notFound();
    }

    const copyeditedFiles =
        assignment.submission.productionFiles.filter(
            (file) =>
                file.fileType ===
                "COPYEDITED_MANUSCRIPT",
        );

    const typesettingFiles =
        assignment.submission.productionFiles.filter(
            (file) =>
                file.productionAssignmentId ===
                assignment.id &&
                [
                    "TYPESET_DOCUMENT",
                    "PDF_GALLEY",
                    "HTML_GALLEY",
                    "XML_GALLEY",
                ].includes(file.fileType),
        );

    const assignmentNotes =
        assignment.submission.productionNotes.filter(
            (note) =>
                note.productionAssignmentId ===
                assignment.id,
        );

    const canStart =
        assignment.status === "PENDING" ||
        assignment.status ===
        "CHANGES_REQUESTED";

    const canSubmit =
        assignment.status === "IN_PROGRESS" ||
        assignment.status ===
        "CHANGES_REQUESTED";

    return (
        <main className="mx-auto max-w-7xl space-y-8 p-8">
            <Link
                href="/typesetter/dashboard"
                className="text-sm text-blue-700 hover:underline"
            >
                ← Back to Dashboard
            </Link>

            <div>
                <h1 className="text-4xl font-bold">
                    Typesetting Workspace
                </h1>

                <p className="mt-2 text-gray-600">
                    Prepare publication-ready manuscript and galley
                    files.
                </p>
            </div>

            <section className="rounded-xl border bg-white p-6">
                <h2 className="mb-6 text-xl font-semibold">
                    Manuscript Information
                </h2>

                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">
                            Title
                        </p>

                        <p className="font-semibold">
                            {assignment.submission.title}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Author
                        </p>

                        <p className="font-semibold">
                            {assignment.submission.author.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Journal
                        </p>

                        <p className="font-semibold">
                            {assignment.submission.journal.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Status
                        </p>

                        <p className="font-semibold">
                            {formatStatus(assignment.status)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Assigned
                        </p>

                        <p>
                            {formatDate(assignment.createdAt)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Due Date
                        </p>

                        <p>
                            {formatDate(assignment.dueDate)}
                        </p>
                    </div>
                </div>

                {assignment.instructions && (
                    <div className="mt-6">
                        <p className="font-semibold">
                            Editor Instructions
                        </p>

                        <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-yellow-50 p-4 text-sm">
                            {assignment.instructions}
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6">
                <h2 className="mb-5 text-xl font-semibold">
                    Copyedited Source Files
                </h2>

                {copyeditedFiles.length === 0 ? (
                    <p className="text-gray-500">
                        No copyedited manuscript was uploaded.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {copyeditedFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded border p-4"
                            >
                                <div className="min-w-0">
                                    <p className="break-words font-medium">
                                        {file.fileName}
                                    </p>

                                    <p className="text-sm text-gray-500">
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
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6">
                <h2 className="mb-5 text-xl font-semibold">
                    Submitted Typesetting Files
                </h2>

                {typesettingFiles.length === 0 ? (
                    <p className="text-gray-500">
                        No typesetting files have been uploaded.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {typesettingFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded border p-4"
                            >
                                <div className="min-w-0">
                                    <p className="break-words font-medium">
                                        {file.fileName}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {formatStatus(file.fileType)} · Version{" "}
                                        {file.versionNumber}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {formatDate(file.createdAt)}
                                    </p>
                                </div>

                                <a
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
                                >
                                    Download
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {canSubmit && (
                <section className="rounded-xl border bg-white p-6">
                    <h2 className="text-xl font-semibold">
                        Upload Typesetting Files
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Upload both the formatted typeset document and
                        the PDF galley before submitting the assignment.
                    </p>

                    <form
                        action={uploadProductionFile}
                        className="mt-6 space-y-5"
                    >
                        <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                        />

                        <div>
                            <label
                                htmlFor="fileType"
                                className="mb-2 block font-semibold"
                            >
                                File Type
                            </label>

                            <select
                                id="fileType"
                                name="fileType"
                                required
                                defaultValue=""
                                className="w-full rounded-lg border p-3"
                            >
                                <option value="" disabled>
                                    Select file type
                                </option>

                                <option value="TYPESET_DOCUMENT">
                                    Formatted Typeset Document
                                </option>

                                <option value="PDF_GALLEY">
                                    PDF Galley
                                </option>

                                <option value="HTML_GALLEY">
                                    HTML Galley
                                </option>

                                <option value="XML_GALLEY">
                                    XML Galley
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="productionFile"
                                className="mb-2 block font-semibold"
                            >
                                Select File
                            </label>

                            <input
                                id="productionFile"
                                name="file"
                                type="file"
                                required
                                accept=".doc,.docx,.pdf,.html,.htm,.xml"
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="description"
                                className="mb-2 block font-semibold"
                            >
                                Description
                            </label>

                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                className="w-full rounded-lg border p-3"
                                placeholder="Optional description of this production file."
                            />
                        </div>

                        <button
                            type="submit"
                            className="rounded-lg bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-800"
                        >
                            Upload Production File
                        </button>
                    </form>
                </section>
            )}

            <section className="rounded-xl border bg-white p-6">
                <h2 className="mb-5 text-xl font-semibold">
                    Production Notes
                </h2>

                {assignmentNotes.length === 0 ? (
                    <p className="text-gray-500">
                        No notes have been added.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {assignmentNotes.map((note) => (
                            <div
                                key={note.id}
                                className="rounded border p-4"
                            >
                                <div className="flex flex-wrap justify-between gap-3">
                                    <p className="min-w-0 break-words font-semibold">
                                        {note.author.name}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {formatDate(note.createdAt)}
                                    </p>
                                </div>

                                <p className="mt-2 whitespace-pre-wrap break-words">
                                    {note.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6">
                <h2 className="mb-5 text-xl font-semibold">
                    Workflow
                </h2>

                <div className="flex flex-wrap gap-4">
                    {canStart && (
                        <form action={startTypesetting}>
                            <input
                                type="hidden"
                                name="assignmentId"
                                value={assignment.id}
                            />

                            <button
                                type="submit"
                                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                                {assignment.status ===
                                    "CHANGES_REQUESTED"
                                    ? "Resume Typesetting"
                                    : "Start Typesetting"}
                            </button>
                        </form>
                    )}

                    {canSubmit && (
                        <form action={submitTypesetting}>
                            <input
                                type="hidden"
                                name="assignmentId"
                                value={assignment.id}
                            />

                            <button
                                type="submit"
                                className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                            >
                                Submit Typesetting
                            </button>
                        </form>
                    )}
                </div>

                {assignment.status === "SUBMITTED" && (
                    <div className="mt-5 rounded-lg border border-purple-300 bg-purple-50 p-5 text-purple-900">
                        The typesetting files have been submitted for
                        editorial review.
                    </div>
                )}

                {assignment.status === "APPROVED" && (
                    <div className="mt-5 rounded-lg border border-green-300 bg-green-50 p-5 text-green-900">
                        The editor has approved this typesetting
                        assignment.
                    </div>
                )}
            </section>
        </main>
    );
}