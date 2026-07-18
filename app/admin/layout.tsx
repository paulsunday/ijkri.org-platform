import Link from "next/link";

const adminLinks = [
  ["Dashboard", "/admin"],
  ["Journals", "/admin/journals"],
  ["Editorial Board", "/admin/editorial-board"],
  ["Submissions", "/admin/submissions"],
  ["Users & Roles", "/admin/users"],
  ["Volumes", "/admin/volumes"],
  ["Issues", "/admin/issues"],
  ["Articles", "/admin/articles"],
  ["Reviews", "/admin/reviews"],
  ["Reviewer Applications", "/admin/reviewer-applications"],
  ["Career Applications", "/admin/career-applications"],
  ["DOI Records", "/admin/doi-records"],
  ["Settings", "/admin/settings"],
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <aside className="hidden w-64 shrink-0 rounded-xl border bg-white p-5 shadow-sm lg:block">
          <h2 className="text-lg font-bold text-slate-950">
            Publisher Admin
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Innovare Academic Publishing
          </p>

          <nav className="mt-6 space-y-1">
            {adminLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 rounded-xl border bg-white shadow-sm">
          {children}
        </div>
      </div>
    </section>
  );
}
