import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { sendReviewerReminder } from "./actions";

type ReviewsPageProps = {
  searchParams: Promise<{
    query?: string;
    status?: string;
    timing?: string;
  }>;
};

const OPEN_REVIEW_STATUSES = [
  "INVITED",
  "ACCEPTED",
] as const;

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
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function isOpenReview(status: string) {
  return OPEN_REVIEW_STATUSES.includes(
    status as (typeof OPEN_REVIEW_STATUSES)[number],
  );
}

function isOverdue(
  dueDate: Date | null,
  status: string,
  now: Date,
) {
  return Boolean(
    dueDate &&
    dueDate.getTime() < now.getTime() &&
    isOpenReview(status),
  );
}

function isDueSoon(
  dueDate: Date | null,
  status: string,
  now: Date,
) {
  if (!dueDate || !isOpenReview(status)) {
    return false;
  }

  const difference =
    dueDate.getTime() - now.getTime();

  const threeDays =
    3 * 24 * 60 * 60 * 1000;

  return difference >= 0 && difference <= threeDays;
}

function getDaysDifference(
  dueDate: Date,
  now: Date,
) {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.ceil(
    Math.abs(
      dueDate.getTime() - now.getTime(),
    ) / millisecondsPerDay,
  );
}

function getStatusClass(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "bg-green-100 text-green-800";

    case "ACCEPTED":
      return "bg-blue-100 text-blue-800";

    case "INVITED":
      return "bg-yellow-100 text-yellow-800";

    case "DECLINED":
      return "bg-red-100 text-red-800";

    case "CANCELLED":
      return "bg-gray-200 text-gray-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function ReviewsPage({
  searchParams,
}: ReviewsPageProps) {
  await requireAnyRole(ADMIN_ROLES);

  const params = await searchParams;

  const query =
    params.query?.trim().toLowerCase() || "";

  const statusFilter =
    params.status?.trim().toUpperCase() || "ALL";

  const timingFilter =
    params.timing?.trim().toUpperCase() || "ALL";

  const now = new Date();

  const assignments =
    await prisma.reviewAssignment.findMany({
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            affiliation: true,
            country: true,
            isActive: true,
          },
        },

        submission: {
          select: {
            id: true,
            title: true,
            status: true,
            currentReviewRound: true,

            journal: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },

            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },

        review: {
          select: {
            id: true,
            recommendation: true,
            score: true,
            submittedAt: true,
          },
        },
      },

      orderBy: [
        {
          dueDate: "asc",
        },
        {
          invitedAt: "desc",
        },
      ],
    });

  const filteredAssignments =
    assignments.filter((assignment) => {
      const overdue = isOverdue(
        assignment.dueDate,
        assignment.status,
        now,
      );

      const dueSoon = isDueSoon(
        assignment.dueDate,
        assignment.status,
        now,
      );

      const matchesQuery =
        !query ||
        assignment.submission.title
          .toLowerCase()
          .includes(query) ||
        assignment.reviewer.name
          .toLowerCase()
          .includes(query) ||
        assignment.reviewer.email
          .toLowerCase()
          .includes(query) ||
        assignment.submission.journal.name
          .toLowerCase()
          .includes(query) ||
        assignment.submission.journal.shortName
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        assignment.status === statusFilter;

      let matchesTiming = true;

      if (timingFilter === "OVERDUE") {
        matchesTiming = overdue;
      }

      if (timingFilter === "DUE_SOON") {
        matchesTiming = dueSoon;
      }

      if (timingFilter === "NO_DEADLINE") {
        matchesTiming =
          !assignment.dueDate &&
          isOpenReview(assignment.status);
      }

      if (timingFilter === "OPEN") {
        matchesTiming =
          isOpenReview(assignment.status);
      }

      if (timingFilter === "COMPLETED") {
        matchesTiming =
          assignment.status === "SUBMITTED";
      }

      return (
        matchesQuery &&
        matchesStatus &&
        matchesTiming
      );
    });

  const totalAssignments = assignments.length;

  const invitedCount =
    assignments.filter(
      (assignment) =>
        assignment.status === "INVITED",
    ).length;

  const acceptedCount =
    assignments.filter(
      (assignment) =>
        assignment.status === "ACCEPTED",
    ).length;

  const submittedCount =
    assignments.filter(
      (assignment) =>
        assignment.status === "SUBMITTED",
    ).length;

  const declinedCount =
    assignments.filter(
      (assignment) =>
        assignment.status === "DECLINED",
    ).length;

  const overdueCount =
    assignments.filter((assignment) =>
      isOverdue(
        assignment.dueDate,
        assignment.status,
        now,
      ),
    ).length;

  const dueSoonCount =
    assignments.filter((assignment) =>
      isDueSoon(
        assignment.dueDate,
        assignment.status,
        now,
      ),
    ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          Peer Review Administration
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          Review Monitoring
        </h1>

        <p className="mt-4 max-w-3xl text-slate-600">
          Monitor reviewer invitations, accepted
          assignments, deadlines, overdue reports and
          completed peer reviews across all journals.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total assignments
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalAssignments}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-800">
            Awaiting response
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-950">
            {invitedCount}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm text-blue-800">
            Reviews in progress
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-950">
            {acceptedCount}
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-800">
            Reviews submitted
          </p>

          <p className="mt-2 text-3xl font-bold text-green-950">
            {submittedCount}
          </p>
        </div>

        <div className="rounded-xl border border-red-300 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800">
            Overdue reviews
          </p>

          <p className="mt-2 text-3xl font-bold text-red-950">
            {overdueCount}
          </p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm text-orange-800">
            Due within three days
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-950">
            {dueSoonCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Declined invitations
          </p>

          <p className="mt-2 text-3xl font-bold">
            {declinedCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Open assignments
          </p>

          <p className="mt-2 text-3xl font-bold">
            {invitedCount + acceptedCount}
          </p>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">
          Search and filter
        </h2>

        <form
          method="get"
          className="mt-5 grid gap-4 md:grid-cols-4"
        >
          <div className="md:col-span-2">
            <label
              htmlFor="query"
              className="mb-2 block text-sm font-semibold"
            >
              Search
            </label>

            <input
              id="query"
              name="query"
              type="search"
              defaultValue={params.query || ""}
              placeholder="Manuscript, reviewer, email or journal"
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-semibold"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-lg border px-4 py-3"
            >
              <option value="ALL">
                All statuses
              </option>

              <option value="INVITED">
                Invited
              </option>

              <option value="ACCEPTED">
                Accepted
              </option>

              <option value="DECLINED">
                Declined
              </option>

              <option value="SUBMITTED">
                Submitted
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="timing"
              className="mb-2 block text-sm font-semibold"
            >
              Deadline
            </label>

            <select
              id="timing"
              name="timing"
              defaultValue={timingFilter}
              className="w-full rounded-lg border px-4 py-3"
            >
              <option value="ALL">
                All deadlines
              </option>

              <option value="OPEN">
                All open reviews
              </option>

              <option value="OVERDUE">
                Overdue
              </option>

              <option value="DUE_SOON">
                Due within three days
              </option>

              <option value="NO_DEADLINE">
                No deadline
              </option>

              <option value="COMPLETED">
                Completed
              </option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Apply filters
            </button>

            <Link
              href="/admin/reviews"
              className="rounded-lg border px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <header className="border-b bg-slate-50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">
                Review Assignments
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Showing {filteredAssignments.length} of{" "}
                {totalAssignments} assignments.
              </p>
            </div>
          </div>
        </header>

        {filteredAssignments.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="text-lg font-semibold">
              No review assignments found
            </h3>

            <p className="mt-2 text-slate-600">
              No assignments match the selected search
              and filtering criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4">
                    Manuscript
                  </th>

                  <th className="px-5 py-4">
                    Reviewer
                  </th>

                  <th className="px-5 py-4">
                    Round
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Deadline
                  </th>

                  <th className="px-5 py-4">
                    Recommendation
                  </th>

                  <th className="px-5 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredAssignments.map(
                  (assignment) => {
                    const overdue = isOverdue(
                      assignment.dueDate,
                      assignment.status,
                      now,
                    );

                    const dueSoon = isDueSoon(
                      assignment.dueDate,
                      assignment.status,
                      now,
                    );

                    return (
                      <tr
                        key={assignment.id}
                        className={
                          overdue
                            ? "bg-red-50"
                            : dueSoon
                              ? "bg-orange-50"
                              : ""
                        }
                      >
                        <td className="max-w-sm px-5 py-5 align-top">
                          <Link
                            href={`/editor/submissions/${assignment.submission.id}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            {assignment.submission.title}
                          </Link>

                          <p className="mt-1 text-sm text-slate-600">
                            {
                              assignment.submission
                                .journal.shortName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Author:{" "}
                            {
                              assignment.submission
                                .author.name
                            }
                          </p>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <p className="font-semibold">
                            {assignment.reviewer.name}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {assignment.reviewer.email}
                          </p>

                          {!assignment.reviewer
                            .isActive && (
                              <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                                Inactive account
                              </span>
                            )}
                        </td>

                        <td className="px-5 py-5 align-top">
                          <span className="font-semibold">
                            Round{" "}
                            {assignment.reviewRound}
                          </span>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              assignment.status,
                            )}`}
                          >
                            {formatStatus(
                              assignment.status,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <p className="text-sm font-medium">
                            {formatDate(
                              assignment.dueDate,
                            )}
                          </p>

                          {overdue &&
                            assignment.dueDate && (
                              <span className="mt-2 inline-block rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                                Overdue by{" "}
                                {getDaysDifference(
                                  assignment.dueDate,
                                  now,
                                )}{" "}
                                day
                                {getDaysDifference(
                                  assignment.dueDate,
                                  now,
                                ) === 1
                                  ? ""
                                  : "s"}
                              </span>
                            )}

                          {dueSoon &&
                            assignment.dueDate && (
                              <span className="mt-2 inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                                Due in{" "}
                                {getDaysDifference(
                                  assignment.dueDate,
                                  now,
                                )}{" "}
                                day
                                {getDaysDifference(
                                  assignment.dueDate,
                                  now,
                                ) === 1
                                  ? ""
                                  : "s"}
                              </span>
                            )}
                        </td>

                        <td className="px-5 py-5 align-top">
                          {assignment.review ? (
                            <>
                              <p className="font-semibold">
                                {formatStatus(
                                  assignment.review
                                    .recommendation,
                                )}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                Score:{" "}
                                {assignment.review
                                  .score ?? "N/A"}
                                /10
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-slate-500">
                              Not submitted
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="flex flex-col items-start gap-2">
                            {isOpenReview(assignment.status) && (
                              <form action={sendReviewerReminder}>
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />

                                <button
                                  type="submit"
                                  className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                                >
                                  Send Reminder
                                </button>
                              </form>
                            )}
                            <Link
                              href={`/editor/submissions/${assignment.submission.id}/review-rounds`}
                              className="text-sm font-semibold text-blue-700 hover:underline"
                            >
                              Review details
                            </Link>

                            <Link
                              href={`/editor/submissions/${assignment.submission.id}/reviewers`}
                              className="text-sm font-semibold text-slate-700 hover:underline"
                            >
                              Manage reviewers
                            </Link>

                            <Link
                              href={`/reviewer/reviews/${assignment.id}`}
                              className="text-sm font-semibold text-slate-700 hover:underline"
                            >
                              Assignment record
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}