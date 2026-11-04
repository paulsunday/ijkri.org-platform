"use client";

import { useActionState } from "react";

import {
    IDLE_SUGGEST_TOPICS_STATE,
    requestTopicSuggestions,
} from "./actions";

export function SuggestionsForm() {
    const [state, formAction, pending] = useActionState(
        requestTopicSuggestions,
        IDLE_SUGGEST_TOPICS_STATE,
    );

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label
                    htmlFor="interestArea"
                    className="mb-2 block font-semibold"
                >
                    Your area of interest *
                </label>

                <input
                    id="interestArea"
                    name="interestArea"
                    type="text"
                    required
                    placeholder="e.g. human resource management, financial inclusion"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="supervisorSpecialization"
                        className="mb-2 block font-semibold"
                    >
                        Supervisor&apos;s specialization (optional)
                    </label>

                    <input
                        id="supervisorSpecialization"
                        name="supervisorSpecialization"
                        type="text"
                        placeholder="e.g. organizational behavior"
                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                </div>

                <div>
                    <label
                        htmlFor="degreeLevel"
                        className="mb-2 block font-semibold"
                    >
                        Degree level
                    </label>

                    <select
                        id="degreeLevel"
                        name="degreeLevel"
                        defaultValue="MSC"
                        className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    >
                        <option value="ND">ND</option>
                        <option value="HND">HND</option>
                        <option value="BSC">BSc</option>
                        <option value="PGD">PGD</option>
                        <option value="MSC">MSc</option>
                        <option value="MPHIL">MPhil</option>
                        <option value="PHD">PhD</option>
                    </select>
                </div>
            </div>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
                {pending ? "Generating..." : "Suggest Topics"}
            </button>

            {state.message ? (
                <p
                    role={state.success ? "status" : "alert"}
                    className={`text-sm ${state.success ? "text-green-800" : "text-red-800"}`}
                >
                    {state.message}
                </p>
            ) : null}

            {state.suggestions.length > 0 ? (
                <div className="space-y-4 pt-2">
                    {state.suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <h3 className="font-bold text-slate-950">
                                {suggestion.title}
                            </h3>

                            <p className="mt-2 text-sm text-slate-600">
                                IV: {suggestion.independentVariable} · DV:{" "}
                                {suggestion.dependentVariable} · Sector:{" "}
                                {suggestion.sector} · Location:{" "}
                                {suggestion.location}
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                {suggestion.rationale}
                            </p>
                        </div>
                    ))}
                </div>
            ) : null}
        </form>
    );
}
