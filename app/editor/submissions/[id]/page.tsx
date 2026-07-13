import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import {
  rejectSubmission,
  requestRevision,
  sendToReview,
} from "./actions";

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

export default async function EditorSubmissionDetailsPage({
  params,
}: PageProps) {
  const editor = await requireAnyRole(EDITORIAL_ROLES);

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: {
      id,
    },
    include: {
      author: true,
      journal: true,
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

  const isTerminalStatus = [
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "WITHDRAWN",
  ].includes(submission.status);

  const canSendToReview =
    !isTerminalStatus &&
    submission.status !== "UNDER_PEER_REVIEW";

  const canRequestRevision =
    !isTerminalStatus &&
    submission.status !== "REVISION_REQUIRED";

  const canReject =
    submission.status !== "REJECTED" &&
    submission.status !== "PUBLISHED" &&
    submission.status !== "WITHDRAWN";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10">
        <Link
          href="/editor/dashboard"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to editor dashboard
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          Editor Review Workspace
        </h1>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">
          {submission.title}
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
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
              Email
            </p>
            <p className="font-medium">
              {submission.author.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Journal
            </p>
            <p className="font-medium">
              {submission.journal.name}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Manuscript Type
            </p>
            <p className="font-medium">
              {submission.manuscriptType || "Not specified"}
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
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          {canSendToReview && (
            <form action={sendToReview}>
              <input
                type="hidden"
                name="submissionId"
                value={submission.id}
              />

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Send to Peer Review
              </button>
            </form>
          )}

          {canRequestRevision && (
            <form action={requestRevision}>
              <input
                type="hidden"
                name="submissionId"
                value={submission.id}
              />

              <button
                type="submit"
                className="rounded-lg bg-yellow-500 px-6 py-3 font-semibold text-white hover:bg-yellow-600"
              >
                Request Revision
              </button>
            </form>
          )}

          {canReject && (
            <form action={rejectSubmission}>
              <input
                type="hidden"
                name="submissionId"
                value={submission.id}
              />

              <button
                type="submit"
                className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
              >
                Reject Manuscript
              </button>
            </form>
          )}

          {!isTerminalStatus && (
            <Link
              href={`/editor/submissions/${submission.id}/reviewers`}
              className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              Assign Reviewers
            </Link>
          )}

          <Link
            href={`/editor/submissions/${submission.id}/revisions`}
            className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
          >
            Revision History
          </Link>

          <Link
            href={`/editor/submissions/${submission.id}/review-rounds`}
            className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800"
          >
            Review-Round Summary
          </Link>

          <Link
            href={`/editor/submissions/${submission.id}/decisions`}
            className="rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800"
          >
            Editorial Decision
          </Link>

          <Link
            href={`/editor/submissions/${submission.id}/production`}
            className="rounded-lg bg-slate-800 px-5 py-3 font-semibold text-white hover:bg-slate-900"
          >
            Production Workflow
          </Link>

          {submission.status === "READY_FOR_PUBLICATION" && (
            <Link
              href={`/editor/submissions/${submission.id}/publication`}
              className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              Publish Article
            </Link>
          )}
        </div>

        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold">
            Abstract
          </h3>

          <div className="whitespace-pre-wrap rounded-lg border bg-slate-50 p-6">
            {submission.abstract}
          </div>
        </div>
      </div>
    </main>
  );
}