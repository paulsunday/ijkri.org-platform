import Link from "next/link";

import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { PROOFREADER_ROLES } from "@/lib/auth/role-groups";

import { prisma } from "@/lib/prisma";

function formatDate(
    value: Date | null | undefined,
) {
    if (!value) {
        return "Not specified";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
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

export default async function ProofreaderDashboardPage() {
    const proofreader =
        await requireAnyRole(PROOFREADER_ROLES);

    const assignments =
        await prisma.productionAssignment.findMany({
            where: {
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
        });

    const pendingCount = assignments.filter(
        (assignment) =>
            assignment.status === "PENDING",
    ).length;

    const inProgressCount = assignments.filter(
        (assignment) =>
            assignment.status === "IN_PROGRESS" ||
            assignment.status ===
            "CHANGES_REQUESTED",
    ).length;

    const submittedCount = assignments.filter(
        (assignment) =>
            assignment.status === "SUBMITTED",
    ).length;

    const approvedCount = assignments.filter(
        (assignment) =>
            assignment.status === "APPROVED",
    ).length;

    return (
        <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
            <header>
                <h1 className="text-4xl font-bold">
                    Proofreader Dashboard
                </h1>

                <p className="mt-2 text-gray-600">
                    Review publication proofs, identify errors,
                    and confirm manuscripts are ready for
                    publication.
                </p>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
                    <p className="text-sm text-yellow-700">
                        Pending
                    </p>

                    <p className="mt-2 text-3xl font-bold text-yellow-900">
                        {pendingCount}
                    </p>
                </article>

                <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-sm text-blue-700">
                        In Progress
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-900">
                        {inProgressCount}
                    </p>
                </article>

                <article className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                    <p className="text-sm text-purple-700">
                        Submitted
                    </p>

                    <p className="mt-2 text-3xl font-bold text-purple-900">
                        {submittedCount}
                    </p>
                </article>

                <article className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <p className="text-sm text-green-700">
                        Approved
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-900">
                        {approvedCount}
                    </p>
                </article>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Proofreading Assignments
                </h2>

                {assignments.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-6">
                        <p className="font-semibold text-yellow-900">
                            No proofreading assignments found.
                        </p>

                        <p className="mt-2 text-sm text-yellow-800">
                            Assignments will appear here once an editor
                            assigns you to a proofreading task.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-5">
                        {assignments.map((assignment) => {
                            const latestProofFile =
                                assignment.files.find(
                                    (file) =>
                                        file.fileType ===
                                        "PROOF_FILE",
                                );

                            return (
                                <article
                                    key={assignment.id}
                                    className="rounded-xl border p-5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-semibold">
                                                {
                                                    assignment.submission
                                                        .title
                                                }
                                            </h3>

                                            <p className="mt-1 text-sm text-gray-600">
                                                {
                                                    assignment.submission
                                                        .journal.name
                                                }
                                            </p>
                                        </div>

                                        <span
                                            className={`rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
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
                                                Author
                                            </p>

                                            <p className="font-medium">
                                                {
                                                    assignment.submission
                                                        .author.name
                                                }
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Assigned by
                                            </p>

                                            <p className="font-medium">
                                                {
                                                    assignment.assignedBy
                                                        .name
                                                }
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Assigned
                                            </p>

                                            <p className="font-medium">
                                                {formatDate(
                                                    assignment.createdAt,
                                                )}
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
                                                Round
                                            </p>

                                            <p className="font-medium">
                                                {assignment.round}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Latest Proof File
                                            </p>

                                            <p className="font-medium">
                                                {latestProofFile
                                                    ?.fileName ??
                                                    "None submitted"}
                                            </p>
                                        </div>
                                    </div>

                                    {assignment.instructions && (
                                        <div className="mt-5 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                                            {
                                                assignment.instructions
                                            }
                                        </div>
                                    )}

                                    <div className="mt-6">
                                        <Link
                                            href={`/proofreader/assignments/${assignment.id}`}
                                            className="inline-block rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
                                        >
                                            Open Proofreading Workspace
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
