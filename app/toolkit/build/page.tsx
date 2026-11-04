import type { Metadata } from "next";

import { requireCurrentUser } from "@/lib/auth/current-user";

import BuildTopicForm from "./BuildTopicForm";

export const metadata: Metadata = {
    title: "Build a Topic from Your Variables — Research Topic Formulation Workbench",
};

export default async function BuildTopicPage() {
    // Free to try; only login is required.
    await requireCurrentUser();

    return (
        <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Research Resources
            </p>

            <h1 className="mt-3 text-3xl font-bold">
                Build a topic from your variables
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
                Tell us the variables you want to study. We&apos;ll draft
                three well-formulated topics,
                with each variable broken into the dimensions used in
                validated scales.
            </p>

            <BuildTopicForm />
        </main>
    );
}
