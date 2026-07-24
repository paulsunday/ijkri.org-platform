"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-950">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <section className="w-full max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-700">
              Critical Application Error
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              The application could not load
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
              A critical error prevented the journal platform from loading
              correctly. Please try again. If the problem continues, contact the
              platform administrator.
            </p>

            {process.env.NODE_ENV === "development" && (
              <div className="mt-8 rounded-lg bg-slate-100 p-4 text-left">
                <p className="mb-2 font-semibold text-slate-900">
                  Development Error
                </p>

                <pre className="overflow-auto whitespace-pre-wrap text-sm text-red-700">
                  {error.message}
                </pre>

                {error.digest && (
                  <p className="mt-3 text-xs text-slate-500">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Return Home
              </button>
            </div>

            <div className="mt-10 border-t pt-6">
              <p className="text-sm text-slate-500">
                International Journal of Knowledge, Research and Innovation
              </p>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
