import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { assignEditor } from "./actions";

export default async function SubmissionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

        <div className="grid grid-cols-2 gap-8">

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
            <form action={assignEditor} className="mt-8">
              <input type="hidden" name="submissionId" value={submission.id} />

              <button
                type="submit"
                className="rounded-lg bg-green-700 px-5 py-3 text-white hover:bg-green-800"
              >
                Assign Editor / Start Initial Review
              </button>
            </form>

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

        <div className="mt-10">
          <h3 className="mb-3 text-lg font-semibold">
            Abstract
          </h3>

          <div className="rounded-lg border bg-slate-50 p-6 whitespace-pre-wrap">
            {submission.abstract}
          </div>
        </div>

      </div>
    </main>
  );
}