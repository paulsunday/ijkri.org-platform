import Link from "next/link";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    createInsight,
    deleteInsight,
    updateInsight,
} from "./actions";

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

                            <form
                                action={createInsight}
                                className="mt-8 space-y-6"
                            >
                                <input
                                    type="hidden"
                                    name="journalId"
                                    value={selectedJournal.id}
                                />

                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    <FormInput
                                        label="Title"
                                        name="title"
                                        required
                                        placeholder="Five tips for a stronger literature review"
                                    />

                                    <FormSelect
                                        label="Category"
                                        name="category"
                                        required
                                        options={CATEGORY_OPTIONS}
                                    />

                                    <FormInput
                                        label="Author name"
                                        name="authorName"
                                        placeholder="IJKRI Editorial Team"
                                    />

                                    <FormInput
                                        label="Cover image URL"
                                        name="coverImage"
                                        type="url"
                                        placeholder="https://..."
                                    />

                                    <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                                        <input
                                            type="checkbox"
                                            name="isPublished"
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                        Publish immediately
                                    </label>
                                </div>

                                <div>
                                    <label
                                        htmlFor="excerpt"
                                        className="mb-2 block font-semibold"
                                    >
                                        Excerpt *
                                    </label>

                                    <textarea
                                        id="excerpt"
                                        name="excerpt"
                                        rows={2}
                                        required
                                        placeholder="One or two sentences shown on the insight card."
                                        className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="body"
                                        className="mb-2 block font-semibold"
                                    >
                                        Body *
                                    </label>

                                    <textarea
                                        id="body"
                                        name="body"
                                        rows={14}
                                        required
                                        placeholder="Full article content."
                                        className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                                >
                                    Add Insight
                                </button>
                            </form>
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

                                            <form
                                                action={updateInsight}
                                                className="space-y-6 border-t p-5"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="insightId"
                                                    value={insight.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="journalId"
                                                    value={
                                                        insight.journalId
                                                    }
                                                />

                                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                                    <FormInput
                                                        label="Title"
                                                        name="title"
                                                        required
                                                        defaultValue={
                                                            insight.title
                                                        }
                                                    />

                                                    <FormSelect
                                                        label="Category"
                                                        name="category"
                                                        required
                                                        options={
                                                            CATEGORY_OPTIONS
                                                        }
                                                        defaultValue={
                                                            insight.category
                                                        }
                                                    />

                                                    <FormInput
                                                        label="Author name"
                                                        name="authorName"
                                                        defaultValue={
                                                            insight.authorName ||
                                                            ""
                                                        }
                                                    />

                                                    <FormInput
                                                        label="Cover image URL"
                                                        name="coverImage"
                                                        type="url"
                                                        defaultValue={
                                                            insight.coverImage ||
                                                            ""
                                                        }
                                                    />

                                                    <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            name="isPublished"
                                                            defaultChecked={
                                                                insight.isPublished
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300"
                                                        />
                                                        Published
                                                    </label>
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`excerpt-${insight.id}`}
                                                        className="mb-2 block font-semibold"
                                                    >
                                                        Excerpt
                                                    </label>

                                                    <textarea
                                                        id={`excerpt-${insight.id}`}
                                                        name="excerpt"
                                                        rows={2}
                                                        required
                                                        defaultValue={
                                                            insight.excerpt
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                                    />
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`body-${insight.id}`}
                                                        className="mb-2 block font-semibold"
                                                    >
                                                        Body
                                                    </label>

                                                    <textarea
                                                        id={`body-${insight.id}`}
                                                        name="body"
                                                        rows={14}
                                                        required
                                                        defaultValue={
                                                            insight.body
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                                >
                                                    Save Changes
                                                </button>
                                            </form>
                                        </details>

                                        <form
                                            action={deleteInsight}
                                            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5"
                                        >
                                            <input
                                                type="hidden"
                                                name="insightId"
                                                value={insight.id}
                                            />

                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-bold text-red-950">
                                                        Remove Insight
                                                    </p>

                                                    <p className="mt-1 text-sm text-red-800">
                                                        This permanently
                                                        removes the insight
                                                        from the public
                                                        section.
                                                    </p>
                                                </div>

                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                                                >
                                                    Delete Insight
                                                </button>
                                            </div>
                                        </form>
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

type FormInputProps = {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    defaultValue?: string;
};

function FormInput({
    label,
    name,
    type = "text",
    required = false,
    placeholder,
    defaultValue,
}: FormInputProps) {
    return (
        <div>
            <label
                htmlFor={`${name}-${defaultValue || "new"}`}
                className="mb-2 block font-semibold"
            >
                {label}
                {required ? " *" : ""}
            </label>

            <input
                id={`${name}-${defaultValue || "new"}`}
                name={name}
                type={type}
                required={required}
                placeholder={placeholder}
                defaultValue={defaultValue}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
        </div>
    );
}

type FormSelectProps = {
    label: string;
    name: string;
    options: ReadonlyArray<{ value: string; label: string }>;
    required?: boolean;
    defaultValue?: string;
};

function FormSelect({
    label,
    name,
    options,
    required = false,
    defaultValue = "",
}: FormSelectProps) {
    return (
        <div>
            <label
                htmlFor={`${name}-${defaultValue || "new"}`}
                className="mb-2 block font-semibold"
            >
                {label}
                {required ? " *" : ""}
            </label>

            <select
                id={`${name}-${defaultValue || "new"}`}
                name={name}
                required={required}
                defaultValue={defaultValue}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
