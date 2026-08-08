import Link from "next/link";
import { notFound } from "next/navigation";

import {
  isSuperAdmin,
  requireAnyRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { detectConflicts, type ConflictReport } from "@/lib/coi/detect";

import {
  assignReviewer,
  reassignReviewer,
  removeReviewerAssignment,
} from "./actions";

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-slate-100 text-slate-700",
};

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
  const editorIsSuperAdmin = isSuperAdmin(editor);

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
        /*
         * Conflict of interest: a reviewer who referred this
         * manuscript's author is excluded from the assignable list
         * for regular editors. Super admins are trusted to make this
         * call themselves, so they see the full candidate list (with
         * the conflict still flagged for visibility).
         */
        ...(submission.referrerReviewerId && !editorIsSuperAdmin
          ? { id: { not: submission.referrerReviewerId } }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
    })
    : [];

  /*
   * Preview pass: run the advanced COI engine for every remaining
   * candidate. HIGH findings remove the reviewer from the assignable
   * list entirely (defense layer 1 — the server action re-checks and
   * blocks HIGH findings again before writing the assignment). MEDIUM/LOW
   * findings are shown as a warning the editor must acknowledge.
   */
  const reviewerConflicts = new Map<string, ConflictReport>(
    await Promise.all(
      reviewers.map(
        async (reviewer): Promise<[string, ConflictReport]> => [
          reviewer.id,
          await detectConflicts({
            submissionId: submission.id,
            reviewerId: reviewer.id,
          }),
        ],
      ),
    ),
  );

  /*
   * HIGH-severity findings remove a reviewer from the assignable list
   * for regular editors. Super admins can see and select every
   * candidate regardless of severity — the flagged conflict is still
   * shown so the decision is informed, but it no longer blocks them.
   */
  const assignableReviewers = editorIsSuperAdmin
    ? reviewers
    : reviewers.filter(
      (reviewer) => reviewerConflicts.get(reviewer.id)?.highestSeverity !== "HIGH",
    );

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

              const reassignCandidates = assignableReviewers.filter(
                (reviewer) => reviewer.id !== assignment.reviewerId,
              );

              return (
                <div
                  key={assignment.id}
                  className="rounded-lg border bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">
                        {assignment.reviewer.name}
                      </p>

                      <p className="break-all text-sm text-slate-600">
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

        {submission.referrerReviewerId && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            {editorIsSuperAdmin
              ? "This manuscript was referred by a reviewer. That reviewer is flagged as a conflict of interest below but is still selectable, since you are signed in as a super admin."
              : "This manuscript was referred by a reviewer. That reviewer is excluded from this list to avoid a conflict of interest."}
          </p>
        )}

        {!assignmentAllowed ? (
          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-5 text-yellow-900">
            Reviewers cannot be assigned because this
            submission is currently{" "}
            {formatStatus(submission.status)}.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {assignableReviewers.length === 0 && (
              <p className="text-slate-500">
                No eligible reviewers are available for
                this journal and review round.
              </p>
            )}

            {assignableReviewers.map((reviewer) => {
              const conflicts = reviewerConflicts.get(reviewer.id);
              const findings = conflicts?.findings ?? [];

              return (
              <div
                key={reviewer.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <p className="break-words font-semibold">
                    {reviewer.name}
                  </p>

                  <p className="break-all text-sm text-slate-600">
                    {reviewer.email}
                  </p>

                  <p className="break-words text-sm text-slate-600">
                    {reviewer.affiliation ||
                      "No affiliation provided"}
                  </p>

                  {findings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {findings.map((finding, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-xs"
                        >
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${SEVERITY_BADGE_CLASS[finding.severity]}`}
                          >
                            {finding.severity}
                          </span>
                          <span className="text-slate-600">{finding.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
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

                    {findings.length > 0 && (
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          name="acknowledgedConflicts"
                          value="true"
                          required={!editorIsSuperAdmin}
                          defaultChecked={editorIsSuperAdmin}
                        />
                        I acknowledge the flagged conflict(s) above
                      </label>
                    )}

                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </div>
                </form>
              </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}