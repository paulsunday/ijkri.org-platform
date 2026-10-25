"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";

import { createEvent, deleteEvent, updateEvent } from "./actions";

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

function ActionBanner({ state }: { state: FormActionState }) {
    if (!state.message) return null;

    return (
        <div
            role={state.success ? "status" : "alert"}
            className={`rounded-lg p-3 text-sm ${
                state.success
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
            }`}
        >
            {state.message}
        </div>
    );
}

type FormInputProps = {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    defaultValue?: string;
    disabled?: boolean;
};

function FormInput({
    label,
    name,
    type = "text",
    required = false,
    placeholder,
    defaultValue,
    disabled = false,
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
                disabled={disabled}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
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
    disabled?: boolean;
};

function FormSelect({
    label,
    name,
    options,
    required = false,
    defaultValue = "",
    disabled = false,
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
                disabled={disabled}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
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

export function CreateEventForm({ journalId }: { journalId: string }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        createEvent,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    return (
        <form action={formAction} className="mt-8 space-y-6">
            <input type="hidden" name="journalId" value={journalId} />

            <ActionBanner state={state} />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormInput
                    label="Title"
                    name="title"
                    required
                    placeholder="Writing for Impact: An Editorial Webinar"
                    disabled={pending}
                />

                <FormSelect
                    label="Event type"
                    name="eventType"
                    options={EVENT_TYPE_OPTIONS}
                    defaultValue="WEBINAR"
                    disabled={pending}
                />

                <FormSelect
                    label="Status"
                    name="status"
                    options={EVENT_STATUS_OPTIONS}
                    defaultValue="UPCOMING"
                    disabled={pending}
                />

                <FormInput
                    label="Starts at"
                    name="startsAt"
                    type="datetime-local"
                    required
                    disabled={pending}
                />

                <FormInput
                    label="Ends at (optional)"
                    name="endsAt"
                    type="datetime-local"
                    disabled={pending}
                />

                <FormInput
                    label="Speaker name"
                    name="speakerName"
                    placeholder="Prof. Jane Doe"
                    disabled={pending}
                />

                <FormInput
                    label="Speaker title"
                    name="speakerTitle"
                    placeholder="Editor-in-Chief"
                    disabled={pending}
                />

                <FormInput
                    label="Registration URL"
                    name="registrationUrl"
                    type="url"
                    placeholder="https://..."
                    disabled={pending}
                />

                <FormInput
                    label="Recording URL"
                    name="recordingUrl"
                    type="url"
                    placeholder="https://..."
                    disabled={pending}
                />

                <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                    <input
                        type="checkbox"
                        name="isPublished"
                        disabled={pending}
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
                    disabled={pending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
                {pending ? "Adding…" : "Add Event"}
            </button>
        </form>
    );
}

type EventForEdit = {
    id: string;
    journalId: string;
    title: string;
    eventType: string;
    status: string;
    startsAt: Date;
    endsAt: Date | null;
    speakerName: string | null;
    speakerTitle: string | null;
    registrationUrl: string | null;
    recordingUrl: string | null;
    isPublished: boolean;
    description: string;
};

function toDateTimeLocal(value: Date | null) {
    if (!value) return "";

    const pad = (n: number) => String(n).padStart(2, "0");

    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
        value.getDate(),
    )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function UpdateEventForm({ event }: { event: EventForEdit }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        updateEvent,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    return (
        <form action={formAction} className="space-y-6 border-t p-5">
            <input type="hidden" name="eventId" value={event.id} />

            <input type="hidden" name="journalId" value={event.journalId} />

            <ActionBanner state={state} />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormInput
                    label="Title"
                    name="title"
                    required
                    defaultValue={event.title}
                    disabled={pending}
                />

                <FormSelect
                    label="Event type"
                    name="eventType"
                    options={EVENT_TYPE_OPTIONS}
                    defaultValue={event.eventType}
                    disabled={pending}
                />

                <FormSelect
                    label="Status"
                    name="status"
                    options={EVENT_STATUS_OPTIONS}
                    defaultValue={event.status}
                    disabled={pending}
                />

                <FormInput
                    label="Starts at"
                    name="startsAt"
                    type="datetime-local"
                    required
                    defaultValue={toDateTimeLocal(event.startsAt)}
                    disabled={pending}
                />

                <FormInput
                    label="Ends at"
                    name="endsAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocal(event.endsAt)}
                    disabled={pending}
                />

                <FormInput
                    label="Speaker name"
                    name="speakerName"
                    defaultValue={event.speakerName || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Speaker title"
                    name="speakerTitle"
                    defaultValue={event.speakerTitle || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Registration URL"
                    name="registrationUrl"
                    type="url"
                    defaultValue={event.registrationUrl || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Recording URL"
                    name="recordingUrl"
                    type="url"
                    defaultValue={event.recordingUrl || ""}
                    disabled={pending}
                />

                <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                    <input
                        type="checkbox"
                        name="isPublished"
                        defaultChecked={event.isPublished}
                        disabled={pending}
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
                    defaultValue={event.description}
                    disabled={pending}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 disabled:opacity-50"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
                {pending ? "Saving…" : "Save Changes"}
            </button>
        </form>
    );
}

export function DeleteEventForm({ eventId }: { eventId: string }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        deleteEvent,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    return (
        <form
            action={formAction}
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5"
        >
            <input type="hidden" name="eventId" value={eventId} />

            <ActionBanner state={state} />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="font-bold text-red-950">Remove Event</p>

                    <p className="mt-1 text-sm text-red-800">
                        This permanently removes the event from the public
                        page.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                >
                    {pending ? "Deleting…" : "Delete Event"}
                </button>
            </div>
        </form>
    );
}
