import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import type { TopicBreakdown } from "@/lib/ai/formulation-checker";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { FormulationPlan } from "@/lib/research-toolkit/formulation-plan";
import type { Finding } from "@/lib/research-toolkit/rules";

import FormulationPlanView from "./FormulationPlanView";
import {
    EditFormulationForm,
    GenerateObjectivesForm,
    ReserveTopicForm,
} from "./TopicWorkbenchForms";

export const metadata: Metadata = {
    title: "Topic — Research Topic Formulation Workbench",
};

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);
}

const SEVERITY_STYLE: Record<string, string> = {
    ERROR: "border-red-200 bg-red-50 text-red-900",
    WARNING: "border-amber-200 bg-amber-50 text-amber-900",
};

const RESERVATION_STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Reserved",
    RELEASED: "Released",
    CONVERTED: "Converted",
};

type TopicPageProps = {
    params: Promise<{ id: string }>;
};

export default async function TopicPage({ params }: TopicPageProps) {
    const { id } = await params;

    const user = await requireCurrentUser();

    const topic = await prisma.researchTopic.findUnique({
        where: {
            id,
        },
        include: {
            reservation: true,
        },
    });

    if (!topic) {
        notFound();
    }

    if (topic.userId !== user.id) {
        redirect("/toolkit");
    }

    const breakdown = topic.breakdown as unknown as TopicBreakdown | null;
    const findings = (topic.checkerFindings as unknown as Finding[]) || [];

    const objectives = topic.objectives as unknown as {
        general: string;
        specific: string[];
    } | null;

    const researchQuestions =
        (topic.researchQuestions as unknown as string[]) || [];

    const hypotheses = (topic.hypotheses as unknown as string[]) || [];

    const plan = topic.formulationPlan as unknown as FormulationPlan | null;

    // Suggest one objective per named IV dimension, within 2-8.
    const dimensionCount =
        breakdown?.independentVariables.reduce(
            (total, iv) => total + Math.max(1, iv.subVariables.length),
            0,
        ) ?? 0;

    const defaultObjectiveCount = Math.min(
        8,
        Math.max(2, dimensionCount || 4),
    );

    return (
        <main className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                {topic.degreeLevel}
                {topic.discipline ? ` · ${topic.discipline}` : ""}
            </p>

            <h1 className="mt-3 text-3xl font-bold">{topic.rawTopicText}</h1>

            <p className="mt-2 text-sm text-slate-500">
                Started {formatDate(topic.createdAt)}
            </p>

            {breakdown ? (
                <>
                    <section className="mt-10">
                        <h2 className="text-xl font-bold">
                            Formulation Checklist
                        </h2>

                        {findings.length === 0 ? (
                            <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                                No issues found — this topic has a clear
                                independent and dependent variable, a
                                scope appropriate for your degree level,
                                and no vague phrasing.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {findings.map((finding) => (
                                    <div
                                        key={finding.code}
                                        className={`rounded-lg border p-4 ${SEVERITY_STYLE[finding.severity] || ""}`}
                                    >
                                        <p className="font-semibold">
                                            {finding.message}
                                        </p>

                                        <p className="mt-1 text-sm opacity-80">
                                            {finding.suggestion}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                        <h2 className="text-xl font-bold">
                            Variable Breakdown
                        </h2>

                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="font-semibold text-slate-500">
                                    Independent variable(s)
                                </dt>

                                <dd className="mt-1">
                                    {breakdown.independentVariables
                                        .map((iv) =>
                                            iv.subVariables.length > 0
                                                ? `${iv.name} (${iv.subVariables.join(", ")})`
                                                : iv.name,
                                        )
                                        .join("; ") || "None identified"}
                                </dd>
                            </div>

                            <div>
                                <dt className="font-semibold text-slate-500">
                                    Dependent variable(s)
                                </dt>

                                <dd className="mt-1">
                                    {breakdown.dependentVariables.join(
                                        ", ",
                                    ) || "None identified"}
                                </dd>
                            </div>

                            <div>
                                <dt className="font-semibold text-slate-500">
                                    Population / sector / location
                                </dt>

                                <dd className="mt-1">
                                    {[
                                        breakdown.population,
                                        breakdown.sector,
                                        breakdown.location.raw,
                                    ]
                                        .filter(Boolean)
                                        .join(" · ") || "Not specified"}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="mt-10">
                        <h2 className="text-xl font-bold">
                            Objectives, Questions & Hypotheses
                        </h2>

                        <div className="mt-4">
                            <GenerateObjectivesForm
                                topicId={topic.id}
                                defaultCount={defaultObjectiveCount}
                                hasExisting={Boolean(objectives)}
                            />
                        </div>

                        {objectives ? (
                            <div className="mt-8">
                                <EditFormulationForm
                                    // Remount after regeneration so the
                                    // fields show the new objectives.
                                    key={JSON.stringify(objectives)}
                                    topicId={topic.id}
                                    generalObjective={objectives.general}
                                    specificObjectives={
                                        objectives.specific
                                    }
                                    researchQuestions={researchQuestions}
                                    hypotheses={hypotheses}
                                />
                            </div>
                        ) : null}
                    </section>

                    {plan ? (
                        <div className="mt-12">
                            <FormulationPlanView plan={plan} />
                        </div>
                    ) : null}

                    <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                        <h2 className="text-xl font-bold text-amber-950">
                            Topic Reservation
                        </h2>

                        {topic.reservation ? (
                            <div className="mt-4 text-amber-900">
                                <p className="font-semibold">
                                    {
                                        RESERVATION_STATUS_LABEL[
                                            topic.reservation.status
                                        ]
                                    }
                                </p>

                                <p className="mt-1 text-sm">
                                    Reserved{" "}
                                    {formatDate(
                                        topic.reservation.reservedAt,
                                    )}
                                    , expires{" "}
                                    {formatDate(
                                        topic.reservation.expiresAt,
                                    )}
                                    .
                                </p>

                                {topic.reservation.releaseReason ? (
                                    <p className="mt-1 text-sm">
                                        {topic.reservation.releaseReason}
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <div className="mt-4">
                                <p className="mb-4 text-sm text-amber-900">
                                    Reserving locks this exact combination
                                    of variables, sector, and location to
                                    you with a timestamp as proof of first
                                    claim. If no proposal seminar is
                                    recorded within the reservation
                                    window, it&apos;s released back to the
                                    pool.
                                </p>

                                <ReserveTopicForm topicId={topic.id} />
                            </div>
                        )}
                    </section>
                </>
            ) : null}
        </main>
    );
}
