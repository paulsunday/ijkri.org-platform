"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
    approveReviewerApplication,
    markApplicationUnderReview,
    rejectReviewerApplication,
    reopenReviewerApplication,
} from "./actions";
import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";

type FormVariant = "list" | "detail";

function ActionBanner({ state }: { state: FormActionState }) {
    if (!state.message) return null;

    return (
        <div
            role={state.success ? "status" : "alert"}
            className={`mb-4 rounded-lg p-3 text-sm ${
                state.success
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
            }`}
        >
            {state.message}
        </div>
    );
}

export function MarkUnderReviewForm({
    applicationId,
    reviewNotes,
    variant,
}: {
    applicationId: string;
    reviewNotes: string | null;
    variant: FormVariant;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        markApplicationUnderReview,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    if (variant === "detail") {
        return (
            <form
                action={formAction}
                className="rounded-xl border border-blue-200 bg-blue-50 p-6"
            >
                <input
                    type="hidden"
                    name="applicationId"
                    value={applicationId}
                />

                <ActionBanner state={state} />

                <h3 className="text-xl font-bold text-blue-950">
                    Mark Under Review
                </h3>

                <textarea
                    name="reviewNotes"
                    rows={5}
                    defaultValue={reviewNotes || ""}
                    placeholder="Add internal evaluation notes..."
                    disabled={pending}
                    className="mt-4 w-full rounded-lg border border-blue-200 bg-white p-4 disabled:opacity-50"
                />

                <button
                    type="submit"
                    disabled={pending}
                    className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                    {pending ? "Marking…" : "Mark Application Under Review"}
                </button>
            </form>
        );
    }

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

            <label
                htmlFor={`under-review-${applicationId}`}
                className="font-bold text-blue-950"
            >
                Internal review note
            </label>

            <textarea
                id={`under-review-${applicationId}`}
                name="reviewNotes"
                rows={4}
                defaultValue={reviewNotes || ""}
                disabled={pending}
                className="mt-3 w-full rounded-lg border border-blue-200 bg-white p-3 disabled:opacity-50"
            />

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
                {pending ? "Marking…" : "Mark Under Review"}
            </button>
        </form>
    );
}

export function ApproveApplicationForm({
    applicationId,
    reviewNotes,
    variant,
}: {
    applicationId: string;
    reviewNotes: string | null;
    variant: FormVariant;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        approveReviewerApplication,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    if (variant === "detail") {
        return (
            <form
                action={formAction}
                className="rounded-xl border border-green-200 bg-green-50 p-6"
            >
                <input
                    type="hidden"
                    name="applicationId"
                    value={applicationId}
                />

                <ActionBanner state={state} />

                <h3 className="text-xl font-bold text-green-950">
                    Approve Application
                </h3>

                <textarea
                    name="reviewNotes"
                    rows={5}
                    defaultValue={reviewNotes || ""}
                    placeholder="State why the applicant is suitable..."
                    disabled={pending}
                    className="mt-4 w-full rounded-lg border border-green-200 bg-white p-4 disabled:opacity-50"
                />

                <button
                    type="submit"
                    disabled={pending}
                    className="mt-4 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                    {pending ? "Approving…" : "Approve and Assign Reviewer Role"}
                </button>
            </form>
        );
    }

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

            <label
                htmlFor={`approve-${applicationId}`}
                className="font-bold text-green-950"
            >
                Approval note
            </label>

            <textarea
                id={`approve-${applicationId}`}
                name="reviewNotes"
                rows={4}
                defaultValue={reviewNotes || ""}
                disabled={pending}
                className="mt-3 w-full rounded-lg border border-green-200 bg-white p-3 disabled:opacity-50"
                placeholder="State why the applicant is suitable."
            />

            <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
                {pending ? "Approving…" : "Approve and Assign Reviewer Role"}
            </button>
        </form>
    );
}

export function RejectApplicationForm({
    applicationId,
    variant,
}: {
    applicationId: string;
    variant: FormVariant;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        rejectReviewerApplication,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    if (variant === "detail") {
        return (
            <form
                action={formAction}
                className="rounded-xl border border-red-200 bg-red-50 p-6"
            >
                <input
                    type="hidden"
                    name="applicationId"
                    value={applicationId}
                />

                <ActionBanner state={state} />

                <h3 className="text-xl font-bold text-red-950">
                    Reject Application
                </h3>

                <textarea
                    name="reviewNotes"
                    rows={5}
                    required
                    placeholder="A rejection reason is required..."
                    disabled={pending}
                    className="mt-4 w-full rounded-lg border border-red-200 bg-white p-4 disabled:opacity-50"
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

            <label
                htmlFor={`reject-${applicationId}`}
                className="font-bold text-red-950"
            >
                Rejection reason
            </label>

            <textarea
                id={`reject-${applicationId}`}
                name="reviewNotes"
                rows={4}
                required
                disabled={pending}
                className="mt-3 w-full rounded-lg border border-red-200 bg-white p-3 disabled:opacity-50"
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

export function ReopenApplicationForm({
    applicationId,
    variant,
}: {
    applicationId: string;
    variant: FormVariant;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        reopenReviewerApplication,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    if (variant === "detail") {
        return (
            <form
                action={formAction}
                className="rounded-xl border border-amber-200 bg-amber-50 p-6"
            >
                <input
                    type="hidden"
                    name="applicationId"
                    value={applicationId}
                />

                <ActionBanner state={state} />

                <h3 className="text-xl font-bold text-amber-950">
                    Return to Pending
                </h3>

                <p className="mt-3 leading-7 text-amber-900">
                    Reopen this application for a fresh
                    editorial assessment.
                </p>

                <button
                    type="submit"
                    disabled={pending}
                    className="mt-5 rounded-lg bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                    {pending ? "Reopening…" : "Reopen Application"}
                </button>
            </form>
        );
    }

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
                Reopen application
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900">
                Return this application
                to pending status for a
                new review.
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
