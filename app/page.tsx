import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-4 text-sm">
          International Journal of Advanced Research and Innovation
        </div>
      </section>

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-950">IJARI</h1>
            <p className="text-sm text-slate-600">
              International Journal of Advanced Research and Innovation
            </p>
          </div>

          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/current-issue">Current Issue</Link>
            <Link href="/archives">Archives</Link>
            <Link href="/author-guidelines">Author Guidelines</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </header>

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Peer-reviewed academic publishing platform
            </p>

            <h2 className="mb-6 text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              Advancing knowledge through quality research and innovation.
            </h2>

            <p className="mb-8 text-lg leading-8 text-slate-700">
              IJARI is a scholarly publishing platform designed to support
              author submissions, peer review, editorial decisions, and final
              publication of high-quality academic research.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/submit"
                className="rounded-md bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
              >
                Submit Manuscript
              </Link>

              <Link
                href="/current-issue"
                className="rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900"
              >
                View Current Issue
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <h3 className="mb-4 text-xl font-bold">Journal Information</h3>

            <div className="space-y-4 text-sm text-slate-700">
              <p>
                <strong>Journal:</strong> International Journal of Advanced
                Research and Innovation
              </p>
              <p>
                <strong>Short Name:</strong> IJARI
              </p>
              <p>
                <strong>Review Model:</strong> Double-blind peer review
              </p>
              <p>
                <strong>Publishing Model:</strong> Open access
              </p>
              <p>
                <strong>Scope:</strong> Multidisciplinary research, innovation,
                management, science, technology, and applied studies.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            ["0", "Published Articles"],
            ["0", "Current Issues"],
            ["0", "Registered Authors"],
            ["0", "Active Reviewers"],
          ].map(([number, label]) => (
            <div key={label} className="rounded-xl border bg-white p-6">
              <p className="text-3xl font-bold text-slate-950">{number}</p>
              <p className="mt-2 text-sm text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-bold">For Authors</h3>
            <p className="text-sm leading-7 text-slate-700">
              Submit manuscripts, track review progress, upload revisions, and
              receive editorial decisions through the author dashboard.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-bold">For Reviewers</h3>
            <p className="text-sm leading-7 text-slate-700">
              Accept review invitations, evaluate manuscripts, submit
              recommendations, and manage review history.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-bold">For Editors</h3>
            <p className="text-sm leading-7 text-slate-700">
              Manage submissions, assign reviewers, make editorial decisions,
              and publish articles into volumes and issues.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm">
          © 2026 International Journal of Advanced Research and Innovation. All
          rights reserved.
        </div>
      </footer>
    </main>
  );
}