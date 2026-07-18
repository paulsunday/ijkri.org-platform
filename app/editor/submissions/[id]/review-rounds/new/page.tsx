import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { startNewReviewRound } from "./actions";

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
    }).format(value);
}

function getDefaultDueDate() {
    const date = new Date();

    date.setDate(date.getDate() + 14);

    return date.toISOString().slice(0, 10);
}

export default async function StartNewReviewRoundPage({
    params,
}: PageProps) {
    const editor =
        await requireAnyRole(EDITORIAL_ROLES);

    const { id } = await params;

    const submission =
        await prisma.submission.findUnique({
            where: {
                id,
            },

            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                    },
                },

                versions: {
                    include: {
                        uploadedBy: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },

                    orderBy: {
                        versionNumber: "desc",
                    },
                },

                reviewAssignments: {
                    include: {
                        reviewer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                affiliation: true,
                                isActive: true,
                            },
                        },

                        review: {
                            select: {
                                recommendation: true,
                                submittedAt: true,
                            },
                        },
                    },

                    orderBy: [
                        {
                            reviewRound: "desc",
                        },
                        {
                            createdAt: "asc",
                        },
                    ],
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

    const terminalStatuses = [
        "ACCEPTED",
        "REJECTED",
        "PUBLISHED",
        "WITHDRAWN",
    ];

    const isTerminal =
        terminalStatuses.includes(
            submission.status,
        );

    const latestVersion =
        submission.versions[0];

    const currentRound =
        submission.currentReviewRound || 1;

    const nextRound =
        currentRound + 1;

    const previousRoundAssignments =
        submission.reviewAssignments.filter(
            (assignment) =>
                assignment.reviewRound === currentRound,
        );

    const previousReviewerIds =
        new Set(
            previousRoundAssignments
                .filter(
                    (assignment) =>
                        assignment.reviewer.isActive,
                )
                .map(
                    (assignment) =>
                        assignment.reviewerId,
                ),
        );

    const existingNextRoundAssignments =
        submission.reviewAssignments.filter(
            (assignment) =>
                assignment.reviewRound === nextRound,
        );

    const reviewers =
        await prisma.user.findMany({
            where: {
                isActive: true,

                roles: {
                    some: {
                        journalId:
                            submission.journalId,
                        role: "REVIEWER",
                    },
                },
            },

            select: {
                id: true,
                name: true,
                email: true,
                affiliation: true,
                country: true,
            },

            orderBy: {
                name: "asc",
            },
        });

    const canStartRound =
        !isTerminal &&
        Boolean(latestVersion) &&
        existingNextRoundAssignments.length === 0;

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href={`/editor/submissions/${submission.id}/revisions`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to revision history
                </Link>

                <div className="mt-4">
                    <h1 className="text-3xl font-bold">
                        Start Review Round {nextRound}
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Select the reviewers who should assess the
                        latest revised manuscript.
                    </p>
                </div>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Manuscript Information
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                            {formatStatus(
                                submission.status,
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Completed review round
                        </p>

                        <p className="font-medium">
                            Round {currentRound}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            New review round
                        </p>

                        <p className="font-medium">
                            Round {nextRound}
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Latest Manuscript Version
                </h2>

                {!latestVersion ? (
                    <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                        <p className="font-semibold text-yellow-900">
                            No revised manuscript version was found.
                        </p>

                        <p className="mt-2 text-sm text-yellow-800">
                            The author must upload a revised manuscript
                            before another review round can begin.
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-blue-950">
                                    Version{" "}
                                    {latestVersion.versionNumber}
                                </p>

                                <p className="mt-1 text-sm text-blue-800">
                                    Uploaded by{" "}
                                    {latestVersion.uploadedBy.name} on{" "}
                                    {formatDate(
                                        latestVersion.createdAt,
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <a
                                    href={
                                        latestVersion.manuscriptFileUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                >
                                    Open Revised Manuscript
                                </a>

                                {latestVersion.responseFileUrl && (
                                    <a
                                        href={
                                            latestVersion.responseFileUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                                    >
                                        Open Author Response
                                    </a>
                                )}
                            </div>
                        </div>

                        {latestVersion.coverLetter && (
                            <div className="mt-5">
                                <p className="text-sm font-semibold text-blue-950">
                                    Revision cover letter
                                </p>

                                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm">
                                    {latestVersion.coverLetter}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {isTerminal && (
                <section className="rounded-xl border border-red-300 bg-red-50 p-6">
                    <h2 className="font-semibold text-red-900">
                        A new review round cannot be started
                    </h2>

                    <p className="mt-2 text-sm text-red-800">
                        This submission currently has the status{" "}
                        <strong>
                            {formatStatus(submission.status)}
                        </strong>
                        .
                    </p>
                </section>
            )}

            {existingNextRoundAssignments.length >
                0 && (
                    <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                        <h2 className="font-semibold text-yellow-900">
                            Review round {nextRound} already exists
                        </h2>

                        <p className="mt-2 text-sm text-yellow-800">
                            Reviewer assignments have already been
                            created for this round.
                        </p>

                        <Link
                            href={`/editor/submissions/${submission.id}/reviewers`}
                            className="mt-4 inline-block rounded-lg bg-yellow-700 px-5 py-3 font-semibold text-white hover:bg-yellow-800"
                        >
                            View Reviewer Assignments
                        </Link>
                    </section>
                )}

            {canStartRound && (
                <form
                    action={startNewReviewRound}
                    className="space-y-8"
                >
                    <input
                        type="hidden"
                        name="submissionId"
                        value={submission.id}
                    />

                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Select Reviewers
                                </h2>

                                <p className="mt-2 text-sm text-gray-600">
                                    Previous active reviewers are selected by
                                    default. You may remove them or select new
                                    reviewers.
                                </p>
                            </div>

                            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800">
                                Round {nextRound}
                            </span>
                        </div>

                        {reviewers.length === 0 ? (
                            <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                                <p className="font-semibold text-yellow-900">
                                    No active reviewers are registered for
                                    this journal.
                                </p>

                                <p className="mt-2 text-sm text-yellow-800">
                                    Add or approve reviewer accounts before
                                    starting the next round.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {reviewers.map((reviewer) => {
                                    const previousAssignment =
                                        previousRoundAssignments.find(
                                            (assignment) =>
                                                assignment.reviewerId ===
                                                reviewer.id,
                                        );

                                    const wasPreviousReviewer =
                                        previousReviewerIds.has(
                                            reviewer.id,
                                        );

                                    return (
                                        <label
                                            key={reviewer.id}
                                            className="flex cursor-pointer items-start gap-4 rounded-xl border p-5 hover:border-blue-400 hover:bg-blue-50"
                                        >
                                            <input
                                                type="checkbox"
                                                name="reviewerIds"
                                                value={reviewer.id}
                                                defaultChecked={
                                                    wasPreviousReviewer
                                                }
                                                className="mt-1 h-5 w-5"
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <p className="font-semibold">
                                                        {reviewer.name}
                                                    </p>

                                                    {wasPreviousReviewer && (
                                                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                                            Previous reviewer
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-1 text-sm text-gray-600">
                                                    {reviewer.email}
                                                </p>

                                                <p className="mt-1 text-sm text-gray-600">
                                                    {reviewer.affiliation ||
                                                        "No affiliation provided"}
                                                    {reviewer.country
                                                        ? ` · ${reviewer.country}`
                                                        : ""}
                                                </p>

                                                {previousAssignment && (
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        Round {currentRound} status:{" "}
                                                        <strong>
                                                            {formatStatus(
                                                                previousAssignment.status,
                                                            )}
                                                        </strong>
                                                        {previousAssignment.review
                                                            ?.recommendation
                                                            ? ` · Recommendation: ${formatStatus(
                                                                previousAssignment
                                                                    .review
                                                                    .recommendation,
                                                            )}`
                                                            : ""}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">
                            Review Configuration
                        </h2>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="dueDate"
                                    className="mb-2 block font-semibold"
                                >
                                    Review deadline
                                </label>

                                <input
                                    id="dueDate"
                                    name="dueDate"
                                    type="date"
                                    required
                                    min={new Date()
                                        .toISOString()
                                        .slice(0, 10)}
                                    defaultValue={getDefaultDueDate()}
                                    className="w-full rounded-lg border p-3"
                                />

                                <p className="mt-2 text-sm text-gray-500">
                                    The default deadline is 14 days from
                                    today.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="blindType"
                                    className="mb-2 block font-semibold"
                                >
                                    Review model
                                </label>

                                <select
                                    id="blindType"
                                    name="blindType"
                                    required
                                    defaultValue="DOUBLE_BLIND"
                                    className="w-full rounded-lg border p-3"
                                >
                                    <option value="DOUBLE_BLIND">
                                        Double-blind review
                                    </option>

                                    <option value="SINGLE_BLIND">
                                        Single-blind review
                                    </option>

                                    <option value="OPEN">
                                        Open review
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-purple-200 bg-purple-50 p-6">
                        <h2 className="font-semibold text-purple-950">
                            Confirm New Review Round
                        </h2>

                        <p className="mt-2 text-sm text-purple-900">
                            Starting Round {nextRound} will create new
                            reviewer assignments linked to Version{" "}
                            {latestVersion?.versionNumber}. Selected
                            reviewers will receive notifications and
                            invitation emails.
                        </p>

                        <button
                            type="submit"
                            disabled={reviewers.length === 0}
                            className="mt-5 rounded-lg bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                            Start Review Round {nextRound}
                        </button>
                    </section>
                </form>
            )}
        </main>
    );
}