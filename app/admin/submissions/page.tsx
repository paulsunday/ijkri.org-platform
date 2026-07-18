import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

export default async function AdminSubmissionsPage() {
  await requireAnyRole(ADMIN_ROLES);

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: true,
      journal: true,
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-4xl font-bold">Submissions</h1>

      <p className="mt-4 text-slate-600">
        Manage manuscript submissions and editorial workflow.
      </p>

      <div className="mt-10 rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">Submitted Manuscripts</h2>
        </div>

        <div className="overflow-x-auto p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Title</th>
                <th className="p-3">Author</th>
                <th className="p-3">Journal</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{submission.title}</td>
                  <td className="p-3">{submission.author.name}</td>
                  <td className="p-3">{submission.journal.shortName}</td>
                  <td className="p-3">{submission.manuscriptType || "—"}</td>
                  <td className="p-3">{submission.status}</td>
                  <td className="p-3">
                    {submission.submittedAt
                      ? submission.submittedAt.toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/submissions/${submission.id}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {submissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No submissions yet.
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
