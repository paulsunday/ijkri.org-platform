import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: Date | null | undefined) {
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

function getRecommendationClass(
  recommendation: string | null | undefined,
) {
  switch (recommendation) {
    case "ACCEPT":
      return "bg-green-100 text-green-800";

    case "MINOR_REVISION":
      return "bg-yellow-100 text-yellow-800";

    case "MAJOR_REVISION":
      return "bg-orange-100 text-orange-800";

    case "REJECT":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function EditorReviewRoundsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: {
      id,
    },
    include: {
      journal: true,
      author: true,

      versions: {
        orderBy: {
          versionNumber: "asc",
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
              country: true,
            },
          },

          review: true,
          submissionVersion: true,
        },

        orderBy: [
          {
            reviewRound: "asc",
          },
          {
            invitedAt: "asc",
          },
        ],
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const reviewRounds = Array.from(
    new Set(
      submission.reviewAssignments.map(
        (assignment) => assignment.reviewRound,
      ),
    ),
  ).sort((firstRound, secondRound) => firstRound - secondRound);

  const totalAssignments =
    submission.reviewAssignments.length;

  const totalSubmitted =
    submission.reviewAssignments.filter(
      (assignment) => assignment.status === "SUBMITTED",
    ).length;

  const totalPending =
    submission.reviewAssignments.filter(
      (assignment) =>
        assignment.status === "INVITED" ||
        assignment.status === "ACCEPTED",
    ).length;

  const totalDeclined =
    submission.reviewAssignments.filter(
      (assignment) => assignment.status === "DECLINED",
    ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <header>
        <Link
          href={`/editor/submissions/${submission.id}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to editor workspace
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Review-Round Summary
            </h1>

            <p className="mt-2 text-gray-600">
              Compare reviewer assignments, reports and recommendations
              across all review rounds.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/editor/submissions/${submission.id}/revisions`}
              className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
            >
              Revision History
            </Link>

            <Link
              href={`/editor/submissions/${submission.id}/decisions`}
              className="rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Make Editorial Decision
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Manuscript Information
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
              Current review round
            </p>

            <p className="font-medium">
              Round {submission.currentReviewRound}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Latest manuscript version
            </p>

            <p className="font-medium">
              Version{" "}
              {submission.versions.at(-1)?.versionNumber ?? 1}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total assignments
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalAssignments}
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Reviews submitted
          </p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {totalSubmitted}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">
            Reviews pending
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {totalPending}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            Invitations declined
          </p>

          <p className="mt-2 text-3xl font-bold text-red-900">
            {totalDeclined}
          </p>
        </div>
      </section>

      {reviewRounds.length === 0 ? (
        <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
          <h2 className="font-semibold text-yellow-900">
            No review rounds found
          </h2>

          <p className="mt-2 text-sm text-yellow-800">
            No reviewer assignments have been created for this
            submission.
          </p>

          <Link
            href={`/editor/submissions/${submission.id}/reviewers`}
            className="mt-5 inline-block rounded-lg bg-yellow-700 px-5 py-3 font-semibold text-white hover:bg-yellow-800"
          >
            Assign Reviewers
          </Link>
        </section>
      ) : (
        <div className="space-y-8">
          {reviewRounds.map((roundNumber) => {
            const assignments =
              submission.reviewAssignments.filter(
                (assignment) =>
                  assignment.reviewRound === roundNumber,
              );

            const submittedAssignments =
              assignments.filter(
                (assignment) =>
                  assignment.status === "SUBMITTED",
              );

            const pendingAssignments =
              assignments.filter(
                (assignment) =>
                  assignment.status === "INVITED" ||
                  assignment.status === "ACCEPTED",
              );

            const declinedAssignments =
              assignments.filter(
                (assignment) =>
                  assignment.status === "DECLINED",
              );

            const roundComplete =
              assignments.length > 0 &&
              pendingAssignments.length === 0;

            const reviewedVersion =
              assignments.find(
                (assignment) =>
                  assignment.submissionVersion,
              )?.submissionVersion;

            return (
              <section
                key={roundNumber}
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                <header className="border-b bg-slate-50 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        Review Round {roundNumber}
                      </h2>

                      <p className="mt-2 text-gray-600">
                        {reviewedVersion
                          ? `Reviewing manuscript Version ${reviewedVersion.versionNumber}`
                          : "Reviewing the original manuscript"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                        {submittedAssignments.length} submitted
                      </span>

                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
                        {pendingAssignments.length} pending
                      </span>

                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                        {declinedAssignments.length} declined
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    {roundComplete ? (
                      <div className="rounded-lg border border-green-300 bg-green-50 p-4">
                        <p className="font-semibold text-green-900">
                          This review round has no outstanding reviews.
                        </p>

                        <p className="mt-1 text-sm text-green-800">
                          The editor may now assess the reports and make
                          an editorial decision.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
                        <p className="font-semibold text-yellow-900">
                          This review round is still in progress.
                        </p>

                        <p className="mt-1 text-sm text-yellow-800">
                          {pendingAssignments.length} reviewer
                          assignment
                          {pendingAssignments.length === 1 ? "" : "s"}{" "}
                          remain outstanding.
                        </p>
                      </div>
                    )}
                  </div>
                </header>

                <div className="space-y-6 p-6">
                  {assignments.map((assignment) => (
                    <article
                      key={assignment.id}
                      className="rounded-xl border p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {assignment.reviewer.name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-600">
                            {assignment.reviewer.email}
                          </p>

                          {(assignment.reviewer.affiliation ||
                            assignment.reviewer.country) && (
                            <p className="mt-1 text-sm text-gray-500">
                              {[
                                assignment.reviewer.affiliation,
                                assignment.reviewer.country,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>

                        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold">
                          {formatStatus(assignment.status)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Invited
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {formatDate(assignment.invitedAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Accepted
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {formatDate(assignment.acceptedAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Due date
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {formatDate(assignment.dueDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Completed
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {formatDate(assignment.completedAt)}
                          </p>
                        </div>
                      </div>

                      {!assignment.review ? (
                        <div className="mt-5 rounded-lg bg-gray-50 p-4">
                          <p className="text-sm text-gray-600">
                            No review report has been submitted for this
                            assignment.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-5">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full px-4 py-2 text-sm font-semibold ${getRecommendationClass(
                                assignment.review.recommendation,
                              )}`}
                            >
                              {formatStatus(
                                assignment.review.recommendation,
                              )}
                            </span>

                            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
                              Score:{" "}
                              {assignment.review.score ??
                                "Not provided"}
                              /10
                            </span>

                            <span className="text-sm text-gray-500">
                              Submitted{" "}
                              {formatDate(
                                assignment.review.submittedAt,
                              )}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-semibold">
                              Comments to the Author
                            </h4>

                            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                              {assignment.review.commentsToAuthor ||
                                "No comments were provided."}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold">
                              Confidential Comments to the Editor
                            </h4>

                            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                              {assignment.review.commentsToEditor ||
                                "No confidential comments were provided."}
                            </div>
                          </div>

                          <Link
                            href={`/reviewer/reviews/${assignment.id}`}
                            className="inline-block text-sm font-semibold text-blue-700 hover:underline"
                          >
                            Open complete review record
                          </Link>
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <footer className="border-t bg-slate-50 p-6">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/editor/submissions/${submission.id}/reviewers`}
                      className="rounded-lg border border-gray-400 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Manage Reviewers
                    </Link>

                    {roundComplete && (
                      <Link
                        href={`/editor/submissions/${submission.id}/decisions`}
                        className="rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
                      >
                        Make Decision After Round {roundNumber}
                      </Link>
                    )}
                  </div>
                </footer>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
