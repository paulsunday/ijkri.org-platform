import Link from "next/link";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    CreateInsightForm,
    DeleteInsightForm,
    UpdateInsightForm,
} from "./InsightForms";

const MANAGER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
];

const CATEGORY_OPTIONS = [
    { value: "RESEARCH_METHODS", label: "Research Methods" },
    { value: "ACADEMIC_WRITING", label: "Academic Writing" },
    { value: "STATISTICS", label: "Statistics" },
    { value: "PUBLISHING", label: "Publishing" },
    { value: "RESEARCH_ETHICS", label: "Research Ethics" },
    { value: "INNOVATION", label: "Innovation" },
    { value: "MANAGEMENT", label: "Management" },
    { value: "BUSINESS", label: "Business" },
    { value: "TECHNOLOGY", label: "Technology" },
] as const;

function categoryLabel(value: string) {
    return (
        CATEGORY_OPTIONS.find((option) => option.value === value)?.label ||
        value
    );
}

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);
}

type InsightsAdminPageProps = {
    searchParams: Promise<{
        journalId?: string;
    }>;
};

export default async function InsightsAdminPage({
    searchParams,
}: InsightsAdminPageProps) {
    const manager = await requireAnyRole(MANAGER_ROLES);

    const { journalId } = await searchParams;

    const managerJournalIds = manager.roles
        .filter((assignment) =>
            MANAGER_ROLES.includes(assignment.role),
        )
        .map((assignment) => assignment.journalId);

    const journals = await prisma.journal.findMany({
        where: {
            id: {
                in: managerJournalIds,
            },
        },

        select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
        },

        orderBy: {
            name: "asc",
        },
    });

    const selectedJournalId =
        journalId &&
            journals.some((journal) => journal.id === journalId)
            ? journalId
            : journals[0]?.id || null;

    const selectedJournal =
        journals.find(
            (journal) => journal.id === selectedJournalId,
        ) || null;

    const insights = selectedJournalId
        ? await prisma.insight.findMany({
            where: {
                journalId: selectedJournalId,
            },

            orderBy: {
                createdAt: "desc",
            },
        })
        : [];

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Journal Administration
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Research Insights
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Manage short-form editorial content — not peer-reviewed
                    research — shown in the public Research Insights
                    section.
                </p>
            </header>

            {journals.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        No journal access found
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Your account does not currently have permission to
                        manage insights.
                    </p>
                </section>
            ) : (
                <>
                    {journals.length > 1 && (
                        <form
                            method="get"
                            className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5"
                        >
                            <div className="min-w-64">
                                <label
                                    htmlFor="journalId"
                                    className="mb-1.5 block text-sm font-semibold"
                                >
                                    Journal
                                </label>

                                <select
                                    id="journalId"
                                    name="journalId"
                                    defaultValue={selectedJournalId || ""}
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                >
                                    {journals.map((journal) => (
                                        <option
                                            key={journal.id}
                                            value={journal.id}
                                        >
                                            {journal.shortName ||
                                                journal.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                            >
                                Switch journal
                            </button>
                        </form>
                    )}

                    {selectedJournal && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                                        Add Insight
                                    </p>

                                    <h2 className="mt-3 text-2xl font-bold text-amber-950">
                                        {selectedJournal.name}
                                    </h2>
                                </div>

                                <Link
                                    href="/insights"
                                    className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                                >
                                    View Public Page
                                </Link>
                            </div>

                            <CreateInsightForm
                                journalId={selectedJournal.id}
                            />
                        </section>
                    )}

                    <section>
                        <h2 className="text-2xl font-bold">
                            Current Insights
                        </h2>

                        {insights.length === 0 ? (
                            <div className="mt-8 rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                                <h3 className="text-xl font-bold">
                                    No insights yet
                                </h3>

                                <p className="mt-3 text-slate-600">
                                    Add the first insight using the form
                                    above.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-8 space-y-6">
                                {insights.map((insight) => (
                                    <article
                                        key={insight.id}
                                        className="rounded-2xl border bg-white p-6 shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-wider text-amber-700">
                                                    {categoryLabel(
                                                        insight.category,
                                                    )}
                                                </p>

                                                <h3 className="mt-2 text-2xl font-bold">
                                                    {insight.title}
                                                </h3>

                                                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                                                    {insight.excerpt}
                                                </p>
                                            </div>

                                            <div className="text-right text-sm">
                                                <span
                                                    className={
                                                        insight.isPublished
                                                            ? "rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800"
                                                            : "rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600"
                                                    }
                                                >
                                                    {insight.isPublished
                                                        ? "Published"
                                                        : "Draft"}
                                                </span>

                                                <p className="mt-2 text-slate-500">
                                                    Updated{" "}
                                                    {formatDate(
                                                        insight.updatedAt,
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <details className="mt-6 rounded-xl border">
                                            <summary className="cursor-pointer p-5 font-bold">
                                                Edit Insight
                                            </summary>

                                            <UpdateInsightForm
                                                insight={insight}
                                            />
                                        </details>

                                        <DeleteInsightForm
                                            insightId={insight.id}
                                        />
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}

