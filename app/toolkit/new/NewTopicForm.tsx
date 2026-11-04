"use client";

import { useActionState } from "react";

import { checkFormulation, type CheckFormulationState } from "./actions";

const DEGREE_LEVEL_OPTIONS = [
    { value: "ND", label: "ND" },
    { value: "HND", label: "HND" },
    { value: "BSC", label: "BSc" },
    { value: "PGD", label: "PGD" },
    { value: "MSC", label: "MSc" },
    { value: "MPHIL", label: "MPhil" },
    { value: "PHD", label: "PhD" },
] as const;

const INITIAL_STATE: CheckFormulationState = {
    message: "",
    values: { topicText: "", degreeLevel: "", discipline: "" },
};

export default function NewTopicForm() {
    const [state, formAction, pending] = useActionState(
        checkFormulation,
        INITIAL_STATE,
    );

    return (
        // key re-mounts the fields with the submitted values after an error,
        // since React resets uncontrolled inputs once the action finishes.
        <form
            key={state.message}
            action={formAction}
            className="mt-8 space-y-6"
        >
            {state.message && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    {state.message}
                </div>
            )}

            <div>
                <label htmlFor="topicText" className="mb-2 block font-semibold">
                    Working topic/title *
                </label>

                <textarea
                    id="topicText"
                    name="topicText"
                    required
                    minLength={15}
                    rows={4}
                    defaultValue={state.values.topicText}
                    placeholder='e.g. "Effect of green human resource management practices on employee retention among commercial banks in Enugu State"'
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="degreeLevel"
                        className="mb-2 block font-semibold"
                    >
                        Degree level *
                    </label>

                    <select
                        id="degreeLevel"
                        name="degreeLevel"
                        required
                        defaultValue={state.values.degreeLevel}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    >
                        <option value="" disabled>
                            Select degree level
                        </option>

                        {DEGREE_LEVEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="discipline"
                        className="mb-2 block font-semibold"
                    >
                        Discipline (optional)
                    </label>

                    <input
                        id="discipline"
                        name="discipline"
                        type="text"
                        defaultValue={state.values.discipline}
                        placeholder="e.g. Human Resource Management"
                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
            >
                {pending ? "Checking your topic…" : "Run Formulation Checker"}
            </button>
        </form>
    );
}
