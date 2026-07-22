import Link from "next/link";
import { notFound } from "next/navigation";

import {
  isSuperAdmin,
  requireAnyRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { sendEditorialDecision } from "./actions";

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

function recommendationStyle(
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

export default async function EditorialDecisionPage({
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
        author: true,
        journal: true,

        versions: {
          orderBy: {
            versionNumber: "desc",
          },
          take: 1,
        },

        reviewAssignments: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            review: true,
            submissionVersion: true,
          },

          orderBy: [
            {
              reviewRound: "desc",
            },
            {
              invitedAt: "asc",
            },
          ],
        },

        decisions: {
          include: {
            editor: true,
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

  if (!isSuperAdmin(editor)) {
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
  }

  const currentRound =
    submission.currentReviewRound || 1;

  const currentRoundAssignments =
    submission.reviewAssignments.filter(
      (assignment) =>
        assignment.reviewRound === currentRound,
    );

  const submittedAssignments =
    currentRoundAssignments.filter(
      (assignment) =>
        assignment.status === "SUBMITTED" &&
        assignment.review,
    );

  const pendingAssignments =
    currentRoundAssignments.filter(
      (assignment) =>
        assignment.status === "INVITED" ||
        assignment.status === "ACCEPTED",
    );

  const declinedAssignments =
    currentRoundAssignments.filter(
      (assignment) =>
        assignment.status === "DECLINED",
    );

  const roundComplete =
    currentRoundAssignments.length > 0 &&
    pendingAssignments.length === 0 &&
    submittedAssignments.length > 0;

  const latestVersion =
    submission.versions[0];

  const terminalStatus = [
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ].includes(submission.status);

  const recommendationCounts = {
    ACCEPT: submittedAssignments.filter(
      (assignment) =>
        assignment.review?.recommendation ===
        "ACCEPT",
    ).length,

    MINOR_REVISION: submittedAssignments.filter(
      (assignment) =>
        assignment.review?.recommendation ===
        "MINOR_REVISION",
    ).length,

    MAJOR_REVISION: submittedAssignments.filter(
      (assignment) =>
        assignment.review?.recommendation ===
        "MAJOR_REVISION",
    ).length,

    REJECT: submittedAssignments.filter(
      (assignment) =>
        assignment.review?.recommendation ===
        "REJECT",
    ).length,
  };

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
              Editorial Decision
            </h1>

            <p className="mt-2 text-gray-600">
              Assess the reports submitted during review
              round {currentRound} and issue the next
              editorial decision.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/editor/submissions/${submission.id}/review-rounds`}
              className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800"
            >
              Review-Round Summary
            </Link>

            <Link
              href={`/editor/submissions/${submission.id}/revisions`}
              className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
            >
              Revision History
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
              {formatStatus(submission.status)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Current review round
            </p>

            <p className="font-medium">
              Round {currentRound}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Manuscript version reviewed
            </p>

            <p className="font-medium">
              {latestVersion
                ? `Version ${latestVersion.versionNumber}`
                : "Version 1 — Original submission"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Submitted
            </p>

            <p className="font-medium">
              {formatDate(
                submission.submittedAt ??
                submission.createdAt,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Assignments
          </p>

          <p className="mt-2 text-3xl font-bold">
            {currentRoundAssignments.length}
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Submitted
          </p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {submittedAssignments.length}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">
            Pending
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {pendingAssignments.length}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            Declined
          </p>

          <p className="mt-2 text-3xl font-bold text-red-900">
            {declinedAssignments.length}
          </p>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Recommendation Summary — Round{" "}
          {currentRound}
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-700">
              Accept
            </p>

            <p className="mt-1 text-2xl font-bold text-green-900">
              {recommendationCounts.ACCEPT}
            </p>
          </div>

          <div className="rounded-lg bg-yellow-50 p-4">
            <p className="text-sm text-yellow-700">
              Minor Revision
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-900">
              {recommendationCounts.MINOR_REVISION}
            </p>
          </div>

          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-sm text-orange-700">
              Major Revision
            </p>

            <p className="mt-1 text-2xl font-bold text-orange-900">
              {recommendationCounts.MAJOR_REVISION}
            </p>
          </div>

          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-700">
              Reject
            </p>

            <p className="mt-1 text-2xl font-bold text-red-900">
              {recommendationCounts.REJECT}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Reviewer Reports — Round {currentRound}
        </h2>

        {currentRoundAssignments.length === 0 ? (
          <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
            <p className="font-semibold text-yellow-900">
              No reviewer assignments were found for this
              round.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {currentRoundAssignments.map(
              (assignment) => (
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
                    </div>

                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold">
                      {formatStatus(
                        assignment.status,
                      )}
                    </span>
                  </div>

                  {!assignment.review ? (
                    <div className="mt-5 rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-600">
                        This reviewer has not submitted a
                        review report.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${recommendationStyle(
                            assignment.review
                              .recommendation,
                          )}`}
                        >
                          {formatStatus(
                            assignment.review
                              .recommendation,
                          )}
                        </span>

                        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
                          Score:{" "}
                          {assignment.review.score ??
                            "Not supplied"}
                          /10
                        </span>

                        <span className="text-sm text-gray-500">
                          Submitted{" "}
                          {formatDate(
                            assignment.review
                              .submittedAt,
                          )}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-semibold">
                          Comments to Author
                        </h4>

                        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                          {assignment.review
                            .commentsToAuthor ||
                            "No comments provided."}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold">
                          Confidential Comments to Editor
                        </h4>

                        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                          {assignment.review
                            .commentsToEditor ||
                            "No confidential comments provided."}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {!roundComplete && !terminalStatus && (
        <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
          <h2 className="font-semibold text-yellow-900">
            Decision unavailable
          </h2>

          <p className="mt-2 text-sm text-yellow-800">
            An editorial decision cannot be issued until
            the current review round has at least one
            submitted report and no outstanding invited or
            accepted assignments.
          </p>

          <Link
            href={`/editor/submissions/${submission.id}/review-rounds`}
            className="mt-5 inline-block rounded-lg bg-yellow-700 px-5 py-3 font-semibold text-white hover:bg-yellow-800"
          >
            View Review-Round Progress
          </Link>
        </section>
      )}

      {terminalStatus && (
        <section className="rounded-xl border border-gray-300 bg-gray-50 p-6">
          <h2 className="font-semibold">
            Submission decision is closed
          </h2>

          <p className="mt-2 text-sm text-gray-700">
            This submission currently has the status{" "}
            <strong>
              {formatStatus(submission.status)}
            </strong>
            . A further decision cannot be issued.
          </p>
        </section>
      )}

      {roundComplete &&
        !terminalStatus && (
          <section className="rounded-xl border border-red-300 bg-red-50 p-6">
            <h2 className="font-semibold text-red-900">
              No eligible editor account found
            </h2>

            <p className="mt-2 text-sm text-red-800">
              Assign an active editorial role for this
              journal before recording a decision.
            </p>
          </section>
        )}

      {roundComplete &&
        !terminalStatus &&
        editor && (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Make Decision After Round{" "}
              {currentRound}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Decision will be recorded by{" "}
              <strong>{editor.name}</strong>.
            </p>

            <form
              action={sendEditorialDecision}
              className="mt-6 space-y-6"
            >
              <input
                type="hidden"
                name="submissionId"
                value={submission.id}
              />

              <input
                type="hidden"
                name="editorId"
                value={editor.id}
              />
              <div>
                <label
                  htmlFor="decision"
                  className="mb-2 block font-semibold"
                >
                  Editorial Decision
                </label>

                <select
                  id="decision"
                  name="decision"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border p-3"
                >
                  <option value="" disabled>
                    Select decision
                  </option>

                  <option value="REVISION_REQUIRED">
                    Request Another Revision
                  </option>

                  <option value="ACCEPTED">
                    Accept Manuscript
                  </option>

                  <option value="REJECTED">
                    Reject Manuscript
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="revisionDeadline"
                  className="mb-2 block font-semibold"
                >
                  Revision Deadline
                </label>

                <p className="mb-2 text-sm text-gray-500">
                  Required only when requesting another
                  revision.
                </p>

                <input
                  id="revisionDeadline"
                  name="revisionDeadline"
                  type="date"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label
                  htmlFor="comments"
                  className="mb-2 block font-semibold"
                >
                  Decision Letter / Comments to Author
                </label>

                <textarea
                  id="comments"
                  name="comments"
                  rows={12}
                  required
                  className="w-full rounded-lg border p-3"
                  placeholder="Dear Author, after considering the reviewer reports from the current review round..."
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
              >
                Send Round {currentRound} Decision
              </button>
            </form>
          </section>
        )}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Previous Editorial Decisions
        </h2>

        {submission.decisions.length === 0 ? (
          <p className="mt-4 text-gray-600">
            No editorial decision has been recorded.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {submission.decisions.map(
              (previousDecision) => (
                <article
                  key={previousDecision.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {formatStatus(
                          previousDecision.decision,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        By{" "}
                        {
                          previousDecision.editor
                            .name
                        }{" "}
                        on{" "}
                        {formatDate(
                          previousDecision.createdAt,
                        )}
                      </p>
                    </div>

                    {previousDecision.revisionDeadline && (
                      <p className="text-sm font-medium">
                        Revision deadline:{" "}
                        {formatDate(
                          previousDecision.revisionDeadline,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                    {previousDecision.comments ||
                      "No decision comments were recorded."}
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