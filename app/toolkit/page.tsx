import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth/current-user";
import { autoReconcilePaystackPayments } from "@/lib/payments/auto-reconcile";
import { hasToolkitAccess } from "@/lib/payments/toolkit-access";
import { prisma } from "@/lib/prisma";

import ToolkitLanding from "./ToolkitLanding";
import UnlockCard from "./UnlockCard";

export const metadata: Metadata = {
    title: "Free Research Topic Checker & Objectives Generator",
    description:
        "Check your project topic free, build a topic from your variables, and generate specific objectives, research questions and hypotheses with validated scales. For BSc, MSc and PhD students.",
    keywords: [
        "research topic checker",
        "project topic generator",
        "specific objectives generator",
        "research questions and hypotheses",
        "validated scales",
        "project topics for final year students",
        "Nigeria",
    ],
    alternates: { canonical: "/toolkit" },
    openGraph: {
        title: "Free Research Topic Checker & Objectives Generator | IJKRI",
        description:
            "Will your project topic pass? Check it free, then get your specific objectives, research questions and hypotheses.",
        url: "/toolkit",
        type: "website",
    },
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

type ToolkitPageProps = {
    searchParams: Promise<{ payment?: string; message?: string }>;
};

const PAYMENT_BANNER: Record<string, { style: string; fallback: string }> = {
    success: {
        style: "border-green-200 bg-green-50 text-green-900",
        fallback: "Payment received — the full workbench is unlocked.",
    },
    pending: {
        style: "border-amber-200 bg-amber-50 text-amber-900",
        fallback: "Your payment is still being processed.",
    },
    failed: {
        style: "border-red-200 bg-red-50 text-red-800",
        fallback: "Your payment could not be completed.",
    },
    error: {
        style: "border-red-200 bg-red-50 text-red-800",
        fallback: "We couldn't start the payment. Please try again.",
    },
};

export default async function ToolkitPage({ searchParams }: ToolkitPageProps) {
    const { payment, message } = await searchParams;
    let banner = payment ? PAYMENT_BANNER[payment] : undefined;

    const user = await getCurrentUser();

    // Logged-out visitors (and search engines) get the public landing page.
    if (!user) {
        const variableGuides = await prisma.variableGuide.findMany({
            where: { isPublished: true },
            select: { slug: true, name: true },
            orderBy: { publishedAt: "desc" },
            take: 24,
        });

        return <ToolkitLanding variableGuides={variableGuides} />;
    }

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

    let access = await hasToolkitAccess({
        userId: user.id,
        journalId: journal.id,
    });

    /*
     * Self-heal: a student who paid but whose payment wasn't recorded
     * (closed tab, failed return step, missed webhook) is unlocked as soon
     * as they open this page.
     */
    let autoUnlocked = false;

    if (!access) {
        const { completed } = await autoReconcilePaystackPayments({
            where: { userId: user.id, purpose: "RESEARCH_TOOLKIT" },
            sinceDays: 30,
            limit: 3,
        });

        if (completed.length > 0) {
            access = await hasToolkitAccess({
                userId: user.id,
                journalId: journal.id,
            });
            autoUnlocked = access;
        }
    }

    if (autoUnlocked) {
        banner = PAYMENT_BANNER.success;
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
                        {access ? "Topic Suggestions" : "🔒 Topic Suggestions"}
                    </Link>

                    <Link
                        href="/toolkit/new"
                        className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        Check My Topic
                    </Link>
                </div>
            </header>

            {banner ? (
                <div
                    role="status"
                    className={`mt-6 rounded-lg border p-4 text-sm ${banner.style}`}
                >
                    {message?.slice(0, 300) || banner.fallback}
                </div>
            ) : null}

            {!access ? (
                <div className="mt-8 space-y-6">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
                        <h2 className="text-lg font-bold">
                            Try it free
                        </h2>

                        <p className="mt-1 text-sm leading-6">
                            Check your topic or build one from your
                            variables, and preview your objectives plan —
                            no payment needed. Unlock the full plan, topic
                            suggestions and topic reservation whenever
                            you&apos;re ready.
                        </p>
                    </div>

                    <UnlockCard pricing={journal} />
                </div>
            ) : null}

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
