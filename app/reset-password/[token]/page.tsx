import Link from "next/link";

import { resetPassword } from "./actions";

type ResetPasswordPageProps = {
    params: Promise<{
        token: string;
    }>;

    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function ResetPasswordPage({
    params,
    searchParams,
}: ResetPasswordPageProps) {
    const { token } = await params;
    const { error } = await searchParams;

    return (
        <main className="bg-slate-50">
            <section className="mx-auto flex min-h-[70vh] max-w-lg items-center px-6 py-10 sm:py-16">
                <div className="w-full rounded-2xl border bg-white p-8 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                        Secure password reset
                    </p>

                    <h1 className="mt-3 text-3xl font-bold">
                        Create a new password
                    </h1>

                    <p className="mt-4 leading-7 text-slate-600">
                        Choose a strong password that you have not
                        used previously.
                    </p>

                    {error && (
                        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    <form
                        action={resetPassword}
                        className="mt-8 space-y-5"
                    >
                        <input
                            type="hidden"
                            name="token"
                            value={token}
                        />

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block font-semibold"
                            >
                                New password
                            </label>

                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-2 block font-semibold"
                            >
                                Confirm new password
                            </label>

                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                            />
                        </div>

                        <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                            Use at least eight characters, one uppercase
                            letter, one lowercase letter and one number.
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                        >
                            Reset Password
                        </button>
                    </form>

                    <Link
                        href="/login"
                        className="mt-7 inline-flex text-sm font-semibold text-amber-700 hover:underline"
                    >
                        ← Return to login
                    </Link>
                </div>
            </section>
        </main>
    );
}