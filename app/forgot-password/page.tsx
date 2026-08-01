import Link from "next/link";

import { requestPasswordReset } from "./actions";

type ForgotPasswordPageProps = {
    searchParams: Promise<{
        error?: string;
        submitted?: string;
    }>;
};

export default async function ForgotPasswordPage({
    searchParams,
}: ForgotPasswordPageProps) {
    const { error, submitted } =
        await searchParams;

    return (
        <main className="bg-slate-50">
            <section className="mx-auto flex min-h-[70vh] max-w-lg items-center px-6 py-10 sm:py-16">
                <div className="w-full rounded-2xl border bg-white p-8 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                        Account recovery
                    </p>

                    <h1 className="mt-3 text-3xl font-bold">
                        Forgot your password?
                    </h1>

                    <p className="mt-4 leading-7 text-slate-600">
                        Enter the email address connected to your
                        IJKRI account. A password-reset link will be
                        generated if the account exists.
                    </p>

                    {error && (
                        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    {submitted && (
                        <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm leading-6 text-green-800">
                            If an active account exists for that email,
                            password-reset instructions have been
                            generated. Please check your inbox and spam folder
                        </div>
                    )}

                    <form
                        action={requestPasswordReset}
                        className="mt-8 space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block font-semibold"
                            >
                                Email address
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                placeholder="name@example.com"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                        >
                            Generate Reset Link
                        </button>
                    </form>

                    <div className="mt-7 flex flex-wrap justify-between gap-4 text-sm">
                        <Link
                            href="/login"
                            className="font-semibold text-amber-700 hover:underline"
                        >
                            ← Return to login
                        </Link>

                        <Link
                            href="/register"
                            className="font-semibold text-slate-700 hover:underline"
                        >
                            Create an account
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

