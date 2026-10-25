"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";

import {
    createResourceGuide,
    deleteResourceGuide,
    updateResourceGuide,
} from "./actions";

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

export function CreateResourceForm({ journalId }: { journalId: string }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        createResourceGuide,
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
                    placeholder="Designing a mixed-methods study"
                    disabled={pending}
                />

                <FormSelect
                    label="Category"
                    name="category"
                    required
                    options={CATEGORY_OPTIONS}
                    disabled={pending}
                />

                <FormSelect
                    label="Format"
                    name="format"
                    options={FORMAT_OPTIONS}
                    defaultValue="GUIDE"
                    disabled={pending}
                />

                <FormInput
                    label="External URL (optional)"
                    name="externalUrl"
                    type="url"
                    placeholder="https://..."
                    disabled={pending}
                />

                <FormInput
                    label="Display order"
                    name="sortOrder"
                    type="number"
                    defaultValue="0"
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
                <label htmlFor="summary" className="mb-2 block font-semibold">
                    Summary *
                </label>

                <textarea
                    id="summary"
                    name="summary"
                    rows={2}
                    required
                    placeholder="One or two sentences shown on the resource card."
                    disabled={pending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
                />
            </div>

            <div>
                <label htmlFor="body" className="mb-2 block font-semibold">
                    Guide content (optional if an external URL is provided)
                </label>

                <textarea
                    id="body"
                    name="body"
                    rows={8}
                    placeholder="Full guide content, shown on its own page."
                    disabled={pending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
                {pending ? "Adding…" : "Add Resource"}
            </button>
        </form>
    );
}

type ResourceForEdit = {
    id: string;
    journalId: string;
    title: string;
    category: string;
    format: string;
    externalUrl: string | null;
    sortOrder: number;
    isPublished: boolean;
    summary: string;
    body: string | null;
};

export function UpdateResourceForm({
    resource,
}: {
    resource: ResourceForEdit;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        updateResourceGuide,
        IDLE_FORM_ACTION_STATE,
    );

    useEffect(() => {
        if (state.success) {
            router.refresh();
        }
    }, [state.success, router]);

    return (
        <form action={formAction} className="space-y-6 border-t p-5">
            <input type="hidden" name="resourceId" value={resource.id} />

            <input type="hidden" name="journalId" value={resource.journalId} />

            <ActionBanner state={state} />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormInput
                    label="Title"
                    name="title"
                    required
                    defaultValue={resource.title}
                    disabled={pending}
                />

                <FormSelect
                    label="Category"
                    name="category"
                    required
                    options={CATEGORY_OPTIONS}
                    defaultValue={resource.category}
                    disabled={pending}
                />

                <FormSelect
                    label="Format"
                    name="format"
                    options={FORMAT_OPTIONS}
                    defaultValue={resource.format}
                    disabled={pending}
                />

                <FormInput
                    label="External URL"
                    name="externalUrl"
                    type="url"
                    defaultValue={resource.externalUrl || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Display order"
                    name="sortOrder"
                    type="number"
                    defaultValue={String(resource.sortOrder)}
                    disabled={pending}
                />

                <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium text-slate-700">
                    <input
                        type="checkbox"
                        name="isPublished"
                        defaultChecked={resource.isPublished}
                        disabled={pending}
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
                    defaultValue={resource.summary}
                    disabled={pending}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 disabled:opacity-50"
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
                    defaultValue={resource.body || ""}
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

export function DeleteResourceForm({ resourceId }: { resourceId: string }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        deleteResourceGuide,
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
            <input type="hidden" name="resourceId" value={resourceId} />

            <ActionBanner state={state} />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="font-bold text-red-950">Remove Resource</p>

                    <p className="mt-1 text-sm text-red-800">
                        This permanently removes the resource from the public
                        hub.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                >
                    {pending ? "Deleting…" : "Delete Resource"}
                </button>
            </div>
        </form>
    );
}
