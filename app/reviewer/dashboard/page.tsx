import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ReviewerDashboardPage() {
  const reviewerEmail = "reviewer1@ijari.org";

  const reviewer = await prisma.user.findUnique({
    where: { email: reviewerEmail },
  });

  const assignments = reviewer
    ? await prisma.reviewAssignment.findMany({
        where: { reviewerId: reviewer.id },
        include: {
          submission: {
            include: {
              journal: true,
              author: true,
            },
          },
        },
        orderBy: { invitedAt: "desc" },
      })
    : [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-4xl font-bold">Reviewer Dashboard</h1>

      <p className="mt-4 text-slate-600">
        Manuscripts assigned to you for peer review.
      </p>

      <div className="mt-10 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">My Review Invitations</h2>

        <div className="mt-6 space-y-4">
          {assignments.length === 0 && (
            <p className="text-slate-500">No review assignments yet.</p>
          )}

          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-lg border bg-slate-50 p-5"
            >
              <h3 className="text-xl font-semibold">
                {assignment.submission.title}
              </h3>

              <p className="mt-2">
                <strong>Journal:</strong>{" "}
                {assignment.submission.journal.shortName}
              </p>

              <p>
                <strong>Status:</strong> {assignment.status}
              </p>

              <p>
                <strong>Invited:</strong>{" "}
                {assignment.invitedAt.toLocaleString()}
              </p>

              <Link
                href={`/reviewer/reviews/${assignment.id}`}
                className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Open Review
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}