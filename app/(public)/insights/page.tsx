import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import type { InsightCategory } from "@/lib/generated/prisma";

const CATEGORY_OPTIONS = [
  { value: "RESEARCH_METHODS", label: "Research Methods" },
  { value: "ACADEMIC_WRITING", label: "Academic Writing" },
  { value: "STATISTICS", label: "Statistics" },
  { value: "PUBLISHING", label: "Publishing" },
  { value: "RESEARCH_ETHICS", label: "Research Ethics" },
  { value: "INNOVATION", label: "Innovation" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "BUSINESS", label: "Business" },
  { value: "TECHNOLOGY", label: "Technology" },
] as const;

function categoryLabel(value: string) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label ||
    value
  );
}

function formatDate(value: Date | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export const metadata: Metadata = {
  title: "Research Insights",
  description:
    "Practical guidance on research methods, academic writing, statistics, and publishing from the IJKRI editorial team. Editorial content, not peer-reviewed research.",
  alternates: {
    canonical: "/insights",
  },
};

type InsightsPageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function InsightsPage({
  searchParams,
}: InsightsPageProps) {
  const { category } = await searchParams;

  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const selectedCategory =
    category &&
    CATEGORY_OPTIONS.some((option) => option.value === category)
      ? category
      : "";

  const insights = journal
    ? await prisma.insight.findMany({
        where: {
          journalId: journal.id,
          isPublished: true,
          ...(selectedCategory
            ? { category: selectedCategory as InsightCategory }
            : {}),
        },
        orderBy: { publishedAt: "desc" },
      })
    : [];

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Research Insights
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Practical guidance from the IJKRI editorial team
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Short, practical articles on research methods, academic
            writing, statistics, and publishing.{" "}
            <strong className="text-white">
              This is editorial content, not peer-reviewed research
            </strong>{" "}
            — for published journal articles, see the{" "}
            <Link
              href="/current-issue"
              className="underline underline-offset-2 hover:text-amber-300"
            >
              current issue
            </Link>{" "}
            and{" "}
            <Link
              href="/archives"
              className="underline underline-offset-2 hover:text-amber-300"
            >
              archives
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/insights"
              className={
                !selectedCategory
                  ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-950"
              }
            >
              All Insights
            </Link>

            {CATEGORY_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={`/insights?category=${option.value}`}
                className={
                  selectedCategory === option.value
                    ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-950"
                }
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              No insights found
            </h2>

            <p className="mt-3 text-slate-600">
              Try a different category, or check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight) => (
              <article
                key={insight.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                  {categoryLabel(insight.category)}
                </span>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  {insight.title}
                </h2>

                <p className="mt-3 flex-1 leading-7 text-slate-600">
                  {insight.excerpt}
                </p>

                <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
                  <span>
                    {insight.authorName || "IJKRI Editorial Team"}
                  </span>

                  <span>{formatDate(insight.publishedAt)}</span>
                </div>

                <Link
                  href={`/insights/${insight.slug}`}
                  className="mt-4 inline-flex font-semibold text-amber-700 hover:text-amber-900"
                >
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
