import Link from "next/link";

import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

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

function statusBadge(status: string) {
    switch (status) {
        case "PENDING":
            return "bg-yellow-100 text-yellow-800";

        case "IN_PROGRESS":
            return "bg-blue-100 text-blue-800";

        case "SUBMITTED":
            return "bg-purple-100 text-purple-800";

        case "APPROVED":
            return "bg-green-100 text-green-800";

        case "CHANGES_REQUESTED":
            return "bg-orange-100 text-orange-800";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

export default async function TypesetterDashboard() {
    const typesetter =
        await requireRole("TYPESETTER");

    const assignments =
        await prisma.productionAssignment.findMany({
            where: {
                assigneeId: typesetter.id,
                stage: "TYPESETTING",
            },

            include: {
                submission: {
                    include: {
                        author: true,
                        journal: true,
                    },
                },
            },

            orderBy: {
                createdAt: "desc",
            },
        });

    const pending = assignments.filter(
        (assignment) =>
            assignment.status === "PENDING",
    ).length;

    const inProgress = assignments.filter(
        (assignment) =>
            assignment.status === "IN_PROGRESS" ||
            assignment.status ===
            "CHANGES_REQUESTED",
    ).length;

    const submitted = assignments.filter(
        (assignment) =>
            assignment.status === "SUBMITTED",
    ).length;

    const approved = assignments.filter(
        (assignment) =>
            assignment.status === "APPROVED",
    ).length;

    return (
        <main className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold">
                        Typesetter Dashboard
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Manage manuscript layout, galley preparation,
                        and publication formatting.
                    </p>
                </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Pending
                    </p>

                    <h2 className="mt-2 text-4xl font-bold">
                        {pending}
                    </h2>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        In Progress
                    </p>

                    <h2 className="mt-2 text-4xl font-bold">
                        {inProgress}
                    </h2>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Submitted
                    </p>

                    <h2 className="mt-2 text-4xl font-bold">
                        {submitted}
                    </h2>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Approved
                    </p>

                    <h2 className="mt-2 text-4xl font-bold">
                        {approved}
                    </h2>
                </div>
            </div>

            <section className="mt-10 rounded-xl border bg-white shadow-sm">
                <div className="border-b px-6 py-5">
                    <h2 className="text-xl font-semibold">
                        Typesetting Assignments
                    </h2>
                </div>

                {assignments.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        No typesetting assignments found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left">
                                        Manuscript
                                    </th>

                                    <th className="px-6 py-4 text-left">
                                        Journal
                                    </th>

                                    <th className="px-6 py-4 text-left">
                                        Author
                                    </th>

                                    <th className="px-6 py-4 text-left">
                                        Assigned
                                    </th>

                                    <th className="px-6 py-4 text-left">
                                        Due
                                    </th>

                                    <th className="px-6 py-4 text-left">
                                        Status
                                    </th>

                                    <th className="px-6 py-4 text-left">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {assignments.map((assignment) => (
                                    <tr
                                        key={assignment.id}
                                        className="border-t hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium">
                                                {assignment.submission.title}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            {assignment.submission.journal
                                                .shortName ??
                                                assignment.submission.journal.name}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="font-medium">
                                                {
                                                    assignment.submission.author
                                                        .name
                                                }
                                            </div>

                                            <div className="text-sm text-gray-500">
                                                {
                                                    assignment.submission.author
                                                        .email
                                                }
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            {formatDate(
                                                assignment.createdAt,
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            {formatDate(
                                                assignment.dueDate,
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                                                    assignment.status,
                                                )}`}
                                            >
                                                {assignment.status.replaceAll(
                                                    "_",
                                                    " ",
                                                )}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/typesetter/assignments/${assignment.id}`}
                                                className="inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                                            >
                                                Open Workspace
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="m-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <h3 className="font-semibold text-blue-900">
                        Typesetter Responsibilities
                    </h3>

                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-blue-800">
                        <li>
                            Prepare the publication-ready manuscript.
                        </li>

                        <li>
                            Create the journal galley PDF.
                        </li>

                        <li>
                            Ensure formatting complies with journal
                            standards.
                        </li>

                        <li>
                            Upload revised versions when corrections are
                            requested.
                        </li>
                    </ul>
                </div>
            </section>
        </main>
    );
}