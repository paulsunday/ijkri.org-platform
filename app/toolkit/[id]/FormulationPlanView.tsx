import type {
    FormulationPlan,
    VariableRole,
} from "@/lib/research-toolkit/formulation-plan";

const ROLE_LABEL: Record<VariableRole, string> = {
    INDEPENDENT: "Independent variable",
    DEPENDENT: "Dependent variable",
    MODERATING: "Moderating variable",
    MEDIATING: "Mediating variable",
};

const METHODOLOGY_LABELS: [keyof FormulationPlan["methodology"], string][] = [
    ["researchDesign", "Research design"],
    ["populationAndSampling", "Population & sampling"],
    ["instrument", "Instrument"],
    ["validityAndReliability", "Validity & reliability"],
    ["analysisTechnique", "Data analysis"],
];

/** Read-only display of the AI-built formulation plan. */
export default function FormulationPlanView({
    plan,
}: {
    plan: FormulationPlan;
}) {
    return (
        <div className="space-y-10">
            <section>
                <h2 className="text-xl font-bold">
                    Variables & Measurable Proxies
                </h2>

                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Scales marked <strong>Verify</strong> must be checked
                    against the original source before you cite them. Even
                    the established ones: confirm the exact author, year and
                    items in the paper itself — AI can get citations wrong.
                </p>

                <div className="mt-4 space-y-6">
                    {plan.variables.map((variable) => (
                        <div key={`${variable.role}-${variable.name}`}>
                            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                {ROLE_LABEL[variable.role]}
                            </p>

                            <h3 className="text-lg font-bold">
                                {variable.name}
                            </h3>

                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="py-2 pr-4 font-semibold">
                                                Proxy
                                            </th>
                                            <th className="py-2 pr-4 font-semibold">
                                                Operational definition
                                            </th>
                                            <th className="py-2 font-semibold">
                                                Measurement scale
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {variable.proxies.map((proxy) => (
                                            <tr
                                                key={proxy.name}
                                                className="border-b border-slate-100 align-top"
                                            >
                                                <td className="py-3 pr-4 font-medium">
                                                    {proxy.name}
                                                </td>

                                                <td className="py-3 pr-4 text-slate-700">
                                                    {proxy.definition}
                                                </td>

                                                <td className="py-3">
                                                    <span className="block">
                                                        {proxy.scaleName}
                                                    </span>

                                                    {proxy.scaleSource ? (
                                                        <span className="block text-slate-500">
                                                            {proxy.scaleSource}
                                                        </span>
                                                    ) : null}

                                                    <span
                                                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                                            proxy.confidence ===
                                                            "ESTABLISHED"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-amber-100 text-amber-900"
                                                        }`}
                                                    >
                                                        {proxy.confidence ===
                                                        "ESTABLISHED"
                                                            ? "Established"
                                                            : "Verify"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {plan.specificObjectives.length > 0 ? (
                <section>
                    <h2 className="text-xl font-bold">
                        How each objective maps to the proxies
                    </h2>

                    <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm">
                        {plan.specificObjectives.map((item, index) => (
                            <li key={index}>
                                <span className="font-medium">
                                    {item.independentProxy}
                                </span>{" "}
                                →{" "}
                                <span className="font-medium">
                                    {item.dependentProxy}
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            ) : null}

            {plan.theories.length > 0 ? (
                <section>
                    <h2 className="text-xl font-bold">Underpinning theory</h2>

                    <div className="mt-4 space-y-3">
                        {plan.theories.map((theory) => (
                            <div
                                key={theory.name}
                                className="rounded-lg border border-slate-200 p-4"
                            >
                                <p className="font-semibold">
                                    {theory.name}
                                    {theory.proponents
                                        ? ` — ${theory.proponents}`
                                        : ""}
                                </p>

                                <p className="mt-1 text-sm text-slate-700">
                                    {theory.relevance}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {plan.conceptualFramework ? (
                <section>
                    <h2 className="text-xl font-bold">
                        Conceptual framework
                    </h2>

                    <p className="mt-3 leading-7 text-slate-700">
                        {plan.conceptualFramework}
                    </p>
                </section>
            ) : null}

            <section>
                <h2 className="text-xl font-bold">Methodology outline</h2>

                <dl className="mt-4 space-y-3 text-sm">
                    {METHODOLOGY_LABELS.filter(
                        ([key]) => plan.methodology[key],
                    ).map(([key, label]) => (
                        <div key={key}>
                            <dt className="font-semibold text-slate-500">
                                {label}
                            </dt>

                            <dd className="mt-1 text-slate-800">
                                {plan.methodology[key]}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>

            {plan.otherAssistance.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <h2 className="text-xl font-bold">What you&apos;ll need next</h2>

                    <ul className="mt-4 space-y-3 text-sm">
                        {plan.otherAssistance.map((tip) => (
                            <li key={tip.title}>
                                <p className="font-semibold">{tip.title}</p>

                                <p className="mt-0.5 text-slate-700">
                                    {tip.advice}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
