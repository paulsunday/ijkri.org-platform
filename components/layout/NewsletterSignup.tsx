"use client";

import { useActionState } from "react";

import {
    subscribeToNewsletter,
    type NewsletterActionState,
} from "@/lib/newsletter/actions";

const INITIAL_STATE: NewsletterActionState = {
    success: false,
    message: "",
};

type NewsletterSignupProps = {
    variant?: "inline" | "footer";
};

export default function NewsletterSignup({
    variant = "inline",
}: NewsletterSignupProps) {
    const [state, formAction, pending] = useActionState(
        subscribeToNewsletter,
        INITIAL_STATE,
    );

    const isFooter = variant === "footer";

    return (
        <div>
            <form
                action={formAction}
                className="flex flex-col gap-3 sm:flex-row"
            >
                <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@university.edu"
                    className={
                        isFooter
                            ? "w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
                            : "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    }
                />

                <button
                    type="submit"
                    disabled={pending}
                    className="shrink-0 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
                >
                    {pending ? "Subscribing…" : "Subscribe"}
                </button>
            </form>

            {state.message && (
                <p
                    role="status"
                    className={
                        state.success
                            ? "mt-2 text-sm font-medium text-green-600"
                            : "mt-2 text-sm font-medium text-red-600"
                    }
                >
                    {state.message}
                </p>
            )}

            <p
                className={
                    isFooter
                        ? "mt-2 text-xs text-slate-400"
                        : "mt-2 text-xs text-slate-500"
                }
            >
                By subscribing you agree to receive occasional research and
                publishing emails. Unsubscribe anytime.
            </p>
        </div>
    );
}
