"use client";

import { useEffect } from "react";

import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application Error:", error);
    }, [error]);

    return (
        <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6 py-16">
            <section className="w-full max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm sm:p-12">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-700">
                    Application Error
                </p>

                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                    Something went wrong
                </h1>

                <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
                    An unexpected error occurred while processing your request.
                    Please try again. If the problem persists, contact the journal
                    administrator.
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
                        onClick={() => reset()}
                        className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
                    >
                        Try Again
                    </button>

                    <Link
                        href="/"
                        className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                        Return Home
                    </Link>

                    <Link
                        href="/current-issue"
                        className="rounded-lg border border-amber-600 px-6 py-3 font-semibold text-amber-800 transition hover:bg-amber-50"
                    >
                        Current Issue
                    </Link>
                </div>
            </section>
        </main>
    );
}