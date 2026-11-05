import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { getToolkitJournalId } from "@/lib/research-toolkit/topics";

export const revalidate = 3600;

export const metadata: Metadata = {
    title: "Research Variable Library: Dimensions, Scales & Measurement",
    description:
        "Free guides to research variables: their dimensions, validated measurement scales, secondary-data proxies and example research topics for BSc, MSc and PhD projects.",
    alternates: { canonical: "/variables" },
    openGraph: {
        title: "Research Variable Library | IJKRI",
        description:
            "Dimensions, validated scales and example research topics for common research variables.",
        url: "/variables",
        type: "website",
    },
};

export default async function VariableLibraryPage() {
    const journalId = await getToolkitJournalId();

    const guides = await prisma.variableGuide.findMany({
        where: { journalId, isPublished: true },
        select: { slug: true, name: true, discipline: true, summary: true },
        orderBy: { name: "asc" },
    });

    // Group by discipline for easier browsing.
    const groups = new Map<string, typeof guides>();
    for (const guide of guides) {
        const key = guide.discipline || "General";
        groups.set(key, [...(groups.get(key) ?? []), guide]);
    }

    return (
        <main className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Research Resources
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                Research Variable Library
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                How to define, break down and measure the variables in your
                research topic: dimensions, validated scales, secondary-data
                proxies and example topics for each.
            </p>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <p className="font-semibold text-amber-950">
                    Know your variables? Build your research topic, objectives
                    and hypotheses from them, free.
                </p>
                <Link
                    href="/toolkit"
                    className="mt-3 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-400"
                >
                    Open the free topic checker →
                </Link>
            </div>

            {guides.length === 0 ? (
                <p className="mt-12 text-slate-600">
                    Variable guides are being prepared. Check back soon.
                </p>
            ) : (
                [...groups.entries()]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([discipline, items]) => (
                        <section key={discipline} className="mt-12">
                            <h2 className="text-2xl font-bold">{discipline}</h2>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {items.map((guide) => (
                                    <Link
                                        key={guide.slug}
                                        href={`/variables/${guide.slug}`}
                                        className="block rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <h3 className="font-bold">{guide.name}</h3>
                                        <p className="mt-2 text-sm text-slate-600">
                                            {guide.summary}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))
            )}
        </main>
    );
}
