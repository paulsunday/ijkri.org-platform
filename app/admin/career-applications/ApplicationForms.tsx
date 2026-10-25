"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
    approveCareerApplication,
    markCareerApplicationUnderReview,
    rejectCareerApplication,
    reopenCareerApplication,
    scheduleCareerInterview,
    shortlistCareerApplication,
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
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

function ActionTextarea({
    id,
    label,
    defaultValue = "",
    required = false,
    disabled = false,
}: {
    id: string;
    label: string;
    defaultValue?: string;
    required?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="mt-4">
            <label
                htmlFor={id}
                className="font-bold"
            >
                {label}
            </label>

            <textarea
                id={id}
                name="reviewNotes"
                rows={4}
                required={required}
                defaultValue={defaultValue}
                disabled={disabled}
                className="mt-3 w-full rounded-lg border bg-white p-3 disabled:opacity-50"
            />
        </div>
    );
}

export function MarkUnderReviewForm({
    applicationId,
    defaultReviewNotes,
}: {
    applicationId: string;
    defaultReviewNotes: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        markCareerApplicationUnderReview,
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
            className="rounded-xl border border-blue-200 bg-blue-50 p-5"
        >
            <input
                type="hidden"
                name="applicationId"
                value={applicationId}
            />

            <ActionBanner state={state} />

            <ActionTextarea
                id={`review-${applicationId}`}
                label="Review note"
                defaultValue={defaultReviewNotes}
                disabled={pending}
            />

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
                {pending ? "Saving…" : "Mark Under Review"}
            </button>
        </form>
    );
}

export function ShortlistForm({
    applicationId,
    defaultReviewNotes,
}: {
    applicationId: string;
    defaultReviewNotes: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        shortlistCareerApplication,
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
            className="rounded-xl border border-purple-200 bg-purple-50 p-5"
        >
            <input
                type="hidden"
                name="applicationId"
                value={applicationId}
            />

            <ActionBanner state={state} />

            <ActionTextarea
                id={`shortlist-${applicationId}`}
                label="Shortlisting note"
                defaultValue={defaultReviewNotes}
                disabled={pending}
            />

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800 disabled:opacity-50"
            >
                {pending ? "Shortlisting…" : "Shortlist Applicant"}
            </button>
        </form>
    );
}

export function ScheduleInterviewForm({
    applicationId,
    defaultReviewNotes,
}: {
    applicationId: string;
    defaultReviewNotes: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        scheduleCareerInterview,
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
            className="rounded-xl border border-orange-200 bg-orange-50 p-5"
        >
            <input
                type="hidden"
                name="applicationId"
                value={applicationId}
            />

            <ActionBanner state={state} />

            <label
                htmlFor={`interview-${applicationId}`}
                className="font-bold text-orange-950"
            >
                Interview date and time
            </label>

            <input
                id={`interview-${applicationId}`}
                name="interviewDate"
                type="datetime-local"
                required
                disabled={pending}
                className="mt-3 w-full rounded-lg border border-orange-200 bg-white p-3 disabled:opacity-50"
            />

            <ActionTextarea
                id={`interview-note-${applicationId}`}
                label="Interview note"
                defaultValue={defaultReviewNotes}
                disabled={pending}
            />

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
                {pending ? "Scheduling…" : "Schedule Interview"}
            </button>
        </form>
    );
}

export function ApproveForm({
    applicationId,
    defaultReviewNotes,
}: {
    applicationId: string;
    defaultReviewNotes: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        approveCareerApplication,
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
            className="rounded-xl border border-green-200 bg-green-50 p-5"
        >
            <input
                type="hidden"
                name="applicationId"
                value={applicationId}
            />

            <ActionBanner state={state} />

            <ActionTextarea
                id={`approve-${applicationId}`}
                label="Approval note"
                defaultValue={defaultReviewNotes}
                disabled={pending}
            />

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
                {pending ? "Approving…" : "Approve Application"}
            </button>
        </form>
    );
}

export function RejectForm({
    applicationId,
}: {
    applicationId: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        rejectCareerApplication,
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
            className="rounded-xl border border-red-200 bg-red-50 p-5"
        >
            <input
                type="hidden"
                name="applicationId"
                value={applicationId}
            />

            <ActionBanner state={state} />

            <ActionTextarea
                id={`reject-${applicationId}`}
                label="Rejection reason"
                required
                disabled={pending}
            />

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
                {pending ? "Rejecting…" : "Reject Application"}
            </button>
        </form>
    );
}

export function ReopenForm({
    applicationId,
}: {
    applicationId: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        reopenCareerApplication,
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
            className="rounded-xl border border-amber-200 bg-amber-50 p-5"
        >
            <input
                type="hidden"
                name="applicationId"
                value={applicationId}
            />

            <ActionBanner state={state} />

            <p className="font-bold text-amber-950">
                Reopen Application
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900">
                Return this application to
                pending status and clear the
                current interview and review
                information.
            </p>

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
                {pending ? "Reopening…" : "Return to Pending"}
            </button>
        </form>
    );
}
