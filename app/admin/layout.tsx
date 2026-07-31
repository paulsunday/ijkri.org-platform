import { AdminNav } from "./admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <AdminNav />

        <div className="min-w-0 flex-1 rounded-xl border bg-white shadow-sm">
          {children}
        </div>
      </div>
    </section>
  );
}
