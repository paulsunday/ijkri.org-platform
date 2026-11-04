"use client";

import { useActionState } from "react";

import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";

import {
    forceReleaseReservation,
    updateToolkitSettings,
} from "./actions";

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

export function ToolkitSettingsForm({
    journalId,
    toolkitPrice,
    topicReservationMonths,
}: {
    journalId: string;
    toolkitPrice: number;
    topicReservationMonths: number;
}) {
    const [state, formAction, pending] = useActionState(
        updateToolkitSettings,
        IDLE_FORM_ACTION_STATE,
    );

    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="journalId" value={journalId} />

            <ActionBanner state={state} />

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="toolkitPrice"
                        className="mb-1.5 block text-sm font-semibold"
                    >
                        Unlock price
                    </label>

                    <input
                        id="toolkitPrice"
                        name="toolkitPrice"
                        type="number"
                        min="2"
                        step="0.01"
                        required
                        defaultValue={toolkitPrice}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                </div>

                <div>
                    <label
                        htmlFor="topicReservationMonths"
                        className="mb-1.5 block text-sm font-semibold"
                    >
                        Reservation window (months)
                    </label>

                    <input
                        id="topicReservationMonths"
                        name="topicReservationMonths"
                        type="number"
                        min="1"
                        max="36"
                        required
                        defaultValue={topicReservationMonths}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
                {pending ? "Saving..." : "Save Settings"}
            </button>
        </form>
    );
}

export function ReleaseReservationForm({
    reservationId,
}: {
    reservationId: string;
}) {
    const [state, formAction, pending] = useActionState(
        forceReleaseReservation,
        IDLE_FORM_ACTION_STATE,
    );

    return (
        <form action={formAction} className="inline">
            <input
                type="hidden"
                name="reservationId"
                value={reservationId}
            />

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
                {pending ? "Releasing..." : "Force Release"}
            </button>

            {state.message && !state.success ? (
                <p className="mt-1 text-xs text-red-700">
                    {state.message}
                </p>
            ) : null}
        </form>
    );
}
