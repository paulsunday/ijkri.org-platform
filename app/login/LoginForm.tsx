"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
    passwordReset?: boolean;
    accountActivated?: boolean;
    registered?: boolean;
    activationRequired?: boolean;
    callbackUrl?: string;
};

function EyeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5"
        >
            <path d="M2.062 12.348a1 1 0 0 1 0-.696C3.423 7.51 7.36 5 12 5c4.638 0 8.573 2.507 9.938 6.644a1 1 0 0 1 0 .712C20.577 16.49 16.64 19 12 19c-4.638 0-8.573-2.507-9.938-6.652" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5"
        >
            <path d="m2 2 20 20" />
            <path d="M6.71 6.71C4.78 7.9 3.33 9.63 2.62 11.65a1 1 0 0 0 0 .7C4 16.28 7.73 19 12 19c1.5 0 2.91-.34 4.17-.94" />
            <path d="M10.73 5.08C11.15 5.03 11.57 5 12 5c4.64 0 8.58 2.51 9.94 6.65a1 1 0 0 1 0 .7 11.1 11.1 0 0 1-1.33 2.6" />
            <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
        </svg>
    );
}

export default function LoginForm({
    passwordReset = false,
    accountActivated = false,
    registered = false,
    activationRequired = false,
    callbackUrl = "/post-login",
}: LoginFormProps) {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] =
        useState(false);
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
                email: email.trim().toLowerCase(),
                password,
                redirect: false,
                callbackUrl,
            });

            if (!result || result.error) {
                setError(
                    "The email or password is incorrect, or the account is unavailable.",
                );
                return;
            }

            const destination =
                result.url || callbackUrl;

            router.replace(destination);
            router.refresh();
        } catch (signInError) {
            console.error(
                "Login failed:",
                signInError,
            );

            setError(
                "Unable to sign in at the moment. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="mx-auto flex min-h-[70vh] max-w-lg items-center px-6 py-10 sm:py-16">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Account Access
                </p>

                <h1 className="mt-3 text-3xl font-bold text-slate-950">
                    Sign in
                </h1>

                <p className="mt-4 leading-7 text-slate-600">
                    Sign in to your IJKRI account to manage
                    manuscripts, reviews, editorial work and
                    production assignments.
                </p>

                {passwordReset && (
                    <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                        Your password has been reset successfully.
                        You can now sign in with your new password.
                    </div>
                )}

                {accountActivated && (
                    <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                        Your account has been activated
                        successfully. You can now sign in.
                    </div>
                )}

                {registered && activationRequired && (
                    <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                        Your account has been created successfully. Please
                        check your email and activate your account before
                        signing in.
                    </div>
                )}

                {registered && !activationRequired && (
                    <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                        Your account has been created successfully. Sign in
                        to continue.
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
                    >
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

                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                required
                                minLength={8}
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        (current) =>
                                            !current,
                                    )
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                aria-pressed={
                                    showPassword
                                }
                                title={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400"
                            >
                                {showPassword ? (
                                    <EyeOffIcon />
                                ) : (
                                    <EyeIcon />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading
                            ? "Signing in..."
                            : "Sign in"}
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