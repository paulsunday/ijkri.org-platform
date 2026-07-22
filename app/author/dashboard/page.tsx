import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

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
        month: "short",
        year: "numeric",
    }).format(value);
}

function statusClass(status: string) {
    switch (status) {
        case "DRAFT":
            return "bg-gray-100 text-gray-700";

        case "SUBMITTED":
        case "UNDER_INITIAL_REVIEW":
            return "bg-blue-100 text-blue-800";

        case "UNDER_PEER_REVIEW":
            return "bg-purple-100 text-purple-800";

        case "REVISION_REQUIRED":
            return "bg-orange-100 text-orange-800";

        case "ACCEPTED":
            return "bg-green-100 text-green-800";

        case "COPYEDITING":
        case "TYPESETTING":
            return "bg-indigo-100 text-indigo-800";

        case "PROOFREADING":
            return "bg-amber-100 text-amber-800";

        case "AUTHOR_PROOF_APPROVAL":
            return "bg-violet-100 text-violet-800";

        case "READY_FOR_PUBLICATION":
            return "bg-emerald-100 text-emerald-800";

        case "PUBLISHED":
            return "bg-green-100 text-green-800";

        case "REJECTED":
            return "bg-red-100 text-red-800";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

export default async function AuthorDashboardPage() {
    const author =
        await requireAnyRole(AUTHOR_ROLES);

    const submissions =
        await prisma.submission.findMany({
            where: {
                authorId: author.id,
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },

            orderBy: {
                updatedAt: "desc",
            },
        });

    const proofApprovals =
        submissions.filter(
            (submission) =>
                submission.status ===
                "AUTHOR_PROOF_APPROVAL",
        );

    const revisionsRequired =
        submissions.filter(
            (submission) =>
                submission.status ===
                "REVISION_REQUIRED",
        );

    const publishedCount =
        submissions.filter(
            (submission) =>
                submission.status === "PUBLISHED",
        ).length;

    return (
        <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
            <header className="flex flex-wrap items-start justify-between gap-5">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                        Author Workspace
                    </p>

                    <h1 className="mt-2 text-3xl font-bold">
                        Author Dashboard
                    </h1>

                    <p className="mt-2 max-w-3xl text-gray-600">
                        Track manuscripts, respond to editorial
                        decisions, submit revisions and approve final
                        publication proofs.
                    </p>
                </div>

                <Link
                    href="/author/submit"
                    className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
                >
                    Submit New Manuscript
                </Link>
            </header>

            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Total submissions
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                        {submissions.length}
                    </p>
                </article>

                <article className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Final proofs awaiting approval
                    </p>

                    <p className="mt-2 text-3xl font-bold text-violet-700">
                        {proofApprovals.length}
                    </p>
                </article>

                <article className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Revisions required
                    </p>

                    <p className="mt-2 text-3xl font-bold text-orange-700">
                        {revisionsRequired.length}
                    </p>
                </article>

                <article className="rounded-xl border bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Published articles
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-700">
                        {publishedCount}
                    </p>
                </article>
            </section>

            {proofApprovals.length > 0 && (
                <section className="rounded-xl border border-violet-300 bg-violet-50 p-6 shadow-sm">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
                            Action Required
                        </p>

                        <h2 className="mt-2 text-2xl font-bold text-violet-950">
                            Final proofs awaiting your approval
                        </h2>

                        <p className="mt-2 text-sm text-violet-800">
                            Review each final proof carefully before
                            approving it for publication.
                        </p>
                    </div>

                    <div className="mt-6 space-y-4">
                        {proofApprovals.map(
                            (submission) => (
                                <article
                                    key={submission.id}
                                    className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-violet-200 bg-white p-5"
                                >
                                    <div>
                                        <h3 className="font-semibold">
                                            {submission.title}
                                        </h3>

                                        <p className="mt-1 text-sm text-gray-600">
                                            {
                                                submission
                                                    .journal.name
                                            }
                                        </p>
                                    </div>

                                    <Link
                                        href={`/author/submissions/${submission.id}/proof-approval`}
                                        className="rounded-lg bg-violet-700 px-5 py-3 font-semibold text-white hover:bg-violet-800"
                                    >
                                        Review Final Proof
                                    </Link>
                                </article>
                            ),
                        )}
                    </div>
                </section>
            )}

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">
                            My Submissions
                        </h2>

                        <p className="mt-1 text-sm text-gray-600">
                            Open a manuscript to view its full
                            editorial and production history.
                        </p>
                    </div>
                </div>

                {submissions.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
                        <h3 className="font-semibold">
                            No manuscripts submitted
                        </h3>

                        <p className="mt-2 text-sm text-gray-600">
                            Your submitted manuscripts will appear
                            here.
                        </p>

                        <Link
                            href="/author/submit"
                            className="mt-5 inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                        >
                            Submit Your First Manuscript
                        </Link>
                    </div>
                ) : (
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left">
                            <thead>
                                <tr className="border-b bg-gray-50 text-sm text-gray-600">
                                    <th className="px-4 py-3">
                                        Manuscript
                                    </th>

                                    <th className="px-4 py-3">
                                        Journal
                                    </th>

                                    <th className="px-4 py-3">
                                        Status
                                    </th>

                                    <th className="px-4 py-3">
                                        Updated
                                    </th>

                                    <th className="px-4 py-3">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {submissions.map(
                                    (submission) => (
                                        <tr
                                            key={submission.id}
                                            className="border-b align-top"
                                        >
                                            <td className="px-4 py-4">
                                                <p className="max-w-md font-semibold">
                                                    {
                                                        submission.title
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    Submitted{" "}
                                                    {formatDate(
                                                        submission.submittedAt ??
                                                        submission.createdAt,
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-sm">
                                                {
                                                    submission
                                                        .journal.name
                                                }
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                                        submission.status,
                                                    )}`}
                                                >
                                                    {formatStatus(
                                                        submission.status,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-sm">
                                                {formatDate(
                                                    submission.updatedAt,
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <Link
                                                        href={`/author/submissions/${submission.id}`}
                                                        className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                                                    >
                                                        View Details
                                                    </Link>

                                                    {submission.status ===
                                                        "AUTHOR_PROOF_APPROVAL" && (
                                                            <Link
                                                                href={`/author/submissions/${submission.id}/proof-approval`}
                                                                className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
                                                            >
                                                                Approve Proof
                                                            </Link>
                                                        )}

                                                    {submission.status ===
                                                        "REVISION_REQUIRED" && (
                                                            <Link
                                                                href={`/author/submissions/${submission.id}/revision`}
                                                                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                                                            >
                                                                Submit Revision
                                                            </Link>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}