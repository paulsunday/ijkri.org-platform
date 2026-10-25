"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";

import { createInsight, deleteInsight, updateInsight } from "./actions";

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

export function CreateInsightForm({ journalId }: { journalId: string }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        createInsight,
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
                    placeholder="Five tips for a stronger literature review"
                    disabled={pending}
                />

                <FormSelect
                    label="Category"
                    name="category"
                    required
                    options={CATEGORY_OPTIONS}
                    disabled={pending}
                />

                <FormInput
                    label="Author name"
                    name="authorName"
                    placeholder="IJKRI Editorial Team"
                    disabled={pending}
                />

                <FormInput
                    label="Cover image URL"
                    name="coverImage"
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
                <label htmlFor="excerpt" className="mb-2 block font-semibold">
                    Excerpt *
                </label>

                <textarea
                    id="excerpt"
                    name="excerpt"
                    rows={2}
                    required
                    placeholder="One or two sentences shown on the insight card."
                    disabled={pending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
                />
            </div>

            <div>
                <label htmlFor="body" className="mb-2 block font-semibold">
                    Body *
                </label>

                <textarea
                    id="body"
                    name="body"
                    rows={14}
                    required
                    placeholder="Full article content."
                    disabled={pending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
                {pending ? "Adding…" : "Add Insight"}
            </button>
        </form>
    );
}

type InsightForEdit = {
    id: string;
    journalId: string;
    title: string;
    category: string;
    authorName: string | null;
    coverImage: string | null;
    isPublished: boolean;
    excerpt: string;
    body: string;
};

export function UpdateInsightForm({ insight }: { insight: InsightForEdit }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        updateInsight,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    return (
        <form action={formAction} className="space-y-6 border-t p-5">
            <input type="hidden" name="insightId" value={insight.id} />

            <input type="hidden" name="journalId" value={insight.journalId} />

            <ActionBanner state={state} />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormInput
                    label="Title"
                    name="title"
                    required
                    defaultValue={insight.title}
                    disabled={pending}
                />

                <FormSelect
                    label="Category"
                    name="category"
                    required
                    options={CATEGORY_OPTIONS}
                    defaultValue={insight.category}
                    disabled={pending}
                />

                <FormInput
                    label="Author name"
                    name="authorName"
                    defaultValue={insight.authorName || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Cover image URL"
                    name="coverImage"
                    type="url"
                    defaultValue={insight.coverImage || ""}
                    disabled={pending}
                />

                <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                    <input
                        type="checkbox"
                        name="isPublished"
                        defaultChecked={insight.isPublished}
                        disabled={pending}
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
                    defaultValue={insight.excerpt}
                    disabled={pending}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 disabled:opacity-50"
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
                    defaultValue={insight.body}
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

export function DeleteInsightForm({ insightId }: { insightId: string }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        deleteInsight,
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
            <input type="hidden" name="insightId" value={insightId} />

            <ActionBanner state={state} />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="font-bold text-red-950">Remove Insight</p>

                    <p className="mt-1 text-sm text-red-800">
                        This permanently removes the insight from the public
                        section.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                >
                    {pending ? "Deleting…" : "Delete Insight"}
                </button>
            </div>
        </form>
    );
}
