import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { assignEditor } from "./actions";

export default async function SubmissionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const administrator =
    await requireAnyRole(ADMIN_ROLES);

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

  const administratorJournalRole =
    await prisma.userJournalRole.findFirst({
      where: {
        userId: administrator.id,
        journalId: submission.journalId,
        role: {
          in: ADMIN_ROLES,
        },
      },
      select: {
        id: true,
      },
    });

  if (!administratorJournalRole) {
    notFound();
  }

  const assignmentBlocked =
    submission.status === "ACCEPTED" ||
    submission.status === "REJECTED" ||
    submission.status === "PUBLISHED" ||
    submission.status === "WITHDRAWN";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-10 text-4xl font-bold">
        Submission Details
      </h1>

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">
            Manuscript Title
          </h2>

          <p className="text-2xl font-semibold">
            {submission.title}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-500">
              Author
            </h3>

            <p>{submission.author.name}</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-500">
              Email
            </h3>

            <p>{submission.author.email}</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-500">
              Journal
            </h3>

            <p>{submission.journal.name}</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-500">
              Manuscript Type
            </h3>

            <p>{submission.manuscriptType}</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-500">
              Status
            </h3>

            <p>{submission.status}</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-500">
              Submitted
            </h3>

            <p>
              {submission.submittedAt
                ? submission.submittedAt.toLocaleString()
                : "—"}
            </p>
          </div>
        </div>

        {!assignmentBlocked && (
          <form action={assignEditor} className="mt-8">
            <input
              type="hidden"
              name="submissionId"
              value={submission.id}
            />

            <button
              type="submit"
              className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
            >
              Assign Editor / Start Initial Review
            </button>
          </form>
        )}

        {assignmentBlocked && (
          <div className="mt-8 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            An editor cannot be assigned because this submission is
            already {submission.status.replaceAll("_", " ").toLowerCase()}.
          </div>
        )}

        <div className="mt-10">
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