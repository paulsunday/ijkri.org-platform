"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";
import { COUNTRIES } from "@/lib/constants/countries";

import {
    createEditorialBoardMember,
    deleteEditorialBoardMember,
    updateEditorialBoardMember,
} from "./actions";

const BOARD_ROLES = [
    "Editor-in-Chief",
    "Managing Editor",
    "Associate Editor",
    "Section Editor",
    "Editorial Board Member",
    "Advisory Board Member",
    "Technical Editor",
    "Copy Editor",
    "Language Editor",
    "Statistics Editor",
];

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
    options: readonly string[];
    required?: boolean;
    defaultValue?: string;
    placeholder?: string;
    disabled?: boolean;
};

function FormSelect({
    label,
    name,
    options,
    required = false,
    defaultValue = "",
    placeholder = "Select an option",
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
                <option value="" disabled>
                    {placeholder}
                </option>

                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function CreateBoardMemberForm({
    journalId,
}: {
    journalId: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        createEditorialBoardMember,
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
            encType="multipart/form-data"
            className="mt-8 space-y-6"
        >
            <input type="hidden" name="journalId" value={journalId} />

            <ActionBanner state={state} />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormInput
                    label="Full name"
                    name="name"
                    required
                    placeholder="Prof. Jane Doe"
                    disabled={pending}
                />

                <FormInput
                    label="Academic title"
                    name="title"
                    placeholder="Professor of Management"
                    disabled={pending}
                />

                <FormSelect
                    label="Editorial role"
                    name="role"
                    options={BOARD_ROLES}
                    placeholder="Select a role"
                    required
                    disabled={pending}
                />

                <FormInput
                    label="Affiliation"
                    name="affiliation"
                    placeholder="University or institution"
                    disabled={pending}
                />

                <FormSelect
                    label="Country"
                    name="country"
                    options={COUNTRIES}
                    placeholder="Select country"
                    disabled={pending}
                />

                <FormInput
                    label="Email address"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    disabled={pending}
                />

                <FormInput
                    label="Photo URL"
                    name="photoUrl"
                    type="url"
                    placeholder="https://... (optional if uploading below)"
                    disabled={pending}
                />

                <FormInput
                    label="Display order"
                    name="sortOrder"
                    type="number"
                    defaultValue="0"
                    disabled={pending}
                />
            </div>

            <div>
                <label
                    htmlFor="photoFile"
                    className="mb-2 block font-semibold"
                >
                    Upload profile picture
                </label>

                <input
                    id="photoFile"
                    name="photoFile"
                    type="file"
                    accept="image/png,image/jpeg"
                    disabled={pending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
                />

                <p className="mt-2 text-sm text-amber-800">
                    PNG or JPEG, up to 5 MB. Uploading a photo replaces the
                    Photo URL above.
                </p>
            </div>

            <div>
                <label htmlFor="bio" className="mb-2 block font-semibold">
                    Biography
                </label>

                <textarea
                    id="bio"
                    name="bio"
                    rows={6}
                    placeholder="Provide a concise professional biography."
                    disabled={pending}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
                {pending ? "Adding…" : "Add Editorial Board Member"}
            </button>
        </form>
    );
}

type MemberForEdit = {
    id: string;
    journalId: string;
    name: string;
    title: string | null;
    role: string | null;
    affiliation: string | null;
    country: string | null;
    email: string | null;
    photoUrl: string | null;
    sortOrder: number;
    bio: string | null;
};

export function UpdateBoardMemberForm({
    member,
}: {
    member: MemberForEdit;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        updateEditorialBoardMember,
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
            encType="multipart/form-data"
            className="space-y-6 border-t p-5"
        >
            <input type="hidden" name="memberId" value={member.id} />

            <input type="hidden" name="journalId" value={member.journalId} />

            <ActionBanner state={state} />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormInput
                    label="Full name"
                    name="name"
                    required
                    defaultValue={member.name}
                    disabled={pending}
                />

                <FormInput
                    label="Academic title"
                    name="title"
                    defaultValue={member.title || ""}
                    disabled={pending}
                />

                <FormSelect
                    label="Editorial role"
                    name="role"
                    options={BOARD_ROLES}
                    placeholder="Select a role"
                    required
                    defaultValue={member.role || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Affiliation"
                    name="affiliation"
                    defaultValue={member.affiliation || ""}
                    disabled={pending}
                />

                <FormSelect
                    label="Country"
                    name="country"
                    options={COUNTRIES}
                    placeholder="Select country"
                    defaultValue={member.country || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Email address"
                    name="email"
                    type="email"
                    defaultValue={member.email || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Photo URL"
                    name="photoUrl"
                    type="url"
                    defaultValue={member.photoUrl || ""}
                    disabled={pending}
                />

                <FormInput
                    label="Display order"
                    name="sortOrder"
                    type="number"
                    defaultValue={String(member.sortOrder)}
                    disabled={pending}
                />
            </div>

            <div>
                <label
                    htmlFor={`photoFile-${member.id}`}
                    className="mb-2 block font-semibold"
                >
                    Replace profile picture
                </label>

                <input
                    id={`photoFile-${member.id}`}
                    name="photoFile"
                    type="file"
                    accept="image/png,image/jpeg"
                    disabled={pending}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 disabled:opacity-50"
                />

                <p className="mt-2 text-sm text-slate-500">
                    PNG or JPEG, up to 5 MB. Uploading a photo replaces the
                    Photo URL above.
                </p>
            </div>

            <div>
                <label
                    htmlFor={`bio-${member.id}`}
                    className="mb-2 block font-semibold"
                >
                    Biography
                </label>

                <textarea
                    id={`bio-${member.id}`}
                    name="bio"
                    rows={6}
                    defaultValue={member.bio || ""}
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

export function DeleteBoardMemberForm({
    memberId,
}: {
    memberId: string;
}) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(
        deleteEditorialBoardMember,
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
            <input type="hidden" name="memberId" value={memberId} />

            <ActionBanner state={state} />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="font-bold text-red-950">
                        Remove Board Member
                    </p>

                    <p className="mt-1 text-sm text-red-800">
                        This permanently removes the member from the
                        journal’s editorial board.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                >
                    {pending ? "Deleting…" : "Delete Member"}
                </button>
            </div>
        </form>
    );
}
