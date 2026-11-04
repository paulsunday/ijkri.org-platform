"use client";

import { useActionState } from "react";

import {
    IDLE_FORM_ACTION_STATE,
    type FormActionState,
} from "@/lib/forms/run-form-action";

import {
    generateObjectives,
    reserveTopic,
    saveFormulation,
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

export function GenerateObjectivesForm({ topicId }: { topicId: string }) {
    const [state, formAction, pending] = useActionState(
        generateObjectives,
        IDLE_FORM_ACTION_STATE,
    );

    return (
        <form action={formAction} className="space-y-3">
            <input type="hidden" name="topicId" value={topicId} />

            <ActionBanner state={state} />

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
                {pending ? "Generating..." : "Generate Objectives, Questions & Hypotheses"}
            </button>
        </form>
    );
}

type FormulationFormProps = {
    topicId: string;
    generalObjective: string;
    specificObjectives: string[];
    researchQuestions: string[];
    hypotheses: string[];
};

export function EditFormulationForm({
    topicId,
    generalObjective,
    specificObjectives,
    researchQuestions,
    hypotheses,
}: FormulationFormProps) {
    const [state, formAction, pending] = useActionState(
        saveFormulation,
        IDLE_FORM_ACTION_STATE,
    );

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="topicId" value={topicId} />

            <ActionBanner state={state} />

            <div>
                <label
                    htmlFor="generalObjective"
                    className="mb-2 block font-semibold"
                >
                    General objective
                </label>

                <textarea
                    id="generalObjective"
                    name="generalObjective"
                    defaultValue={generalObjective}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
            </div>

            <div>
                <p className="mb-2 font-semibold">Specific objectives</p>

                <div className="space-y-2">
                    {specificObjectives.map((objective, index) => (
                        <textarea
                            key={index}
                            name="specificObjectives"
                            defaultValue={objective}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3"
                        />
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-2 font-semibold">Research questions</p>

                <div className="space-y-2">
                    {researchQuestions.map((question, index) => (
                        <textarea
                            key={index}
                            name="researchQuestions"
                            defaultValue={question}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3"
                        />
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-2 font-semibold">Null hypotheses</p>

                <div className="space-y-2">
                    {hypotheses.map((hypothesis, index) => (
                        <textarea
                            key={index}
                            name="hypotheses"
                            defaultValue={hypothesis}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3"
                        />
                    ))}
                </div>
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
                {pending ? "Saving..." : "Save Edits"}
            </button>
        </form>
    );
}

export function ReserveTopicForm({ topicId }: { topicId: string }) {
    const [state, formAction, pending] = useActionState(
        reserveTopic,
        IDLE_FORM_ACTION_STATE,
    );

    return (
        <form action={formAction} className="space-y-3">
            <input type="hidden" name="topicId" value={topicId} />

            <ActionBanner state={state} />

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
                {pending ? "Reserving..." : "Reserve This Topic"}
            </button>
        </form>
    );
}
