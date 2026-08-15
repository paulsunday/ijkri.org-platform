import Link from "next/link";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    createResourceGuide,
    deleteResourceGuide,
    updateResourceGuide,
} from "./actions";

const MANAGER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
];

const CATEGORY_OPTIONS = [
    { value: "RESEARCH_METHODOLOGY", label: "Research Methodology" },
    { value: "DATA_ANALYSIS", label: "Data Analysis" },
    { value: "ACADEMIC_WRITING", label: "Academic Writing" },
    { value: "PUBLISHING", label: "Publishing" },
] as const;

const FORMAT_OPTIONS = [
    { value: "ARTICLE", label: "Article" },
    { value: "GUIDE", label: "Guide" },
    { value: "TEMPLATE", label: "Template" },
    { value: "VIDEO", label: "Video" },
] as const;

function categoryLabel(value: string) {
    return (
        CATEGORY_OPTIONS.find((option) => option.value === value)?.label ||
        value
    );
}

function formatLabel(value: string) {
    return (
        FORMAT_OPTIONS.find((option) => option.value === value)?.label ||
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

type ResourcesAdminPageProps = {
    searchParams: Promise<{
        journalId?: string;
    }>;
};

export default async function ResourcesAdminPage({
    searchParams,
}: ResourcesAdminPageProps) {
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

    const resources = selectedJournalId
        ? await prisma.resourceGuide.findMany({
            where: {
                journalId: selectedJournalId,
            },

            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" },
            ],
        })
        : [];

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Journal Administration
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Research Resources
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Manage the methodology, data analysis, academic writing,
                    and publishing guides shown in the public Research
                    Resources hub.
                </p>
            </header>

            {journals.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        No journal access found
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Your account does not currently have permission to
                        manage resources.
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
                                        Add Resource
                                    </p>

                                    <h2 className="mt-3 text-2xl font-bold text-amber-950">
                                        {selectedJournal.name}
                                    </h2>
                                </div>

                                <Link
                                    href="/resources"
                                    className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                                >
                                    View Public Page
                                </Link>
                            </div>

                            <form
                                action={createResourceGuide}
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
                                        placeholder="Designing a mixed-methods study"
                                    />

                                    <FormSelect
                                        label="Category"
                                        name="category"
                                        required
                                        options={CATEGORY_OPTIONS}
                                    />

                                    <FormSelect
                                        label="Format"
                                        name="format"
                                        options={FORMAT_OPTIONS}
                                        defaultValue="GUIDE"
                                    />

                                    <FormInput
                                        label="External URL (optional)"
                                        name="externalUrl"
                                        type="url"
                                        placeholder="https://..."
                                    />

                                    <FormInput
                                        label="Display order"
                                        name="sortOrder"
                                        type="number"
                                        defaultValue="0"
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
                                        htmlFor="summary"
                                        className="mb-2 block font-semibold"
                                    >
                                        Summary *
                                    </label>

                                    <textarea
                                        id="summary"
                                        name="summary"
                                        rows={2}
                                        required
                                        placeholder="One or two sentences shown on the resource card."
                                        className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="body"
                                        className="mb-2 block font-semibold"
                                    >
                                        Guide content (optional if an
                                        external URL is provided)
                                    </label>

                                    <textarea
                                        id="body"
                                        name="body"
                                        rows={8}
                                        placeholder="Full guide content, shown on its own page."
                                        className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                                >
                                    Add Resource
                                </button>
                            </form>
                        </section>
                    )}

                    <section>
                        <h2 className="text-2xl font-bold">
                            Current Resources
                        </h2>

                        {resources.length === 0 ? (
                            <div className="mt-8 rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                                <h3 className="text-xl font-bold">
                                    No resources yet
                                </h3>

                                <p className="mt-3 text-slate-600">
                                    Add the first resource guide using the
                                    form above.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-8 space-y-6">
                                {resources.map((resource) => (
                                    <article
                                        key={resource.id}
                                        className="rounded-2xl border bg-white p-6 shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-wider text-amber-700">
                                                    {categoryLabel(
                                                        resource.category,
                                                    )}{" "}
                                                    ·{" "}
                                                    {formatLabel(
                                                        resource.format,
                                                    )}
                                                </p>

                                                <h3 className="mt-2 text-2xl font-bold">
                                                    {resource.title}
                                                </h3>

                                                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                                                    {resource.summary}
                                                </p>
                                            </div>

                                            <div className="text-right text-sm">
                                                <span
                                                    className={
                                                        resource.isPublished
                                                            ? "rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800"
                                                            : "rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600"
                                                    }
                                                >
                                                    {resource.isPublished
                                                        ? "Published"
                                                        : "Draft"}
                                                </span>

                                                <p className="mt-2 text-slate-500">
                                                    Updated{" "}
                                                    {formatDate(
                                                        resource.updatedAt,
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <details className="mt-6 rounded-xl border">
                                            <summary className="cursor-pointer p-5 font-bold">
                                                Edit Resource
                                            </summary>

                                            <form
                                                action={updateResourceGuide}
                                                className="space-y-6 border-t p-5"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="resourceId"
                                                    value={resource.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="journalId"
                                                    value={
                                                        resource.journalId
                                                    }
                                                />

                                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                                    <FormInput
                                                        label="Title"
                                                        name="title"
                                                        required
                                                        defaultValue={
                                                            resource.title
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
                                                            resource.category
                                                        }
                                                    />

                                                    <FormSelect
                                                        label="Format"
                                                        name="format"
                                                        options={
                                                            FORMAT_OPTIONS
                                                        }
                                                        defaultValue={
                                                            resource.format
                                                        }
                                                    />

                                                    <FormInput
                                                        label="External URL"
                                                        name="externalUrl"
                                                        type="url"
                                                        defaultValue={
                                                            resource.externalUrl ||
                                                            ""
                                                        }
                                                    />

                                                    <FormInput
                                                        label="Display order"
                                                        name="sortOrder"
                                                        type="number"
                                                        defaultValue={String(
                                                            resource.sortOrder,
                                                        )}
                                                    />

                                                    <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            name="isPublished"
                                                            defaultChecked={
                                                                resource.isPublished
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300"
                                                        />
                                                        Published
                                                    </label>
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`summary-${resource.id}`}
                                                        className="mb-2 block font-semibold"
                                                    >
                                                        Summary
                                                    </label>

                                                    <textarea
                                                        id={`summary-${resource.id}`}
                                                        name="summary"
                                                        rows={2}
                                                        required
                                                        defaultValue={
                                                            resource.summary
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                                    />
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`body-${resource.id}`}
                                                        className="mb-2 block font-semibold"
                                                    >
                                                        Guide content
                                                    </label>

                                                    <textarea
                                                        id={`body-${resource.id}`}
                                                        name="body"
                                                        rows={8}
                                                        defaultValue={
                                                            resource.body ||
                                                            ""
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
                                            action={deleteResourceGuide}
                                            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5"
                                        >
                                            <input
                                                type="hidden"
                                                name="resourceId"
                                                value={resource.id}
                                            />

                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-bold text-red-950">
                                                        Remove Resource
                                                    </p>

                                                    <p className="mt-1 text-sm text-red-800">
                                                        This permanently
                                                        removes the resource
                                                        from the public hub.
                                                    </p>
                                                </div>

                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                                                >
                                                    Delete Resource
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
