import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { getToolkitJournalId } from "@/lib/research-toolkit/topics";
import { normalizeGuideContent } from "@/lib/research-toolkit/variable-guide";

type PageProps = { params: Promise<{ slug: string }> };

// Refresh published guides at most hourly (edits also revalidate).
export const revalidate = 3600;

async function getGuide(slug: string) {
    const journalId = await getToolkitJournalId();

    const guide = await prisma.variableGuide.findUnique({
        where: { journalId_slug: { journalId, slug } },
    });

    if (!guide || !guide.isPublished) return null;

    return { ...guide, content: normalizeGuideContent(guide.content) };
}

function pageTitle(name: string, measurementType: string) {
    return measurementType === "SECONDARY_DATA"
        ? `${name}: Proxies, Measurement Formula & Research Topics`
        : `${name}: Dimensions, Measurement Scale & Research Topics`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const guide = await getGuide(slug);

    if (!guide) return { title: "Variable Not Found" };

    const title = pageTitle(guide.name, guide.content.measurementType);

    return {
        title,
        description: guide.summary,
        alternates: { canonical: `/variables/${guide.slug}` },
        openGraph: {
            title,
            description: guide.summary,
            url: `/variables/${guide.slug}`,
            type: "article",
        },
    };
}

export default async function VariableGuidePage({ params }: PageProps) {
    const { slug } = await params;
    const guide = await getGuide(slug);

    if (!guide) notFound();

    const { content } = guide;
    const lower = guide.name.toLowerCase();

    const dimensionList = content.dimensions.map((d) => d.name).join(", ");

    const faq = [
        {
            question: `What is ${lower}?`,
            answer: content.definition,
        },
        content.dimensions.length
            ? {
                  question: `What are the dimensions of ${lower}?`,
                  answer: `${guide.name} is commonly broken into: ${dimensionList}.`,
              }
            : null,
        content.scales.length || content.secondaryIndicators.length
            ? {
                  question: `How is ${lower} measured?`,
                  answer: [
                      content.scales.length
                          ? `With a questionnaire, using validated scales such as ${content.scales
                                .map((s) => (s.source ? `${s.name} (${s.source})` : s.name))
                                .join("; ")}.`
                          : "",
                      content.secondaryIndicators.length
                          ? `With secondary data, using indicators such as ${content.secondaryIndicators
                                .map((i) => (i.formula ? `${i.name} (${i.formula})` : i.name))
                                .join("; ")}.`
                          : "",
                  ]
                      .filter(Boolean)
                      .join(" "),
              }
            : null,
    ].filter((item): item is { question: string; answer: string } => Boolean(item));

    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: pageTitle(guide.name, content.measurementType),
            description: guide.summary,
            url: `https://www.ijkri.org/variables/${guide.slug}`,
            datePublished: (guide.publishedAt ?? guide.createdAt).toISOString(),
            dateModified: guide.updatedAt.toISOString(),
            about: guide.name,
            publisher: {
                "@type": "Organization",
                name: "International Journal of Knowledge, Research and Innovation",
                url: "https://www.ijkri.org",
            },
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.ijkri.org" },
                { "@type": "ListItem", position: 2, name: "Variable Library", item: "https://www.ijkri.org/variables" },
                { "@type": "ListItem", position: 3, name: guide.name },
            ],
        },
    ];

    return (
        <main className="mx-auto max-w-4xl px-6 py-14 lg:px-8">
            <script
                type="application/ld+json"
                // Built from admin-reviewed fields; JSON.stringify escapes them.
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
                }}
            />

            <nav className="text-sm text-slate-500">
                <Link href="/variables" className="hover:underline">
                    Research Variable Library
                </Link>
                {guide.discipline ? ` · ${guide.discipline}` : ""}
            </nav>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                {pageTitle(guide.name, content.measurementType)}
            </h1>

            <p className="mt-4 text-lg leading-8 text-slate-700">{content.definition}</p>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <p className="font-semibold text-amber-950">
                    Studying {lower}? Turn it into a research topic, objectives
                    and hypotheses in minutes.
                </p>
                <Link
                    href="/toolkit"
                    className="mt-3 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-400"
                >
                    Check or build my topic free →
                </Link>
            </div>

            {content.dimensions.length ? (
                <section className="mt-10">
                    <h2 className="text-2xl font-bold">
                        Dimensions of {lower}
                    </h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="py-2 pr-4 font-semibold">Dimension / proxy</th>
                                    <th className="py-2 font-semibold">Operational definition</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.dimensions.map((d) => (
                                    <tr key={d.name} className="border-b border-slate-100 align-top">
                                        <td className="py-3 pr-4 font-medium">{d.name}</td>
                                        <td className="py-3 text-slate-700">{d.definition}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            {content.scales.length ? (
                <section className="mt-10">
                    <h2 className="text-2xl font-bold">
                        Validated scales for measuring {lower}
                    </h2>
                    <ul className="mt-4 space-y-2">
                        {content.scales.map((s) => (
                            <li key={s.name} className="rounded-lg border border-slate-200 p-4">
                                <span className="font-semibold">{s.name}</span>
                                {s.source ? <span className="text-slate-600"> — {s.source}</span> : null}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-sm text-slate-500">
                        Always confirm the items, authors and year in the
                        original source before citing a scale.
                    </p>
                </section>
            ) : null}

            {content.secondaryIndicators.length ? (
                <section className="mt-10">
                    <h2 className="text-2xl font-bold">
                        Measuring {lower} with secondary data
                    </h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="py-2 pr-4 font-semibold">Indicator</th>
                                    <th className="py-2 pr-4 font-semibold">Formula</th>
                                    <th className="py-2 font-semibold">Data source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.secondaryIndicators.map((i) => (
                                    <tr key={i.name} className="border-b border-slate-100 align-top">
                                        <td className="py-3 pr-4 font-medium">{i.name}</td>
                                        <td className="py-3 pr-4 font-mono text-xs">{i.formula}</td>
                                        <td className="py-3 text-slate-700">{i.dataSource}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            {content.exampleTopics.length ? (
                <section className="mt-10">
                    <h2 className="text-2xl font-bold">
                        Research topics on {lower}
                    </h2>
                    <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-800">
                        {content.exampleTopics.map((topic) => (
                            <li key={topic}>{topic}</li>
                        ))}
                    </ul>
                    <p className="mt-4 text-sm text-slate-600">
                        Like one of these?{" "}
                        <Link href="/toolkit" className="font-semibold underline">
                            Check it free
                        </Link>{" "}
                        and get its specific objectives, research questions and
                        hypotheses.
                    </p>
                </section>
            ) : null}

            {content.researchTips.length ? (
                <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <h2 className="text-2xl font-bold">Tips for researching {lower}</h2>
                    <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
                        {content.researchTips.map((tip) => (
                            <li key={tip}>{tip}</li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {content.relatedVariables.length ? (
                <section className="mt-10">
                    <h2 className="text-xl font-bold">Related variables</h2>
                    <p className="mt-3 text-slate-700">{content.relatedVariables.join(" · ")}</p>
                </section>
            ) : null}

            <section className="mt-12">
                <h2 className="text-2xl font-bold">Frequently asked questions</h2>
                <div className="mt-4 space-y-5">
                    {faq.map((item) => (
                        <div key={item.question}>
                            <h3 className="font-bold">{item.question}</h3>
                            <p className="mt-1 leading-7 text-slate-700">{item.answer}</p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
