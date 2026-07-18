"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
    passwordReset?: boolean;
    accountActivated?: boolean;
    registered?: boolean;
    callbackUrl?: string;
};

export default function LoginForm({
    passwordReset = false,
    accountActivated = false,
    registered = false,
    callbackUrl = "/post-login",
}: LoginFormProps) {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl,
            });

            if (!result || result.error) {
                setError("Invalid email or password.");
                return;
            }

            const destination =
                result.url || callbackUrl;

            router.replace(destination);
            router.refresh();
        } catch (signInError) {
            console.error("Login failed:", signInError);

            setError(
                "Unable to sign in at the moment. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="mx-auto flex min-h-[75vh] max-w-lg items-center px-6 py-16">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Account Access
                </p>

                <h1 className="mt-3 text-3xl font-bold text-slate-950">
                    Sign in
                </h1>

                <p className="mt-4 leading-7 text-slate-600">
                    Sign in to your IJKRI account to manage manuscripts,
                    reviews, editorial work and production assignments.
                </p>

                {passwordReset && (
                    <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                        Your password has been reset successfully. You can
                        now sign in with your new password.
                    </div>
                )}

                {accountActivated && (
                    <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                        Your account has been activated successfully. You
                        can now sign in.
                    </div>
                )}

                {registered && (
                    <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                        Your account has been created successfully. Sign in
                        to continue.
                    </div>
                )}

                {error && (
                    <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-5"
                >
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block font-semibold text-slate-900"
                        >
                            Email address
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="name@example.com"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-4">
                            <label
                                htmlFor="password"
                                className="font-semibold text-slate-900"
                            >
                                Password
                            </label>

                            <Link
                                href="/forgot-password"
                                className="text-sm font-semibold text-amber-700 hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <div className="mt-7 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
                    Do not have an account?{" "}
                    <Link
                        href="/register"
                        className="font-bold text-amber-700 hover:underline"
                    >
                        Register
                    </Link>
                </div>
            </div>
        </section>
    );
}
