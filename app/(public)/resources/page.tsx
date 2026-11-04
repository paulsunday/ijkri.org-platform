import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import type { Prisma, ResourceCategory } from "@/lib/generated/prisma";

const CATEGORY_OPTIONS = [
  { value: "RESEARCH_METHODOLOGY", label: "Research Methodology" },
  { value: "DATA_ANALYSIS", label: "Data Analysis" },
  { value: "ACADEMIC_WRITING", label: "Academic Writing" },
  { value: "PUBLISHING", label: "Publishing" },
] as const;

const FORMAT_LABELS: Record<string, string> = {
  ARTICLE: "Article",
  GUIDE: "Guide",
  TEMPLATE: "Template",
  VIDEO: "Video",
};

function categoryLabel(value: string) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label ||
    value
  );
}

export const metadata: Metadata = {
  title: "Research Resources",
  description:
    "Guides on research methodology, data analysis, academic writing, and publishing from IJKRI.",
  alternates: {
    canonical: "/resources",
  },
};

type ResourcesPageProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function ResourcesPage({
  searchParams,
}: ResourcesPageProps) {
  const { category, q } = await searchParams;

  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const searchQuery = q?.trim() || "";

  const selectedCategory =
    category &&
    CATEGORY_OPTIONS.some((option) => option.value === category)
      ? category
      : "";

  const where: Prisma.ResourceGuideWhereInput = journal
    ? {
        journalId: journal.id,
        isPublished: true,
        ...(selectedCategory
          ? { category: selectedCategory as ResourceCategory }
          : {}),
        ...(searchQuery
          ? {
              OR: [
                {
                  title: {
                    contains: searchQuery,
                    mode: "insensitive",
                  },
                },
                {
                  summary: {
                    contains: searchQuery,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      }
    : { id: "__none__" };

  const resources = journal
    ? await prisma.resourceGuide.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      })
    : [];

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Research Resources
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Guides for stronger research and writing
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Practical guidance on research methodology, data analysis,
            academic writing, and publishing — curated by the IJKRI
            editorial team.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-6 rounded-2xl border border-amber-200 bg-amber-50 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                New
              </p>

              <h2 className="mt-2 text-2xl font-bold text-amber-950">
                Topic Formulation Workbench
              </h2>

              <p className="mt-2 max-w-2xl text-amber-900">
                Check your research topic for missing variables, scope
                problems, and vague phrasing; auto-generate your
                objectives, research questions, and hypotheses; find
                unstudied variable/sector/location combinations; and
                reserve your topic with a timestamped first claim. Check
                your topic and preview your objectives free.
              </p>
            </div>

            <Link
              href="/toolkit"
              className="shrink-0 rounded-lg bg-amber-500 px-6 py-3 text-center font-bold text-slate-950 hover:bg-amber-400"
            >
              Try it free →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/resources"
              className={
                !selectedCategory
                  ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-950"
              }
            >
              All Resources
            </Link>

            {CATEGORY_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={`/resources?category=${option.value}`}
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

          <form
            method="get"
            className="mt-5 flex max-w-md gap-3"
          >
            {selectedCategory && (
              <input
                type="hidden"
                name="category"
                value={selectedCategory}
              />
            )}

            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search resources"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {resources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              No resources found
            </h2>

            <p className="mt-3 text-slate-600">
              Try a different category or search term.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <article
                key={resource.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                    {FORMAT_LABELS[resource.format] || resource.format}
                  </span>

                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {categoryLabel(resource.category)}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  {resource.title}
                </h2>

                <p className="mt-3 flex-1 leading-7 text-slate-600">
                  {resource.summary}
                </p>

                {resource.body ? (
                  <Link
                    href={`/resources/${resource.slug}`}
                    className="mt-5 inline-flex font-semibold text-amber-700 hover:text-amber-900"
                  >
                    Read guide →
                  </Link>
                ) : resource.externalUrl ? (
                  <a
                    href={resource.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex font-semibold text-amber-700 hover:text-amber-900"
                  >
                    Open resource →
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
