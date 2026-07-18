import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

export default async function AdminPage() {
  await requireAnyRole(ADMIN_ROLES);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Publisher Dashboard
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-950">
          Innovare Academic Publishing
        </h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          Manage journals, editorial boards, users, volumes, issues,
          submissions, reviews, DOI records, and publishing workflows from one
          place.
        </p>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-4">
        {[
          ["1", "Journals"],
          ["0", "Submissions"],
          ["0", "Published Articles"],
          ["0", "Review Assignments"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-3xl font-bold text-slate-950">{value}</p>
            <p className="mt-2 text-sm text-slate-600">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <Link
          href="/admin/journals"
          className="rounded-xl border bg-white p-6 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-xl font-bold">Manage Journals</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Create and manage journals under Innovare Academic Publishing.
          </p>
        </Link>

        <Link
          href="/admin/submissions"
          className="rounded-xl border bg-white p-6 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-xl font-bold">Submissions</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Review incoming manuscripts and monitor editorial workflow.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-xl border bg-white p-6 shadow-sm hover:bg-slate-50"
        >
          <h2 className="text-xl font-bold">Users & Roles</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Manage authors, reviewers, editors, administrators, and access
            permissions.
          </p>
        </Link>
      </section>
    </main>
  );
}
