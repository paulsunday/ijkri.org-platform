import Link from "next/link";
import type { Metadata } from "next";

import CurrencyChoice from "@/components/payments/CurrencyChoice";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";

import { initializeToolkitAccess } from "./purchase-actions";

export const metadata: Metadata = {
    title: "Research Topic Formulation Workbench",
    description:
        "Check, formulate, and reserve your research topic — formulation checker, objective generator, topic suggestions, and topic reservation.",
};

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);
}

const RESERVATION_STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Reserved",
    RELEASED: "Released",
    CONVERTED: "Converted",
};

export default async function ToolkitPage() {
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
            toolkitPrice: true,
            currency: true,
            ngnExchangeRate: true,
        },
    });

    if (!journal) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-20 text-center">
                <h1 className="text-2xl font-bold">
                    Not currently available
                </h1>

                <p className="mt-3 text-slate-600">
                    The Research Topic Formulation Workbench is not
                    currently available.
                </p>
            </main>
        );
    }

    const access = await hasToolkitAccess({
        userId: user.id,
        journalId: journal.id,
    });

    if (!access) {
        return (
            <main className="bg-white">
                <section className="relative overflow-hidden bg-slate-950 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

                    <div className="relative mx-auto max-w-3xl px-6 py-20 text-center lg:px-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
                            Research Resources
                        </p>

                        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                            Research Topic Formulation Workbench
                        </h1>

                        <p className="mt-6 text-lg leading-8 text-slate-300">
                            Check your topic for missing variables,
                            unmeasurable constructs, and scope problems;
                            auto-generate your objectives, research
                            questions, and hypotheses; find unstudied
                            variable/sector/location combinations; and
                            reserve your topic with a timestamped first
                            claim.
                        </p>

                        <form action={initializeToolkitAccess} className="mt-10 max-w-xl">
                            <CurrencyChoice
                                baseAmount={journal.toolkitPrice}
                                baseCurrency={journal.currency}
                                ngnExchangeRate={journal.ngnExchangeRate}
                                tone="dark"
                            />

                            <button
                                type="submit"
                                className="rounded-lg bg-amber-500 px-8 py-4 text-lg font-bold text-slate-950 hover:bg-amber-400"
                            >
                                {journal.ngnExchangeRate
                                    ? "Unlock the workbench"
                                    : `Unlock for ${journal.currency} ${journal.toolkitPrice.toFixed(2)}`}
                            </button>
                        </form>

                        <p className="mt-4 text-sm text-slate-400">
                            One-time payment. Unlocks the formulation
                            checker, objective generator, topic
                            suggestions, and topic reservation.
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    const topics = await prisma.researchTopic.findMany({
        where: {
            userId: user.id,
            journalId: journal.id,
        },
        include: {
            reservation: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <main className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                        Research Resources
                    </p>

                    <h1 className="mt-3 text-3xl font-bold">
                        Topic Formulation Workbench
                    </h1>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/toolkit/build"
                        className="rounded-lg border border-amber-400 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                        Build From My Variables
                    </Link>

                    <Link
                        href="/toolkit/suggestions"
                        className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-950"
                    >
                        Topic Suggestions
                    </Link>

                    <Link
                        href="/toolkit/new"
                        className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        Check My Topic
                    </Link>
                </div>
            </header>

            {topics.length === 0 ? (
                <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-16 text-center">
                    <h2 className="text-xl font-bold text-slate-950">
                        No topics yet
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Have a topic already? Check it. Only know your
                        variables? Build a topic from them.
                    </p>
                </div>
            ) : (
                <div className="mt-10 space-y-4">
                    {topics.map((topic) => (
                        <Link
                            key={topic.id}
                            href={`/toolkit/${topic.id}`}
                            className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">
                                        {topic.degreeLevel}
                                        {topic.discipline
                                            ? ` · ${topic.discipline}`
                                            : ""}
                                    </p>

                                    <h2 className="mt-1 text-lg font-bold text-slate-950">
                                        {topic.rawTopicText}
                                    </h2>
                                </div>

                                {topic.reservation ? (
                                    <span
                                        className={
                                            topic.reservation.status ===
                                            "ACTIVE"
                                                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase text-green-800"
                                                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600"
                                        }
                                    >
                                        {
                                            RESERVATION_STATUS_LABEL[
                                                topic.reservation.status
                                            ]
                                        }
                                    </span>
                                ) : null}
                            </div>

                            <p className="mt-3 text-sm text-slate-500">
                                Started {formatDate(topic.createdAt)}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
