export default function AdminJournalsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Journal Management
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950">
            Journals
          </h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            Manage all journals published by Innovare Academic Publishing.
          </p>
        </div>

        <button className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          Add Journal
        </button>
      </div>

      <section className="mt-10 rounded-xl border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-bold">Registered Journals</h2>
        </div>

        <div className="p-6">
          <div className="rounded-lg border p-5">
            <h3 className="text-lg font-bold">
              International Journal of Advanced Research and Innovation
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Short name: IJARI · Status: Active · Publisher: Innovare Academic
              Publishing
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}