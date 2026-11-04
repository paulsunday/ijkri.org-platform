import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";

import { checkFormulation } from "./actions";

export const metadata: Metadata = {
    title: "Start New Topic — Research Topic Formulation Workbench",
};

const DEGREE_LEVEL_OPTIONS = [
    { value: "ND", label: "ND" },
    { value: "HND", label: "HND" },
    { value: "BSC", label: "BSc" },
    { value: "PGD", label: "PGD" },
    { value: "MSC", label: "MSc" },
    { value: "MPHIL", label: "MPhil" },
    { value: "PHD", label: "PhD" },
] as const;

export default async function NewTopicPage() {
    const user = await requireCurrentUser();

    const journal = await prisma.journal.findFirst({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: "asc",
        },
        select: {
            id: true,
        },
    });

    if (!journal) {
        redirect("/toolkit");
    }

    const access = await hasToolkitAccess({
        userId: user.id,
        journalId: journal.id,
    });

    if (!access) {
        redirect("/toolkit");
    }

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
                variable, unmeasurable constructs, scope that&apos;s too broad
                for your degree level, mismatched sub-variables, and vague
                phrasing.
            </p>

            <form action={checkFormulation} className="mt-8 space-y-6">
                <div>
                    <label
                        htmlFor="topicText"
                        className="mb-2 block font-semibold"
                    >
                        Working topic/title *
                    </label>

                    <textarea
                        id="topicText"
                        name="topicText"
                        required
                        minLength={15}
                        rows={4}
                        placeholder='e.g. "Effect of green human resource management practices on employee retention among commercial banks in Enugu State"'
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="degreeLevel"
                            className="mb-2 block font-semibold"
                        >
                            Degree level *
                        </label>

                        <select
                            id="degreeLevel"
                            name="degreeLevel"
                            required
                            defaultValue=""
                            className="w-full rounded-lg border border-slate-300 px-4 py-3"
                        >
                            <option value="" disabled>
                                Select degree level
                            </option>

                            {DEGREE_LEVEL_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="discipline"
                            className="mb-2 block font-semibold"
                        >
                            Discipline (optional)
                        </label>

                        <input
                            id="discipline"
                            name="discipline"
                            type="text"
                            placeholder="e.g. Human Resource Management"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
                >
                    Run Formulation Checker
                </button>
            </form>
        </main>
    );
}
