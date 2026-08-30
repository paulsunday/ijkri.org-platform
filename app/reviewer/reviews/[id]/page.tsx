import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import {
  acceptReview,
  declineReview,
  submitReview,
} from "./actions";

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

export default async function ReviewerReviewPage({
  params,
}: Props) {
  const reviewer =
    await requireAnyRole(REVIEWER_ROLES);
  const { id } = await params;

  const assignment =
    await prisma.reviewAssignment.findFirst({
      where: {
        id,
        reviewerId: reviewer.id,
      },

      include: {
        reviewer: true,

        submissionVersion: true,

        submission: {
          include: {
            journal: true,

            files: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },

        review: {
          include: {
            attachments: {
              orderBy: {
                uploadedAt: "asc",
              },
            },
          },

        },
      },
    });

  if (!assignment) {
    notFound();
  }

  const previousAssignments =
    await prisma.reviewAssignment.findMany({
      where: {
        submissionId: assignment.submissionId,
        reviewerId: assignment.reviewerId,
        reviewRound: {
          lt: assignment.reviewRound,
        },
      },
      include: {
        review: {
          include: {
            attachments: {
              orderBy: {
                uploadedAt: "asc",
              },
            },
          },
        },
        submissionVersion: true,
      },
      orderBy: {
        reviewRound: "desc",
      },
    });

  const previousSubmittedReviews =
    previousAssignments.filter(
      (item) => item.review,
    );

  const isInitialRound =
    assignment.reviewRound === 1;

  const canRespondToInvitation =
    assignment.status === "INVITED";

  const canSubmitReview =
    assignment.status === "ACCEPTED";

  const reviewWasSubmitted =
    assignment.status === "SUBMITTED" &&
    Boolean(assignment.review);

  const reviewWasDeclined =
    assignment.status === "DECLINED";

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header>
        <Link
          href="/reviewer/dashboard"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to reviewer dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Review Manuscript
            </h1>

            <p className="mt-2 text-gray-600">
              Review round {assignment.reviewRound}
              {!isInitialRound
                ? " — Revised manuscript"
                : " — Initial manuscript"}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold">
            {formatStatus(assignment.status)}
          </span>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">
          {assignment.submission.title}
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">
              Journal
            </p>
            <p className="font-medium">
              {assignment.submission.journal.name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Manuscript type
            </p>
            <p className="font-medium">
              {assignment.submission.manuscriptType ||
                "Not specified"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Review round
            </p>
            <p className="font-medium">
              Round {assignment.reviewRound}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Manuscript version
            </p>
            <p className="font-medium">
              {assignment.submissionVersion
                ? `Version ${assignment.submissionVersion.versionNumber}`
                : "Version 1 — Original submission"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Invited
            </p>
            <p className="font-medium">
              {formatDate(assignment.invitedAt)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Review deadline
            </p>
            <p className="font-medium">
              {formatDate(assignment.dueDate)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Abstract
        </h2>

        <div className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-5">
          {assignment.submission.abstract}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Manuscript Files
        </h2>

        {assignment.submissionVersion ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="break-words font-semibold">
                  Revised manuscript — Version{" "}
                  {
                    assignment.submissionVersion
                      .versionNumber
                  }
                </p>

                <p className="mt-1 break-words text-sm text-gray-600">
                  {assignment.submissionVersion
                    .manuscriptFileName ||
                    "Revised manuscript"}
                </p>
              </div>

              <a
                href={
                  assignment.submissionVersion
                    .manuscriptFileUrl
                }
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Download Manuscript
              </a>
            </div>

            {assignment.submissionVersion
              .responseFileUrl && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      Response to Reviewers
                    </p>

                    <p className="mt-1 break-words text-sm text-gray-600">
                      {assignment.submissionVersion
                        .responseFileName ||
                        "Response document"}
                    </p>
                  </div>

                  <a
                    href={
                      assignment.submissionVersion
                        .responseFileUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Download Response
                  </a>
                </div>
              )}

            {assignment.submissionVersion
              .coverLetter && (
                <div>
                  <p className="font-semibold">
                    Revision Cover Letter
                  </p>

                  <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                    {
                      assignment.submissionVersion
                        .coverLetter
                    }
                  </div>
                </div>
              )}

            {assignment.submissionVersion
              .authorNotes && (
                <div>
                  <p className="font-semibold">
                    Author Notes
                  </p>

                  <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                    {
                      assignment.submissionVersion
                        .authorNotes
                    }
                  </div>
                </div>
              )}
          </div>
        ) : assignment.submission.files.length ===
          0 ? (
          <p className="mt-4 text-gray-600">
            No manuscript file was found.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {assignment.submission.files.map(
              (file) => (
                <div
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold">
                      {file.fileName}
                    </p>

                    <p className="mt-1 break-words text-sm text-gray-600">
                      {file.label ||
                        file.fileType ||
                        "Submission file"}
                    </p>
                  </div>

                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Download
                  </a>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {!isInitialRound && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Your Previous Review Reports
          </h2>

          {previousSubmittedReviews.length ===
            0 ? (
            <p className="mt-4 text-gray-600">
              No previous submitted review report was
              found for this reviewer.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {previousSubmittedReviews.map(
                (previousAssignment) => (
                  <article
                    key={previousAssignment.id}
                    className="rounded-lg border p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          Review Round{" "}
                          {
                            previousAssignment.reviewRound
                          }
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          Recommendation:{" "}
                          {previousAssignment.review
                            ? formatStatus(
                              previousAssignment
                                .review
                                .recommendation,
                            )
                            : "Not available"}
                        </p>
                      </div>

                      {previousAssignment.review && (
                        <p className="text-sm text-gray-600">
                          Submitted{" "}
                          {formatDate(
                            previousAssignment.review
                              .submittedAt,
                          )}
                        </p>
                      )}
                    </div>

                    {previousAssignment.review && (
                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-sm font-semibold">
                            Previous comments to the
                            author
                          </p>

                          <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                            {previousAssignment.review
                              .commentsToAuthor ||
                              "No comments"}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold">
                            Previous confidential
                            comments to the editor
                          </p>

                          <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                            {previousAssignment.review
                              .commentsToEditor ||
                              "No comments"}
                          </div>
                        </div>
                        {previousAssignment.review.attachments.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold">
                              Previous review attachments
                            </p>

                            <div className="mt-2 space-y-2">
                              {previousAssignment.review.attachments.map(
                                (attachment) => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm hover:bg-gray-50"
                                  >
                                    <span className="min-w-0 break-words">
                                      {attachment.fileName}
                                    </span>

                                    <span className="shrink-0 font-medium text-blue-700">
                                      Download
                                    </span>
                                  </a>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      )}

      {canRespondToInvitation && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Respond to Invitation
          </h2>

          <p className="mt-2 text-gray-600">
            Please accept or decline this review
            invitation.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <form action={acceptReview}>
              <input
                type="hidden"
                name="assignmentId"
                value={assignment.id}
              />

              <button
                type="submit"
                className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
              >
                Accept Review
              </button>
            </form>

            <form action={declineReview}>
              <input
                type="hidden"
                name="assignmentId"
                value={assignment.id}
              />

              <button
                type="submit"
                className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
              >
                Decline Review
              </button>
            </form>
          </div>
        </section>
      )}

      {canSubmitReview && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">
            Peer Review Report — Round{" "}
            {assignment.reviewRound}
          </h2>

          <form
            action={submitReview}
            encType="multipart/form-data"
            className="mt-8 space-y-8"
          >
            <input
              type="hidden"
              name="assignmentId"
              value={assignment.id}
            />

            <div>
              <label
                htmlFor="score"
                className="mb-2 block font-semibold"
              >
                Overall Score (1–10)
              </label>

              <input
                id="score"
                type="number"
                name="score"
                min={1}
                max={10}
                step={1}
                required
                className="w-40 rounded-lg border p-3"
              />
            </div>

            <div>
              <label
                htmlFor="recommendation"
                className="mb-2 block font-semibold"
              >
                Recommendation
              </label>

              <select
                id="recommendation"
                name="recommendation"
                required
                defaultValue=""
                className="w-full rounded-lg border p-3"
              >
                <option value="" disabled>
                  Select recommendation
                </option>
                <option value="ACCEPT">
                  Accept
                </option>
                <option value="MINOR_REVISION">
                  Minor Revision
                </option>
                <option value="MAJOR_REVISION">
                  Major Revision
                </option>
                <option value="REJECT">
                  Reject
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="commentsToAuthor"
                className="mb-2 block font-semibold"
              >
                Comments to the Author
              </label>

              <textarea
                id="commentsToAuthor"
                name="commentsToAuthor"
                rows={10}
                required
                className="w-full rounded-lg border p-3"
                placeholder="Provide constructive comments that may be shared with the author."
              />
            </div>

            <div>
              <label
                htmlFor="commentsToEditor"
                className="mb-2 block font-semibold"
              >
                Confidential Comments to the Editor
              </label>

              <textarea
                id="commentsToEditor"
                name="commentsToEditor"
                rows={7}
                className="w-full rounded-lg border p-3"
                placeholder="Optional confidential comments for the editor."
              />
            </div>

            <div>
              <label
                htmlFor="attachments"
                className="mb-2 block font-semibold"
              >
                Reviewer Attachments (Optional)
              </label>

              <input
                id="attachments"
                name="attachments"
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="block w-full rounded-lg border p-3"
              />

              <p className="mt-2 text-sm text-gray-500">
                Upload annotated manuscripts or any supporting review
                documents. Maximum 5 files.
              </p>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-8 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Submit Round{" "}
              {assignment.reviewRound} Review
            </button>
          </form>
        </section>
      )}

      {reviewWasSubmitted &&
        assignment.review && (
          <section className="rounded-xl border border-green-300 bg-green-50 p-6">
            <h2 className="text-xl font-semibold text-green-900">
              Review Submitted
            </h2>

            <p className="mt-2 text-green-800">
              Your Round {assignment.reviewRound}{" "}
              review has been submitted successfully.
            </p>

            <div className="mt-5 space-y-4">
              <p>
                <strong>Score:</strong>{" "}
                {assignment.review.score ??
                  "Not specified"}
              </p>

              <p>
                <strong>Recommendation:</strong>{" "}
                {formatStatus(
                  assignment.review.recommendation,
                )}
              </p>

              <div>
                <p className="font-semibold">
                  Comments to Author
                </p>

                <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white p-4">
                  {assignment.review
                    .commentsToAuthor ||
                    "No comments"}
                </div>
              </div>

              <div>
                <p className="font-semibold">
                  Confidential Comments to Editor
                </p>

                <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white p-4">
                  {assignment.review
                    .commentsToEditor ||
                    "No comments"}
                </div>
              </div>
              {assignment.review.attachments.length > 0 && (
                <div>
                  <p className="font-semibold">
                    Review Attachments
                  </p>

                  <div className="mt-2 space-y-2">
                    {assignment.review.attachments.map(
                      (attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3"
                        >
                          <div className="min-w-0">
                            <p className="break-words font-medium">
                              {attachment.fileName}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {attachment.mimeType ||
                                "Review attachment"}
                              {attachment.fileSize
                                ? ` · ${(attachment.fileSize / 1024 / 1024).toFixed(2)} MB`
                                : ""}
                            </p>
                          </div>

                          <span className="shrink-0 text-sm font-semibold text-blue-700">
                            Download
                          </span>
                        </a>
                      ),
                    )}
                  </div>
                </div>
              )}

            </div>
          </section>
        )}

      {reviewWasDeclined && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-6">
          <h2 className="text-xl font-semibold text-red-900">
            Invitation Declined
          </h2>

          <p className="mt-2 text-red-800">
            You declined this review invitation. Contact
            the editorial office if this was done in
            error.
          </p>
        </section>
      )}
    </main>
  );
}