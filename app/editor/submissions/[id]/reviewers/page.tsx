import Link from "next/link";
import { notFound } from "next/navigation";

import {
  isSuperAdmin,
  requireAnyRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import {
  assignReviewer,
  reassignReviewer,
  removeReviewerAssignment,
} from "./actions";

const REASSIGNABLE_STATUSES = ["INVITED", "ACCEPTED", "DECLINED"];

type Props = {
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

export default async function AssignReviewersPage({
  params,
}: Props) {
  const editor = await requireAnyRole(EDITORIAL_ROLES);

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: {
      id,
    },
    include: {
      author: true,
      journal: true,
      reviewAssignments: {
        include: {
          reviewer: true,
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
  const currentReviewRound =
    submission.currentReviewRound || 1;

  const blockedStatuses = [
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ];

  const assignmentAllowed =
    !blockedStatuses.includes(submission.status);

  const reviewers = assignmentAllowed
    ? await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            journalId: submission.journalId,
            role: "REVIEWER",
          },
        },
        NOT: {
          reviews: {
            some: {
              submissionId: submission.id,
              reviewRound: currentReviewRound,
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })
    : [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header>
        <Link
          href={`/editor/submissions/${submission.id}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to submission
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          Assign Reviewers
        </h1>

        <p className="mt-4 text-slate-600">
          Select reviewers for review round{" "}
          {currentReviewRound}.
        </p>
      </header>

      <section className="mt-10 rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">
          {submission.title}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">
              Author
            </p>
            <p className="font-medium">
              {submission.author.name}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Journal
            </p>
            <p className="font-medium">
              {submission.journal.shortName}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Status
            </p>
            <p className="font-medium">
              {formatStatus(submission.status)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Current review round
            </p>
            <p className="font-medium">
              Round {currentReviewRound}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">
          Assigned Reviewers
        </h2>

        <div className="mt-6 space-y-4">
          {submission.reviewAssignments.length === 0 && (
            <p className="text-slate-500">
              No reviewers assigned yet.
            </p>
          )}

          {submission.reviewAssignments.map(
            (assignment) => {
              const canRemove = REASSIGNABLE_STATUSES.includes(
                assignment.status,
              );

              const reassignCandidates = reviewers.filter(
                (reviewer) => reviewer.id !== assignment.reviewerId,
              );

              return (
                <div
                  key={assignment.id}
                  className="rounded-lg border bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {assignment.reviewer.name}
                      </p>

                      <p className="text-sm text-slate-600">
                        {assignment.reviewer.email}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">
                      Round {assignment.reviewRound}
                    </span>
                  </div>

                  <p className="mt-3 text-sm">
                    Status:{" "}
                    <strong>
                      {formatStatus(assignment.status)}
                    </strong>
                  </p>

                  {canRemove && (
                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
                      {reassignCandidates.length > 0 && (
                        <form
                          action={reassignReviewer}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />

                          <div>
                            <label
                              htmlFor={`reassign-${assignment.id}`}
                              className="mb-1 block text-sm font-medium"
                            >
                              Reassign to
                            </label>

                            <select
                              id={`reassign-${assignment.id}`}
                              name="newReviewerId"
                              defaultValue=""
                              required
                              className="rounded-lg border p-2 text-sm"
                            >
                              <option value="" disabled>
                                Select a reviewer
                              </option>

                              {reassignCandidates.map((reviewer) => (
                                <option
                                  key={reviewer.id}
                                  value={reviewer.id}
                                >
                                  {reviewer.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
                          >
                            Reassign
                          </button>
                        </form>
                      )}

                      <form action={removeReviewerAssignment}>
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={assignment.id}
                        />

                        <button
                          type="submit"
                          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">
          Available Reviewers
        </h2>

        {!assignmentAllowed ? (
          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-5 text-yellow-900">
            Reviewers cannot be assigned because this
            submission is currently{" "}
            {formatStatus(submission.status)}.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {reviewers.length === 0 && (
              <p className="text-slate-500">
                No eligible reviewers are available for
                this journal and review round.
              </p>
            )}

            {reviewers.map((reviewer) => (
              <div
                key={reviewer.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div>
                  <p className="font-semibold">
                    {reviewer.name}
                  </p>

                  <p className="text-sm text-slate-600">
                    {reviewer.email}
                  </p>

                  <p className="text-sm text-slate-600">
                    {reviewer.affiliation ||
                      "No affiliation provided"}
                  </p>
                </div>

                <form action={assignReviewer}>
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.id}
                  />

                  <input
                    type="hidden"
                    name="reviewerId"
                    value={reviewer.id}
                  />

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label
                        htmlFor={`dueDate-${reviewer.id}`}
                        className="mb-1 block text-sm font-medium"
                      >
                        Due date
                      </label>

                      <input
                        id={`dueDate-${reviewer.id}`}
                        name="dueDate"
                        type="date"
                        className="rounded-lg border p-2"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}