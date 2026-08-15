import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  RESEARCH_METHODS: "Research Methods",
  ACADEMIC_WRITING: "Academic Writing",
  STATISTICS: "Statistics",
  PUBLISHING: "Publishing",
  RESEARCH_ETHICS: "Research Ethics",
  INNOVATION: "Innovation",
  MANAGEMENT: "Management",
  BUSINESS: "Business",
  TECHNOLOGY: "Technology",
};

function formatDate(value: Date | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

type InsightPageProps = {
  params: Promise<{ slug: string }>;
};

async function getInsight(slug: string) {
  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!journal) {
    return null;
  }

  const insight = await prisma.insight.findUnique({
    where: {
      journalId_slug: {
        journalId: journal.id,
        slug,
      },
    },
  });

  if (!insight || !insight.isPublished) {
    return null;
  }

  return insight;
}

export async function generateMetadata({
  params,
}: InsightPageProps): Promise<Metadata> {
  const { slug } = await params;
  const insight = await getInsight(slug);

  if (!insight) {
    return { title: "Insight Not Found" };
  }

  return {
    title: insight.title,
    description: insight.excerpt,
    alternates: {
      canonical: `/insights/${insight.slug}`,
    },
  };
}

export default async function InsightDetailPage({
  params,
}: InsightPageProps) {
  const { slug } = await params;
  const insight = await getInsight(slug);

  if (!insight) {
    notFound();
  }

  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
          <Link
            href="/insights"
            className="text-sm font-semibold text-amber-400 hover:text-amber-300"
          >
            ← Back to Research Insights
          </Link>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-300">
            Editorial content — not peer-reviewed
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {CATEGORY_LABELS[insight.category] || insight.category}
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {insight.title}
          </h1>

          <div className="mt-5 flex items-center gap-3 text-sm text-slate-300">
            <span>{insight.authorName || "IJKRI Editorial Team"}</span>
            <span aria-hidden="true">•</span>
            <span>{formatDate(insight.publishedAt)}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        {insight.coverImage && (
          <img
            src={insight.coverImage}
            alt={insight.title}
            className="mb-10 w-full rounded-2xl border object-cover"
          />
        )}

        <div className="whitespace-pre-wrap leading-8 text-slate-700">
          {insight.body}
        </div>
      </section>
    </main>
  );
}
