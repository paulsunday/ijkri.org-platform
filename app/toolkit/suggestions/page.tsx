import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";
import { findStudiedLocations } from "@/lib/research-toolkit/gap-finder";

import { SuggestionsForm } from "./SuggestionsForm";

export const metadata: Metadata = {
    title: "Topic Suggestions — Research Topic Formulation Workbench",
};

type SuggestionsPageProps = {
    searchParams: Promise<{
        gapIv?: string;
        gapDv?: string;
        gapSector?: string;
    }>;
};

export default async function SuggestionsPage({
    searchParams,
}: SuggestionsPageProps) {
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

    const { gapIv, gapDv, gapSector } = await searchParams;

    const gapQuery = gapIv?.trim() || "";

    const gapResult = gapQuery
        ? await findStudiedLocations({
            journalId: journal.id,
            independentVariableNames: [gapQuery],
            dependentVariableNames: gapDv?.trim()
                ? [gapDv.trim()]
                : [],
            sector: gapSector?.trim() || "",
        })
        : null;

    return (
        <main className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Research Resources
            </p>

            <h1 className="mt-3 text-3xl font-bold">Topic Suggestions</h1>

            <section className="mt-10">
                <h2 className="text-xl font-bold">Gap Finder</h2>

                <p className="mt-2 text-sm text-slate-600">
                    See which locations a variable/sector combination has
                    already been checked or reserved for on this
                    platform. This grows from real student activity, so
                    it starts thin — no match recorded isn&apos;t proof of a
                    gap, only that nobody has logged it here yet.
                </p>

                <form method="get" className="mt-4 grid gap-4 sm:grid-cols-3">
                    <input
                        type="text"
                        name="gapIv"
                        defaultValue={gapIv}
                        placeholder="Independent variable (e.g. green HRM)"
                        className="rounded-lg border border-slate-300 px-4 py-3 sm:col-span-1"
                    />

                    <input
                        type="text"
                        name="gapDv"
                        defaultValue={gapDv}
                        placeholder="Dependent variable (optional)"
                        className="rounded-lg border border-slate-300 px-4 py-3"
                    />

                    <input
                        type="text"
                        name="gapSector"
                        defaultValue={gapSector}
                        placeholder="Sector (e.g. banking)"
                        className="rounded-lg border border-slate-300 px-4 py-3"
                    />

                    <button
                        type="submit"
                        className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:col-span-3 sm:w-fit"
                    >
                        Search
                    </button>
                </form>

                {gapResult ? (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        {gapResult.studiedLocations.length === 0 ? (
                            <p className="text-sm text-slate-600">
                                No location recorded yet for this
                                combination on this platform.
                            </p>
                        ) : (
                            <ul className="space-y-1 text-sm text-slate-700">
                                {gapResult.studiedLocations.map((loc) => (
                                    <li key={loc.locationKey}>
                                        {loc.locationKey} — checked/reserved{" "}
                                        {loc.count}{" "}
                                        {loc.count === 1 ? "time" : "times"}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : null}
            </section>

            <section className="mt-12">
                <h2 className="text-xl font-bold">AI Topic Suggestions</h2>

                <p className="mt-2 text-sm text-slate-600">
                    Describe your area of interest and (optionally) your
                    supervisor&apos;s specialization to get a few specific,
                    researchable topic ideas.
                </p>

                <div className="mt-4">
                    <SuggestionsForm />
                </div>
            </section>
        </main>
    );
}
