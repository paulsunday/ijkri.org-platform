import Link from "next/link";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    CreateEventForm,
    DeleteEventForm,
    UpdateEventForm,
} from "./EventForms";

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

            include: {
                _count: {
                    select: { registrations: true },
                },
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

                            <CreateEventForm
                                journalId={selectedJournal.id}
                            />
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

                                                <p className="mt-3 text-sm font-semibold text-slate-800">
                                                    {event._count.registrations}{" "}
                                                    {event._count.registrations === 1
                                                        ? "person registered"
                                                        : "people registered"}
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

                                            <UpdateEventForm event={event} />
                                        </details>

                                        <DeleteEventForm eventId={event.id} />
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

