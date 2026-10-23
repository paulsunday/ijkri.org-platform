import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import {
  authorStatusBadgeClass,
  formatAuthorStatusLabel,
  getAuthorFacingStatus,
  isAuthorFacingPublished,
} from "@/lib/manuscripts/author-status";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function invoiceStatusBadgeClass(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800";

    case "WAIVED":
      return "bg-blue-100 text-blue-800";

    case "PARTIALLY_WAIVED":
      return "bg-purple-100 text-purple-800";

    case "OVERDUE":
      return "bg-red-100 text-red-800";

    case "VOID":
      return "bg-gray-200 text-gray-700";

    case "PENDING":
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

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

export default async function AuthorSubmissionDetailsPage({
  params,
}: PageProps) {
  const author =
    await requireAnyRole(AUTHOR_ROLES);

  const { id } = await params;

  const submission =
    await prisma.submission.findUnique({
      where: {
        id,
      },

      include: {
        journal: true,
        author: true,

        article: {
          select: {
            issn: true,
          },
        },

        files: {
          orderBy: {
            createdAt: "asc",
          },
        },

        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },

        decisions: {
          include: {
            editor: {
              select: {
                name: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },

        invoice: true,
      },
    });

  if (!submission) {
    notFound();
  }

  if (submission.authorId !== author.id) {
    notFound();
  }

  const latestVersion =
    submission.versions[0];

  const canSubmitRevision =
    submission.status ===
    "REVISION_REQUIRED";

  const canReviewFinalProof =
    submission.status ===
    "AUTHOR_PROOF_APPROVAL";

  const isReadyForPublication =
    submission.status ===
    "READY_FOR_PUBLICATION";

  const authorStatus = getAuthorFacingStatus(
    submission.status,
    submission.article,
  );

  const isPublished = isAuthorFacingPublished(
    authorStatus,
  );

  const isPendingIssn =
    authorStatus === "PENDING_ISSN";

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header>
        <Link
          href="/author/dashboard"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to author dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold">
              Submission Details
            </h1>

            <p className="mt-2 max-w-3xl text-gray-600">
              Track the editorial status,
              decisions, production progress,
              files and revision history for this
              manuscript.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canReviewFinalProof && (
              <Link
                href={`/author/submissions/${submission.id}/proof-approval`}
                className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
              >
                Review and Approve Final Proof
              </Link>
            )}

            {canSubmitRevision && (
              <Link
                href={`/author/submissions/${submission.id}/revision`}
                className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
              >
                Submit Revision
              </Link>
            )}
          </div>
        </div>
      </header>

      {canReviewFinalProof && (
        <section className="rounded-xl border border-indigo-300 bg-indigo-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                Author Action Required
              </p>

              <h2 className="mt-2 text-2xl font-bold text-indigo-950">
                Final Proof Awaiting Your
                Approval
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-800">
                The final publication proof has
                been prepared and approved by the
                editorial team. Please review it
                carefully and either approve it
                for publication or request final
                corrections.
              </p>
            </div>

            <Link
              href={`/author/submissions/${submission.id}/proof-approval`}
              className="rounded-lg bg-indigo-700 px-6 py-3 font-semibold text-white hover:bg-indigo-800"
            >
              Review Final Proof
            </Link>
          </div>
        </section>
      )}

      {submission.invoice && (
        <section
          className={`rounded-xl border p-6 shadow-sm ${
            submission.invoice.status === "PENDING" ||
            submission.invoice.status === "OVERDUE"
              ? "border-amber-300 bg-amber-50"
              : "bg-white"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Article Processing Charge
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {submission.invoice.currency}{" "}
                {submission.invoice.amount.toFixed(2)}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Invoice {submission.invoice.invoiceNumber}
                {(submission.invoice.status === "PENDING" ||
                  submission.invoice.status === "OVERDUE") &&
                  submission.invoice.dueAt && (
                    <> · Due {formatDate(submission.invoice.dueAt)}</>
                  )}
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${invoiceStatusBadgeClass(
                  submission.invoice.status,
                )}`}
              >
                {formatStatus(submission.invoice.status)}
              </span>

              <Link
                href={`/author/invoices/${submission.invoice.id}`}
                className="rounded-lg bg-black px-5 py-2.5 font-semibold text-white hover:bg-gray-800"
              >
                {submission.invoice.status === "PAID"
                  ? "View Receipt"
                  : submission.invoice.status === "WAIVED" ||
                    submission.invoice.status === "PARTIALLY_WAIVED"
                  ? "View Invoice"
                  : "Pay APC Now"}
              </Link>
            </div>
          </div>
        </section>
      )}

      {isReadyForPublication && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Final Proof Approved
          </p>

          <h2 className="mt-2 text-2xl font-bold text-emerald-950">
            Your manuscript is ready for
            publication
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-emerald-800">
            Your final proof has been approved.
            The editorial team will now assign
            the manuscript to a volume and issue
            before publication.
          </p>
        </section>
      )}

      {isPendingIssn && (
        <section className="rounded-xl border border-blue-300 bg-blue-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Under Review
          </p>

          <h2 className="mt-2 text-2xl font-bold text-blue-950">
            Your manuscript is finishing production
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-blue-800">
            Your manuscript has been assigned to an
            issue and is in the final production
            stage. It will show as Published here
            once an ISSN has been assigned to it.
          </p>
        </section>
      )}

      {isPublished && (
        <section className="rounded-xl border border-green-300 bg-green-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Published
          </p>

          <h2 className="mt-2 text-2xl font-bold text-green-950">
            Your article has been published
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-green-800">
            The manuscript has completed the
            editorial and production process and
            is now part of the journal’s published
            record.
          </p>
        </section>
      )}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">
            Manuscript Information
          </h2>

          <span
            className={`rounded-full px-4 py-2 text-sm font-semibold ${authorStatusBadgeClass(
              authorStatus,
            )}`}
          >
            {formatAuthorStatusLabel(
              authorStatus,
            )}
          </span>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
              {formatAuthorStatusLabel(
                authorStatus,
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Current review round
            </p>

            <p className="font-medium">
              Round{" "}
              {
                submission.currentReviewRound
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Current manuscript version
            </p>

            <p className="font-medium">
              Version{" "}
              {latestVersion?.versionNumber ??
                1}
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

          <div>
            <p className="text-sm text-gray-500">
              Manuscript type
            </p>

            <p className="font-medium">
              {submission.manuscriptType ||
                "Not specified"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Abstract
        </h2>

        <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-5 leading-7">
          {submission.abstract}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Editorial Decisions
        </h2>

        {submission.decisions.length ===
          0 ? (
          <p className="mt-4 text-gray-600">
            No editorial decision has been
            recorded yet.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {submission.decisions.map(
              (decision) => (
                <article
                  key={decision.id}
                  className="rounded-lg border p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {formatStatus(
                          decision.decision,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        By{" "}
                        {
                          decision.editor
                            .name
                        }{" "}
                        on{" "}
                        {formatDate(
                          decision.createdAt,
                        )}
                      </p>
                    </div>

                    {decision.revisionDeadline && (
                      <p className="text-sm font-medium">
                        Revision deadline:{" "}
                        {formatDate(
                          decision.revisionDeadline,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-6">
                    {decision.comments ||
                      "No comments were provided."}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Manuscript Versions
        </h2>

        <div className="mt-5 space-y-5">
          {submission.versions.map(
            (version) => (
              <article
                key={version.id}
                className="rounded-lg border p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      Version{" "}
                      {
                        version.versionNumber
                      }
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Uploaded{" "}
                      {formatDate(
                        version.createdAt,
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`/api/submission-versions/${version.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Download manuscript
                    </a>

                    {version.responseFileUrl && (
                      <a
                        href={`/api/submission-versions/${version.id}/download?file=response`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Download response
                      </a>
                    )}
                  </div>
                </div>

                {version.coverLetter && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold">
                      Cover letter
                    </p>

                    <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                      {
                        version.coverLetter
                      }
                    </div>
                  </div>
                )}

                {version.authorNotes && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold">
                      Author notes
                    </p>

                    <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm">
                      {
                        version.authorNotes
                      }
                    </div>
                  </div>
                )}
              </article>
            ),
          )}

          <article className="rounded-lg border p-5">
            <h3 className="font-semibold">
              Version 1 — Original
              Submission
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Submitted{" "}
              {formatDate(
                submission.submittedAt ??
                submission.createdAt,
              )}
            </p>

            {submission.files.length ===
              0 ? (
              <p className="mt-4 text-sm text-gray-600">
                No original submission files
                were found.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {submission.files.map(
                  (file) => (
                    <div
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">
                          {file.fileName}
                        </p>

                        <p className="break-words text-xs text-gray-500">
                          {file.label ||
                            file.fileType ||
                            "Submission file"}
                        </p>
                      </div>

                      <a
                        href={`/api/submission-files/${file.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  ),
                )}
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}