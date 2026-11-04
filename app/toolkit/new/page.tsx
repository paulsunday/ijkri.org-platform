import type { Metadata } from "next";

import { requireCurrentUser } from "@/lib/auth/current-user";

import NewTopicForm from "./NewTopicForm";

export const metadata: Metadata = {
    title: "Start New Topic — Research Topic Formulation Workbench",
};

export default async function NewTopicPage() {
    // Free to try; only login is required.
    await requireCurrentUser();

    return (
        <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Research Resources
            </p>

            <h1 className="mt-3 text-3xl font-bold">
                Check your research topic
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
                Type your working topic/title exactly as you have it. The
                checker will flag a missing independent/dependent
                variable, unmeasurable constructs, mismatched sub-variables, and vague
                phrasing.
            </p>

            <NewTopicForm />
        </main>
    );
}
