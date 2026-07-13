import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import {
    assignCopyeditor,
    assignProofreader,
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

function assignmentStatusClass(status: string) {
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

export default async function ProductionPage({
    params,
}: PageProps) {
    const editor = await requireAnyRole(
        EDITORIAL_ROLES,
    );

    const { id } = await params;

    const submission =
        await prisma.submission.findUnique({
            where: {
                id,
            },

            include: {
                journal: true,
                author: true,

                productionAssignments: {
                    include: {
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
                            orderBy: {
                                createdAt: "desc",
                            },
                        },
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

    const copyeditors =
        await prisma.user.findMany({
            where: {
                isActive: true,

                roles: {
                    some: {
                        journalId: submission.journalId,
                        role: "COPYEDITOR",
                    },
                },
            },

            orderBy: {
                name: "asc",
            },
        });

    const proofreaders =
        await prisma.user.findMany({
            where: {
                isActive: true,

                roles: {
                    some: {
                        journalId: submission.journalId,
                        role: "PROOFREADER",
                    },
                },
            },

            orderBy: {
                name: "asc",
            },
        });

    const copyeditingAssignment =
        submission.productionAssignments.find(
            (assignment) =>
                assignment.stage === "COPYEDITING",
        );

    const typesettingAssignment =
        submission.productionAssignments.find(
            (assignment) =>
                assignment.stage === "TYPESETTING",
        );

    const proofreadingAssignment =
        submission.productionAssignments.find(
            (assignment) =>
                assignment.stage === "PROOFREADING",
        );

    const canAssignProofreader =
        submission.status === "PROOFREADING" &&
        typesettingAssignment?.status === "APPROVED" &&
        !proofreadingAssignment;

    const canCreateCopyeditingAssignment =
        submission.status === "ACCEPTED" &&
        !copyeditingAssignment;

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href={`/editor/submissions/${submission.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to editor workspace
                </Link>

                <h1 className="mt-4 text-3xl font-bold">
                    Production Workflow
                </h1>

                <p className="mt-2 text-gray-600">
                    Assign and monitor copyediting, typesetting,
                    proofreading and final approval tasks.
                </p>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Manuscript Information
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">
                            Title
                        </p>

                        <p className="font-medium">
                            {submission.title}
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
                            Journal
                        </p>

                        <p className="font-medium">
                            {submission.journal.name}
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
                </div>
            </section>

            {canCreateCopyeditingAssignment && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">
                        Assign Copyeditor
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Send this accepted manuscript to an eligible
                        copyeditor.
                    </p>

                    {copyeditors.length === 0 ? (
                        <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                            <p className="font-semibold text-yellow-900">
                                No eligible copyeditor found
                            </p>

                            <p className="mt-2 text-sm text-yellow-800">
                                Add the COPYEDITOR role to an active user
                                for this journal.
                            </p>
                        </div>
                    ) : (
                        <form
                            action={assignCopyeditor}
                            className="mt-6 space-y-6"
                        >
                            <input
                                type="hidden"
                                name="submissionId"
                                value={submission.id}
                            />

                            <div>
                                <label
                                    htmlFor="assigneeId"
                                    className="mb-2 block font-semibold"
                                >
                                    Select Copyeditor
                                </label>

                                <select
                                    id="assigneeId"
                                    name="assigneeId"
                                    required
                                    defaultValue=""
                                    className="w-full rounded-lg border p-3"
                                >
                                    <option value="" disabled>
                                        Choose a copyeditor
                                    </option>

                                    {copyeditors.map(
                                        (copyeditor) => (
                                            <option
                                                key={copyeditor.id}
                                                value={copyeditor.id}
                                            >
                                                {copyeditor.name} —{" "}
                                                {copyeditor.email}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="copyeditingDueDate"
                                    className="mb-2 block font-semibold"
                                >
                                    Copyediting Deadline
                                </label>

                                <input
                                    id="copyeditingDueDate"
                                    name="dueDate"
                                    type="date"
                                    className="w-full rounded-lg border p-3"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="copyeditingInstructions"
                                    className="mb-2 block font-semibold"
                                >
                                    Instructions
                                </label>

                                <textarea
                                    id="copyeditingInstructions"
                                    name="instructions"
                                    rows={7}
                                    className="w-full rounded-lg border p-3"
                                    placeholder="Edit the manuscript for grammar, journal style, reference accuracy, formatting and internal consistency."
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                                Send to Copyediting
                            </button>
                        </form>
                    )}
                </section>
            )}

            {canAssignProofreader && (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">
                        Assign Proofreader
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Send the approved typeset manuscript to an
                        eligible proofreader.
                    </p>

                    {proofreaders.length === 0 ? (
                        <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                            <p className="font-semibold text-yellow-900">
                                No eligible proofreader found
                            </p>

                            <p className="mt-2 text-sm text-yellow-800">
                                Add the PROOFREADER role to an active user
                                for this journal.
                            </p>
                        </div>
                    ) : (
                        <form
                            action={assignProofreader}
                            className="mt-6 space-y-6"
                        >
                            <input
                                type="hidden"
                                name="submissionId"
                                value={submission.id}
                            />

                            <div>
                                <label
                                    htmlFor="proofreaderId"
                                    className="mb-2 block font-semibold"
                                >
                                    Select Proofreader
                                </label>

                                <select
                                    id="proofreaderId"
                                    name="proofreaderId"
                                    required
                                    defaultValue=""
                                    className="w-full rounded-lg border p-3"
                                >
                                    <option value="" disabled>
                                        Choose a proofreader
                                    </option>

                                    {proofreaders.map(
                                        (proofreader) => (
                                            <option
                                                key={proofreader.id}
                                                value={proofreader.id}
                                            >
                                                {proofreader.name} —{" "}
                                                {proofreader.email}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="proofreadingDueDate"
                                    className="mb-2 block font-semibold"
                                >
                                    Proofreading Deadline
                                </label>

                                <input
                                    id="proofreadingDueDate"
                                    name="dueDate"
                                    type="date"
                                    required
                                    className="w-full rounded-lg border p-3"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="proofreadingInstructions"
                                    className="mb-2 block font-semibold"
                                >
                                    Instructions
                                </label>

                                <textarea
                                    id="proofreadingInstructions"
                                    name="instructions"
                                    rows={7}
                                    className="w-full rounded-lg border p-3"
                                    defaultValue="Review grammar, punctuation, typography, layout consistency, figure placement, tables, references, page numbering, headers, footers and publication readiness."
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-lg bg-indigo-700 px-6 py-3 font-semibold text-white hover:bg-indigo-800"
                            >
                                Assign Proofreader
                            </button>
                        </form>
                    )}
                </section>
            )}

            {submission.status !== "ACCEPTED" &&
                submission.productionAssignments.length ===
                0 && (
                    <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                        <h2 className="font-semibold text-yellow-900">
                            Copyediting assignment unavailable
                        </h2>

                        <p className="mt-2 text-sm text-yellow-800">
                            The manuscript must have the status Accepted
                            before it can be assigned for copyediting.
                        </p>
                    </section>
                )}

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Production Assignments
                </h2>

                {submission.productionAssignments.length ===
                    0 ? (
                    <p className="mt-4 text-gray-600">
                        No production task has been created.
                    </p>
                ) : (
                    <div className="mt-6 space-y-5">
                        {submission.productionAssignments.map(
                            (assignment) => (
                                <article
                                    key={assignment.id}
                                    className="rounded-xl border p-5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {formatStatus(
                                                    assignment.stage,
                                                )}
                                            </h3>

                                            <p className="mt-1 text-sm text-gray-600">
                                                Round {assignment.round}
                                            </p>
                                        </div>

                                        <span
                                            className={`rounded-full px-4 py-2 text-sm font-semibold ${assignmentStatusClass(
                                                assignment.status,
                                            )}`}
                                        >
                                            {formatStatus(
                                                assignment.status,
                                            )}
                                        </span>
                                    </div>

                                    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Assignee
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
                                                {formatDate(
                                                    assignment.dueDate,
                                                )}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Created
                                            </p>

                                            <p className="font-medium">
                                                {formatDate(
                                                    assignment.createdAt,
                                                )}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Submitted files
                                            </p>

                                            <p className="font-medium">
                                                {assignment.files.length}
                                            </p>
                                        </div>
                                    </div>

                                    {assignment.instructions && (
                                        <div className="mt-5 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                                            {assignment.instructions}
                                        </div>
                                    )}

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        {assignment.stage ===
                                            "COPYEDITING" && (
                                                <>
                                                    <Link
                                                        href={`/copyeditor/assignments/${assignment.id}`}
                                                        className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                                    >
                                                        Open Assignment
                                                    </Link>

                                                    <Link
                                                        href={`/editor/production/${assignment.id}`}
                                                        className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
                                                    >
                                                        Review Copyediting
                                                    </Link>
                                                </>
                                            )}

                                        {assignment.stage ===
                                            "TYPESETTING" && (
                                                <>
                                                    <Link
                                                        href={`/typesetter/assignments/${assignment.id}`}
                                                        className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                                    >
                                                        Open Assignment
                                                    </Link>

                                                    <Link
                                                        href={`/editor/typesetting/${assignment.id}`}
                                                        className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
                                                    >
                                                        Review Typesetting
                                                    </Link>
                                                </>
                                            )}

                                        {assignment.stage ===
                                            "PROOFREADING" && (
                                                <>
                                                    <Link
                                                        href={`/proofreader/assignments/${assignment.id}`}
                                                        className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                                    >
                                                        Open Assignment
                                                    </Link>

                                                    <Link
                                                        href={`/editor/proofreading/${assignment.id}`}
                                                        className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
                                                    >
                                                        Review Proofreading
                                                    </Link>
                                                </>
                                            )}
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}