import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6 py-16">
      <section className="w-full max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-700">
          Error 404
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Page not found
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
          The page you requested does not exist, may have been moved, or is no
          longer available.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Return to Homepage
          </Link>

          <Link
            href="/current-issue"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            View Current Issue
          </Link>

          <Link
            href="/archives"
            className="rounded-lg border border-amber-600 px-6 py-3 font-semibold text-amber-800 transition hover:bg-amber-50"
          >
            Browse Archives
          </Link>
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-sm text-slate-500">
            International Journal of Knowledge, Research and Innovation
          </p>
        </div>
      </section>
    </main>
  );
}
