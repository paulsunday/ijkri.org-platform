"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
    chooseTopicCandidate,
    generateTopicCandidates,
    type BuildTopicState,
} from "./actions";

const DEGREE_LEVEL_OPTIONS = [
    { value: "ND", label: "ND" },
    { value: "HND", label: "HND" },
    { value: "BSC", label: "BSc" },
    { value: "PGD", label: "PGD" },
    { value: "MSC", label: "MSc" },
    { value: "MPHIL", label: "MPhil" },
    { value: "PHD", label: "PhD" },
] as const;

const INITIAL_STATE: BuildTopicState = {
    message: "",
    candidates: [],
    values: {
        independentVariables: "",
        dependentVariables: "",
        otherVariables: "",
        population: "",
        sector: "",
        location: "",
        degreeLevel: "",
        discipline: "",
    },
};

const INPUT_CLASS =
    "w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

function UseTopicButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
        >
            {pending ? "Saving…" : "Use this topic"}
        </button>
    );
}

export default function BuildTopicForm() {
    const [state, formAction, pending] = useActionState(
        generateTopicCandidates,
        INITIAL_STATE,
    );

    const { values } = state;

    return (
        <div className="mt-8 space-y-10">
            <form
                // Re-mount with the submitted values after each attempt.
                key={JSON.stringify(values) + state.message}
                action={formAction}
                className="space-y-6"
            >
                {state.message ? (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                    >
                        {state.message}
                    </div>
                ) : null}

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="independentVariables"
                            className="mb-2 block font-semibold"
                        >
                            Independent variable(s) *
                        </label>

                        <input
                            id="independentVariables"
                            name="independentVariables"
                            required
                            defaultValue={values.independentVariables}
                            placeholder="e.g. Transformational leadership"
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="dependentVariables"
                            className="mb-2 block font-semibold"
                        >
                            Dependent variable(s) *
                        </label>

                        <input
                            id="dependentVariables"
                            name="dependentVariables"
                            required
                            defaultValue={values.dependentVariables}
                            placeholder="e.g. Employee performance"
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="otherVariables"
                        className="mb-2 block font-semibold"
                    >
                        Moderating or mediating variable (optional)
                    </label>

                    <input
                        id="otherVariables"
                        name="otherVariables"
                        defaultValue={values.otherVariables}
                        placeholder="e.g. Organisational culture (moderator)"
                        className={INPUT_CLASS}
                    />
                </div>

                <div className="grid gap-6 sm:grid-cols-3">
                    <div>
                        <label
                            htmlFor="population"
                            className="mb-2 block font-semibold"
                        >
                            Population (optional)
                        </label>

                        <input
                            id="population"
                            name="population"
                            defaultValue={values.population}
                            placeholder="e.g. Bank employees"
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="sector"
                            className="mb-2 block font-semibold"
                        >
                            Sector (optional)
                        </label>

                        <input
                            id="sector"
                            name="sector"
                            defaultValue={values.sector}
                            placeholder="e.g. Banking"
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="location"
                            className="mb-2 block font-semibold"
                        >
                            Location (optional)
                        </label>

                        <input
                            id="location"
                            name="location"
                            defaultValue={values.location}
                            placeholder="e.g. Enugu State"
                            className={INPUT_CLASS}
                        />
                    </div>
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
                            defaultValue={values.degreeLevel}
                            className={INPUT_CLASS}
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
                            defaultValue={values.discipline}
                            placeholder="e.g. Business Administration"
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                >
                    {pending
                        ? "Building topics…"
                        : state.candidates.length > 0
                          ? "Build different topics"
                          : "Build My Topic"}
                </button>
            </form>

            {state.candidates.length > 0 ? (
                <section>
                    <h2 className="text-xl font-bold">Pick a topic</h2>

                    <p className="mt-1 text-sm text-slate-600">
                        Choosing one saves it, runs the formulation
                        checklist, and takes you to the page where you
                        generate objectives from validated scales.
                    </p>

                    <div className="mt-4 space-y-4">
                        {state.candidates.map((candidate, index) => (
                            <form
                                key={index}
                                action={chooseTopicCandidate}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                            >
                                <input
                                    type="hidden"
                                    name="candidate"
                                    value={JSON.stringify({
                                        title: candidate.title,
                                        breakdown: candidate.breakdown,
                                    })}
                                />

                                <input
                                    type="hidden"
                                    name="degreeLevel"
                                    value={values.degreeLevel}
                                />

                                <input
                                    type="hidden"
                                    name="discipline"
                                    value={values.discipline}
                                />

                                <h3 className="text-lg font-bold">
                                    {candidate.title}
                                </h3>

                                <p className="mt-2 text-sm text-slate-600">
                                    {candidate.rationale}
                                </p>

                                <p className="mt-3 text-sm text-slate-500">
                                    <span className="font-semibold">
                                        Dimensions:
                                    </span>{" "}
                                    {candidate.breakdown.independentVariables
                                        .map((iv) =>
                                            iv.subVariables.length > 0
                                                ? `${iv.name} (${iv.subVariables.join(", ")})`
                                                : iv.name,
                                        )
                                        .join("; ")}
                                </p>

                                <div className="mt-4">
                                    <UseTopicButton />
                                </div>
                            </form>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
