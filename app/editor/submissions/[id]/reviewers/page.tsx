import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { assignReviewer } from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AssignReviewersPage({ params }: Props) {
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      author: true,
      journal: true,
      reviewAssignments: {
        include: {
          reviewer: true,
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const reviewers = await prisma.user.findMany({
  where: {
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
        },
      },
    },
  },

  orderBy: {
    name: "asc",
  },
});

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-4xl font-bold">Assign Reviewers</h1>

      <p className="mt-4 text-slate-600">
        Select reviewers for this manuscript.
      </p>

      <section className="mt-10 rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">{submission.title}</h2>

        <div className="mt-6 space-y-2">
          <p>
            <strong>Author:</strong> {submission.author.name}
          </p>
          <p>
            <strong>Journal:</strong> {submission.journal.shortName}
          </p>
          <p>
            <strong>Status:</strong> {submission.status}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">Assigned Reviewers</h2>

        <div className="mt-6 space-y-4">
          {submission.reviewAssignments.length === 0 && (
            <p className="text-slate-500">No reviewers assigned yet.</p>
          )}

          {submission.reviewAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-lg border bg-slate-50 p-4"
            >
              <p className="font-semibold">{assignment.reviewer.name}</p>
              <p className="text-sm text-slate-600">
                {assignment.reviewer.email}
              </p>
              <p className="mt-2 text-sm">
                Status: <strong>{assignment.status}</strong>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">Available Reviewers</h2>

        <div className="mt-6 space-y-4">
          {reviewers.length === 0 && (
            <p className="text-slate-500">
              No reviewers found for this journal yet.
            </p>
          )}

          {reviewers.map((reviewer) => (
            <div
              key={reviewer.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-semibold">{reviewer.name}</p>
                <p className="text-sm text-slate-600">{reviewer.email}</p>
                <p className="text-sm text-slate-600">
                  {reviewer.affiliation || "No affiliation provided"}
                </p>
              </div>

              <form action={assignReviewer}>
                <input type="hidden" name="submissionId" value={submission.id} />
                <input type="hidden" name="reviewerId" value={reviewer.id} />

                <button className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700">
                  Assign
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}