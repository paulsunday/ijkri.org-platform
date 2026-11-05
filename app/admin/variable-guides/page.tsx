import Link from "next/link";
import type { Metadata } from "next";

import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getToolkitJournalId } from "@/lib/research-toolkit/topics";
import {
    formatDimensions,
    formatIndicators,
    formatScales,
    normalizeGuideContent,
} from "@/lib/research-toolkit/variable-guide";

import { DraftGuidesForm, EditGuideForm } from "./VariableGuideForms";

export const metadata: Metadata = { title: "Variable Guides" };

// Drafting several guides makes several AI calls from this page.
export const maxDuration = 300;

const MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

export default async function VariableGuidesAdminPage() {
    await requireAnyRole([...MANAGER_ROLES]);

    const journalId = await getToolkitJournalId();

    const guides = await prisma.variableGuide.findMany({
        where: { journalId },
        orderBy: [{ isPublished: "asc" }, { updatedAt: "desc" }],
    });

    const published = guides.filter((guide) => guide.isPublished).length;

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Research Toolkit · SEO
                </p>

                <h1 className="mt-3 text-3xl font-bold">Variable Guides</h1>

                <p className="mt-2 max-w-3xl text-slate-600">
                    Each published guide becomes a public page at{" "}
                    <Link href="/variables" className="underline">
                        /variables
                    </Link>{" "}
                    built to rank for searches like &quot;dimensions of X&quot;
                    and &quot;how to measure X&quot;, linking students to the
                    topic checker. {published} published, {guides.length - published}{" "}
                    draft{guides.length - published === 1 ? "" : "s"}.
                </p>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">Draft new guides</h2>

                <p className="mb-4 mt-1 text-sm text-slate-500">
                    The AI writes an unpublished draft. Check the definitions
                    and especially every scale citation, then publish.
                </p>

                <DraftGuidesForm />
            </section>

            {guides.map((guide) => {
                const content = normalizeGuideContent(guide.content);

                return (
                    <details
                        key={guide.id}
                        className="rounded-xl border bg-white p-6 shadow-sm"
                    >
                        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                            <span className="text-lg font-bold">{guide.name}</span>

                            <span className="flex items-center gap-3 text-sm">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                                        guide.isPublished
                                            ? "bg-green-100 text-green-800"
                                            : "bg-amber-100 text-amber-900"
                                    }`}
                                >
                                    {guide.isPublished ? "Published" : "Draft"}
                                </span>

                                {guide.isPublished ? (
                                    <Link
                                        href={`/variables/${guide.slug}`}
                                        className="underline"
                                        target="_blank"
                                    >
                                        View
                                    </Link>
                                ) : null}
                            </span>
                        </summary>

                        <div className="mt-6">
                            <EditGuideForm
                                guide={{
                                    id: guide.id,
                                    slug: guide.slug,
                                    name: guide.name,
                                    discipline: guide.discipline,
                                    summary: guide.summary,
                                    isPublished: guide.isPublished,
                                    definition: content.definition,
                                    measurementType: content.measurementType,
                                    dimensions: formatDimensions(content.dimensions),
                                    scales: formatScales(content.scales),
                                    secondaryIndicators: formatIndicators(
                                        content.secondaryIndicators,
                                    ),
                                    relatedVariables: content.relatedVariables.join("\n"),
                                    exampleTopics: content.exampleTopics.join("\n"),
                                    researchTips: content.researchTips.join("\n"),
                                }}
                            />
                        </div>
                    </details>
                );
            })}
        </main>
    );
}
