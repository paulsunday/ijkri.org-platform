import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6 py-16">
            <section className="w-full max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm sm:p-12">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-700">
                    Access Restricted
                </p>

                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                    You are not authorized to view this page
                </h1>

                <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
                    Your account does not have permission to access the requested area.
                    Sign in with an authorized account or return to the appropriate
                    dashboard.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <Link
                        href="/login"
                        className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
                    >
                        Sign In
                    </Link>

                    <Link
                        href="/post-login"
                        className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                        Go to My Dashboard
                    </Link>

                    <Link
                        href="/"
                        className="rounded-lg border border-amber-600 px-6 py-3 font-semibold text-amber-800 transition hover:bg-amber-50"
                    >
                        Return to Homepage
                    </Link>
                </div>

                <div className="mt-10 border-t pt-6">
                    <p className="text-sm text-slate-500">
                        Contact the journal administrator if you believe your account
                        should have access.
                    </p>
                </div>
            </section>
        </main>
    );
}