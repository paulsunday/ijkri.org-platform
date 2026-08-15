import Link from "next/link";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    createEvent,
    deleteEvent,
    updateEvent,
} from "./actions";

const MANAGER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
];

const EVENT_TYPE_OPTIONS = [
    { value: "SEMINAR", label: "Seminar" },
    { value: "WEBINAR", label: "Webinar" },
    { value: "WORKSHOP", label: "Workshop" },
    { value: "CONFERENCE", label: "Conference" },
    { value: "EDITORIAL_SESSION", label: "Editorial Session" },
] as const;

const EVENT_STATUS_OPTIONS = [
    { value: "UPCOMING", label: "Upcoming" },
    { value: "ONGOING", label: "Ongoing" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
] as const;

function typeLabel(value: string) {
    return (
        EVENT_TYPE_OPTIONS.find((option) => option.value === value)
            ?.label || value
    );
}

function statusLabel(value: string) {
    return (
        EVENT_STATUS_OPTIONS.find((option) => option.value === value)
            ?.label || value
    );
}

function formatDateTime(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

function toDateTimeLocal(value: Date | null) {
    if (!value) return "";

    const pad = (n: number) => String(n).padStart(2, "0");

    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
        value.getDate(),
    )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

type EventsAdminPageProps = {
    searchParams: Promise<{
        journalId?: string;
    }>;
};

export default async function EventsAdminPage({
    searchParams,
}: EventsAdminPageProps) {
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

    const events = selectedJournalId
        ? await prisma.event.findMany({
            where: {
                journalId: selectedJournalId,
            },

            orderBy: {
                startsAt: "desc",
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
                    Academic Events
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Manage seminars, webinars, workshops, and editorial
                    sessions shown on the public Events page.
                </p>
            </header>

            {journals.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        No journal access found
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Your account does not currently have permission to
                        manage events.
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
                                        Add Event
                                    </p>

                                    <h2 className="mt-3 text-2xl font-bold text-amber-950">
                                        {selectedJournal.name}
                                    </h2>
                                </div>

                                <Link
                                    href="/events"
                                    className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                                >
                                    View Public Page
                                </Link>
                            </div>

                            <form
                                action={createEvent}
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
                                        placeholder="Writing for Impact: An Editorial Webinar"
                                    />

                                    <FormSelect
                                        label="Event type"
                                        name="eventType"
                                        options={EVENT_TYPE_OPTIONS}
                                        defaultValue="WEBINAR"
                                    />

                                    <FormSelect
                                        label="Status"
                                        name="status"
                                        options={EVENT_STATUS_OPTIONS}
                                        defaultValue="UPCOMING"
                                    />

                                    <FormInput
                                        label="Starts at"
                                        name="startsAt"
                                        type="datetime-local"
                                        required
                                    />

                                    <FormInput
                                        label="Ends at (optional)"
                                        name="endsAt"
                                        type="datetime-local"
                                    />

                                    <FormInput
                                        label="Speaker name"
                                        name="speakerName"
                                        placeholder="Prof. Jane Doe"
                                    />

                                    <FormInput
                                        label="Speaker title"
                                        name="speakerTitle"
                                        placeholder="Editor-in-Chief"
                                    />

                                    <FormInput
                                        label="Registration URL"
                                        name="registrationUrl"
                                        type="url"
                                        placeholder="https://..."
                                    />

                                    <FormInput
                                        label="Recording URL"
                                        name="recordingUrl"
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
                                        htmlFor="description"
                                        className="mb-2 block font-semibold"
                                    >
                                        Description *
                                    </label>

                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={6}
                                        required
                                        placeholder="What this event covers, and who should attend."
                                        className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                                >
                                    Add Event
                                </button>
                            </form>
                        </section>
                    )}

                    <section>
                        <h2 className="text-2xl font-bold">
                            Current Events
                        </h2>

                        {events.length === 0 ? (
                            <div className="mt-8 rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                                <h3 className="text-xl font-bold">
                                    No events yet
                                </h3>

                                <p className="mt-3 text-slate-600">
                                    Add the first event using the form
                                    above.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-8 space-y-6">
                                {events.map((event) => (
                                    <article
                                        key={event.id}
                                        className="rounded-2xl border bg-white p-6 shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-wider text-amber-700">
                                                    {typeLabel(
                                                        event.eventType,
                                                    )}{" "}
                                                    ·{" "}
                                                    {statusLabel(
                                                        event.status,
                                                    )}
                                                </p>

                                                <h3 className="mt-2 text-2xl font-bold">
                                                    {event.title}
                                                </h3>

                                                <p className="mt-2 text-sm font-semibold text-slate-600">
                                                    {formatDateTime(
                                                        event.startsAt,
                                                    )}
                                                </p>

                                                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                                                    {event.description}
                                                </p>
                                            </div>

                                            <span
                                                className={
                                                    event.isPublished
                                                        ? "rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800"
                                                        : "rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600"
                                                }
                                            >
                                                {event.isPublished
                                                    ? "Published"
                                                    : "Draft"}
                                            </span>
                                        </div>

                                        <details className="mt-6 rounded-xl border">
                                            <summary className="cursor-pointer p-5 font-bold">
                                                Edit Event
                                            </summary>

                                            <form
                                                action={updateEvent}
                                                className="space-y-6 border-t p-5"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="eventId"
                                                    value={event.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="journalId"
                                                    value={
                                                        event.journalId
                                                    }
                                                />

                                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                                    <FormInput
                                                        label="Title"
                                                        name="title"
                                                        required
                                                        defaultValue={
                                                            event.title
                                                        }
                                                    />

                                                    <FormSelect
                                                        label="Event type"
                                                        name="eventType"
                                                        options={
                                                            EVENT_TYPE_OPTIONS
                                                        }
                                                        defaultValue={
                                                            event.eventType
                                                        }
                                                    />

                                                    <FormSelect
                                                        label="Status"
                                                        name="status"
                                                        options={
                                                            EVENT_STATUS_OPTIONS
                                                        }
                                                        defaultValue={
                                                            event.status
                                                        }
                                                    />

                                                    <FormInput
                                                        label="Starts at"
                                                        name="startsAt"
                                                        type="datetime-local"
                                                        required
                                                        defaultValue={toDateTimeLocal(
                                                            event.startsAt,
                                                        )}
                                                    />

                                                    <FormInput
                                                        label="Ends at"
                                                        name="endsAt"
                                                        type="datetime-local"
                                                        defaultValue={toDateTimeLocal(
                                                            event.endsAt,
                                                        )}
                                                    />

                                                    <FormInput
                                                        label="Speaker name"
                                                        name="speakerName"
                                                        defaultValue={
                                                            event.speakerName ||
                                                            ""
                                                        }
                                                    />

                                                    <FormInput
                                                        label="Speaker title"
                                                        name="speakerTitle"
                                                        defaultValue={
                                                            event.speakerTitle ||
                                                            ""
                                                        }
                                                    />

                                                    <FormInput
                                                        label="Registration URL"
                                                        name="registrationUrl"
                                                        type="url"
                                                        defaultValue={
                                                            event.registrationUrl ||
                                                            ""
                                                        }
                                                    />

                                                    <FormInput
                                                        label="Recording URL"
                                                        name="recordingUrl"
                                                        type="url"
                                                        defaultValue={
                                                            event.recordingUrl ||
                                                            ""
                                                        }
                                                    />

                                                    <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            name="isPublished"
                                                            defaultChecked={
                                                                event.isPublished
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300"
                                                        />
                                                        Published
                                                    </label>
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor={`description-${event.id}`}
                                                        className="mb-2 block font-semibold"
                                                    >
                                                        Description
                                                    </label>

                                                    <textarea
                                                        id={`description-${event.id}`}
                                                        name="description"
                                                        rows={6}
                                                        required
                                                        defaultValue={
                                                            event.description
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
                                            action={deleteEvent}
                                            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5"
                                        >
                                            <input
                                                type="hidden"
                                                name="eventId"
                                                value={event.id}
                                            />

                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-bold text-red-950">
                                                        Remove Event
                                                    </p>

                                                    <p className="mt-1 text-sm text-red-800">
                                                        This permanently
                                                        removes the event
                                                        from the public
                                                        page.
                                                    </p>
                                                </div>

                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                                                >
                                                    Delete Event
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
