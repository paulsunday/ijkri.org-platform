import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EditorDashboardPage() {
  const submissions = await prisma.submission.findMany({
    where: {
  status: "UNDER_INITIAL_REVIEW",
},
include: {
  author: true,
  journal: true,
},
orderBy: {
    updatedAt: "desc",
  },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-4xl font-bold">
        Editor Dashboard
      </h1>

      <p className="mt-3 text-slate-600">
        Manuscripts assigned to you for editorial review.
      </p>

      <div className="mt-10 rounded-xl border bg-white">

        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">
            Assigned Manuscripts
          </h2>
        </div>

        <div className="overflow-x-auto p-6">

          <table className="w-full">

            <thead>
              <tr className="border-b">

                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Author</th>
                <th className="p-3 text-left">Journal</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left"></th>

              </tr>
            </thead>

            <tbody>

              {submissions.map((submission) => (

                <tr
                  key={submission.id}
                  className="border-b"
                >

                  <td className="p-3">
                    {submission.title}
                  </td>

                  <td className="p-3">
                    {submission.author.name}
                  </td>

                  <td className="p-3">
                    {submission.journal.shortName}
                  </td>

                  <td className="p-3">
                    {submission.status}
                  </td>

                  <td className="p-3">

                    <Link
                      href={`/editor/submissions/${submission.id}`}
                      className="rounded bg-blue-600 px-4 py-2 text-white"
                    >
                      Open
                    </Link>

                  </td>

                </tr>

              ))}

              {submissions.length === 0 && (

                <tr>

                  <td
                    colSpan={5}
                    className="p-6 text-center text-slate-500"
                  >
                    No manuscripts assigned.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>
    </main>
  );
}