import Link from "next/link";
import { notFound } from "next/navigation";

import { isSuperAdmin, requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { COUNTRIES } from "@/lib/constants/countries";
import { prisma } from "@/lib/prisma";

import {
  AddSubmissionAuthorForm,
  AssignEditorForm,
} from "./SubmissionForms";

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

function agreementStatusBadgeClass(status: string) {
  switch (status) {
    case "SIGNED":
      return "bg-green-100 text-green-800";

    case "PARTIALLY_SIGNED":
      return "bg-yellow-100 text-yellow-800";

    case "SENT":
      return "bg-blue-100 text-blue-800";

    case "DECLINED":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-200 text-gray-700";
  }
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatLicenseType(value: string) {
  return value === "CC_BY_4" ? "CC BY 4.0" : "Copyright Transfer";
}

export default async function SubmissionDetailsPage({
  params,
}: PageProps) {
  const admin = await requireAnyRole(ADMIN_ROLES);

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: {
      id,
    },
    include: {
      author: true,
      journal: true,

      submissionAuthors: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      invoice: true,

      agreement: {
        include: {
          signatures: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const isTerminalStatus = [
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ].includes(submission.status);

  const canAssignEditor = ![
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ].includes(submission.status);

  const canManageReviewers = !isTerminalStatus;

  const canOpenProduction = [
    "ACCEPTED",
    "COPYEDITING",
    "TYPESETTING",
    "PROOFREADING",
    "AUTHOR_PROOF_APPROVAL",
    "READY_FOR_PUBLICATION",
  ].includes(submission.status);

  const canPublish =
    submission.status === "READY_FOR_PUBLICATION";

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header>
        <Link
          href="/admin/submissions"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to submissions
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          Submission Details
        </h1>

        <p className="mt-3 text-slate-600">
          Review and manage the complete editorial workflow for this
          manuscript.
        </p>
      </header>

      <section className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Manuscript Title
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {submission.title}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Author
            </p>

            <p className="mt-1">
              {submission.author.name}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500">
              Email
            </p>

            <p className="mt-1 break-all">
              {submission.author.email}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500">
              Journal
            </p>

            <p className="mt-1">
              {submission.journal.name}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500">
              Manuscript Type
            </p>

            <p className="mt-1">
              {submission.manuscriptType || "Not specified"}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500">
              Status
            </p>

            <span className="mt-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              {formatStatus(submission.status)}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500">
              Submitted
            </p>

            <p className="mt-1">
              {submission.submittedAt
                ? submission.submittedAt.toLocaleString()
                : "Not submitted"}
            </p>
          </div>
        </div>
      </section>

      {submission.invoice && (
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Article Processing Charge
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {submission.invoice.currency}{" "}
                {submission.invoice.amount.toFixed(2)}
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Invoice {submission.invoice.invoiceNumber}
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
                href="/admin/invoices"
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Manage Invoice
              </Link>
            </div>
          </div>
        </section>
      )}

      {submission.agreement && (
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Publication Agreement
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {formatLicenseType(submission.agreement.licenseType)}
              </h2>
            </div>

            <div className="flex flex-col items-end gap-3">
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${agreementStatusBadgeClass(
                  submission.agreement.status,
                )}`}
              >
                {formatStatus(submission.agreement.status)}
              </span>

              {submission.agreement.status === "SIGNED" && (
                <Link
                  href={`/api/agreements/${submission.id}/download`}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Download Signed PDF
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {submission.agreement.signatures.map((signature) => (
              <div
                key={signature.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-semibold">{signature.signerName}</p>

                  <p className="text-sm text-slate-500">
                    {signature.signerEmail || "No email on file — cannot be reached"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    signature.signedAt
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {signature.signedAt
                    ? `Signed ${signature.signedAt.toLocaleDateString()}`
                    : "Awaiting signature"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-2xl font-bold text-blue-950">
              Editorial Workflow
            </h2>

            <p className="mt-2 max-w-3xl text-blue-900">
              Use these controls to assign reviewers, read reviews,
              record editorial decisions, manage revisions, complete
              production, and publish the manuscript.
            </p>
          </div>

          <Link
            href={`/editor/submissions/${submission.id}`}
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Open Full Editorial Workspace
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canManageReviewers && (
            <Link
              href={`/editor/submissions/${submission.id}/reviewers`}
              className="rounded-xl border border-green-300 bg-white p-5 transition hover:border-green-600 hover:shadow-md"
            >
              <h3 className="font-bold text-green-800">
                Assign Reviewers
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Invite reviewers, set deadlines, and monitor reviewer
                responses.
              </p>
            </Link>
          )}

          <Link
            href={`/editor/submissions/${submission.id}/review-rounds`}
            className="rounded-xl border border-cyan-300 bg-white p-5 transition hover:border-cyan-600 hover:shadow-md"
          >
            <h3 className="font-bold text-cyan-800">
              Review Rounds
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              View reviewer assignments, recommendations, and completed
              review rounds.
            </p>
          </Link>

          <Link
            href={`/editor/submissions/${submission.id}/decisions`}
            className="rounded-xl border border-orange-300 bg-white p-5 transition hover:border-orange-600 hover:shadow-md"
          >
            <h3 className="font-bold text-orange-800">
              Editorial Decision
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Accept, request revision, reject, or begin another review
              round.
            </p>
          </Link>

          <Link
            href={`/editor/submissions/${submission.id}/revisions`}
            className="rounded-xl border border-purple-300 bg-white p-5 transition hover:border-purple-600 hover:shadow-md"
          >
            <h3 className="font-bold text-purple-800">
              Revision Workflow
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              View revised manuscripts, response letters, and revision
              history.
            </p>
          </Link>

          <Link
            href={`/editor/submissions/${submission.id}/production`}
            className={`rounded-xl border bg-white p-5 transition hover:shadow-md ${canOpenProduction
              ? "border-slate-400 hover:border-slate-700"
              : "border-slate-200 opacity-70"
              }`}
          >
            <h3 className="font-bold text-slate-800">
              Production Workflow
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Manage copyediting, typesetting, proofreading, and proof
              approval.
            </p>

            {!canOpenProduction && (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                Normally available after acceptance.
              </p>
            )}
          </Link>

          {canPublish ? (
            <Link
              href={`/editor/submissions/${submission.id}/publication`}
              className="rounded-xl border border-emerald-400 bg-white p-5 transition hover:border-emerald-700 hover:shadow-md"
            >
              <h3 className="font-bold text-emerald-800">
                Publish Article
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Assign the volume and issue, enter DOI information, and
                publish.
              </p>
            </Link>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-70">
              <h3 className="font-bold text-slate-700">
                Publication
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                This becomes available when the manuscript reaches Ready
                for Publication.
              </p>
            </div>
          )}
        </div>
      </section>

      {canAssignEditor && (
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold">
            Initial Editorial Assignment
          </h2>

          <p className="mt-2 text-slate-600">
            Start the editorial assessment for this submission.
          </p>

          <AssignEditorForm submissionId={submission.id} />
        </section>
      )}

      {!canAssignEditor && (
        <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-900">
          The initial editor-assignment action is unavailable because this
          submission is already{" "}
          <strong>
            {formatStatus(submission.status).toLowerCase()}
          </strong>
          .
        </section>
      )}

      <section className="rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold">
          Manuscript Authors
        </h2>

        <p className="mt-2 text-slate-600">
          Everyone credited on this manuscript, in listing order.
        </p>

        <div className="mt-6 space-y-3">
          {submission.submissionAuthors.length > 0 ? (
            submission.submissionAuthors.map((author) => (
              <div
                key={author.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold">
                    {author.fullName}
                    {author.isCorresponding && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        Corresponding
                      </span>
                    )}
                  </p>

                  <p className="text-sm text-slate-600">
                    {[author.email, author.affiliation, author.country]
                      .filter(Boolean)
                      .join(" · ") || "No further details provided"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="font-semibold">
                {submission.author.name}
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                  Corresponding
                </span>
              </p>

              <p className="text-sm text-slate-600">
                {submission.author.email}
              </p>
            </div>
          )}
        </div>

        {isSuperAdmin(admin) && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-bold">
              Add an Author
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Adds a co-author at the corresponding author&apos;s request.
              The new author is added alongside the existing
              corresponding author, who is not changed.
            </p>

            <AddSubmissionAuthorForm
              submissionId={submission.id}
              countries={COUNTRIES}
            />
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold">
          Abstract
        </h2>

        <div className="mt-4 whitespace-pre-wrap rounded-lg border bg-slate-50 p-6 text-slate-700">
          {submission.abstract}
        </div>
      </section>
    </main>
  );
}