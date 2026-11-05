"use client";

import { useActionState } from "react";

import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";

import {
    deleteVariableGuide,
    draftVariableGuides,
    saveVariableGuide,
} from "./actions";

function Banner({ state }: { state: FormActionState }) {
    if (!state.message) return null;

    return (
        <div
            role={state.success ? "status" : "alert"}
            className={`rounded-lg p-3 text-sm ${
                state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
        >
            {state.message}
        </div>
    );
}

const INPUT = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const LABEL = "mb-1 block text-sm font-semibold text-slate-700";
const HINT = "mt-1 text-xs text-slate-500";

export function DraftGuidesForm() {
    const [state, action, pending] = useActionState(
        draftVariableGuides,
        IDLE_FORM_ACTION_STATE,
    );

    return (
        <form action={action} className="space-y-3">
            <Banner state={state} />

            <label htmlFor="names" className={LABEL}>
                Variable names (one per line, up to 5)
            </label>

            <textarea
                id="names"
                name="names"
                rows={5}
                required
                placeholder={"Transformational leadership\nFinancial performance\nJob satisfaction"}
                className={INPUT}
            />

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
                {pending ? "Drafting with AI… (up to a minute per variable)" : "Draft with AI"}
            </button>
        </form>
    );
}

export type GuideFormValues = {
    id: string;
    slug: string;
    name: string;
    discipline: string;
    summary: string;
    isPublished: boolean;
    definition: string;
    measurementType: string;
    dimensions: string;
    scales: string;
    secondaryIndicators: string;
    relatedVariables: string;
    exampleTopics: string;
    researchTips: string;
};

export function EditGuideForm({ guide }: { guide: GuideFormValues }) {
    const [state, action, pending] = useActionState(
        saveVariableGuide,
        IDLE_FORM_ACTION_STATE,
    );

    const [deleteState, deleteAction, deleting] = useActionState(
        deleteVariableGuide,
        IDLE_FORM_ACTION_STATE,
    );

    const field = (
        name: keyof GuideFormValues,
        label: string,
        rows: number,
        hint?: string,
    ) => (
        <div>
            <label htmlFor={`${guide.id}-${name}`} className={LABEL}>
                {label}
            </label>
            <textarea
                id={`${guide.id}-${name}`}
                name={name}
                rows={rows}
                defaultValue={String(guide[name])}
                className={INPUT}
            />
            {hint ? <p className={HINT}>{hint}</p> : null}
        </div>
    );

    return (
        <div className="space-y-3">
            <form action={action} className="space-y-4">
                <input type="hidden" name="id" value={guide.id} />

                <Banner state={state} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor={`${guide.id}-name`} className={LABEL}>
                            Name
                        </label>
                        <input
                            id={`${guide.id}-name`}
                            name="name"
                            defaultValue={guide.name}
                            className={INPUT}
                        />
                    </div>

                    <div>
                        <label htmlFor={`${guide.id}-discipline`} className={LABEL}>
                            Discipline
                        </label>
                        <input
                            id={`${guide.id}-discipline`}
                            name="discipline"
                            defaultValue={guide.discipline}
                            className={INPUT}
                        />
                    </div>
                </div>

                {field("summary", "Search snippet (summary)", 2, "Shown under the title in Google. Aim for about 155 characters.")}
                {field("definition", "Definition", 3)}

                <div>
                    <label htmlFor={`${guide.id}-measurementType`} className={LABEL}>
                        Measured with
                    </label>
                    <select
                        id={`${guide.id}-measurementType`}
                        name="measurementType"
                        defaultValue={guide.measurementType}
                        className={INPUT}
                    >
                        <option value="VALIDATED_SCALE">Questionnaire (validated scale)</option>
                        <option value="SECONDARY_DATA">Secondary data</option>
                        <option value="BOTH">Either</option>
                    </select>
                </div>

                {field("dimensions", "Dimensions / proxies", 5, "One per line: Name | definition")}
                {field("scales", "Validated scales", 4, "One per line: Scale name | Author(s), year | ESTABLISHED or VERIFY. Check every citation before publishing.")}
                {field("secondaryIndicators", "Secondary-data indicators", 4, "One per line: Indicator | Formula | Data source")}
                {field("exampleTopics", "Example research topics", 6, "One per line")}
                {field("relatedVariables", "Related variables", 3, "One per line")}
                {field("researchTips", "Research tips", 4, "One per line")}

                <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                        type="checkbox"
                        name="isPublished"
                        defaultChecked={guide.isPublished}
                        className="h-4 w-4"
                    />
                    Published (visible at /variables/{guide.slug})
                </label>

                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                    {pending ? "Saving…" : "Save"}
                </button>
            </form>

            <form action={deleteAction}>
                <input type="hidden" name="id" value={guide.id} />
                <Banner state={deleteState} />
                <button
                    type="submit"
                    disabled={deleting}
                    className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                >
                    {deleting ? "Deleting…" : "Delete this guide"}
                </button>
            </form>
        </div>
    );
}
