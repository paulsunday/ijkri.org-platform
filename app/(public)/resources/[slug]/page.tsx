import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  RESEARCH_METHODOLOGY: "Research Methodology",
  DATA_ANALYSIS: "Data Analysis",
  ACADEMIC_WRITING: "Academic Writing",
  PUBLISHING: "Publishing",
};

const FORMAT_LABELS: Record<string, string> = {
  ARTICLE: "Article",
  GUIDE: "Guide",
  TEMPLATE: "Template",
  VIDEO: "Video",
};

type ResourcePageProps = {
  params: Promise<{ slug: string }>;
};

async function getResource(slug: string) {
  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!journal) {
    return null;
  }

  const resource = await prisma.resourceGuide.findUnique({
    where: {
      journalId_slug: {
        journalId: journal.id,
        slug,
      },
    },
  });

  if (!resource || !resource.isPublished || !resource.body) {
    return null;
  }

  return resource;
}

export async function generateMetadata({
  params,
}: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = await getResource(slug);

  if (!resource) {
    return { title: "Resource Not Found" };
  }

  return {
    title: resource.title,
    description: resource.summary,
    alternates: {
      canonical: `/resources/${resource.slug}`,
    },
  };
}

export default async function ResourceDetailPage({
  params,
}: ResourcePageProps) {
  const { slug } = await params;
  const resource = await getResource(slug);

  if (!resource) {
    notFound();
  }

  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
          <Link
            href="/resources"
            className="text-sm font-semibold text-amber-400 hover:text-amber-300"
          >
            ← Back to Research Resources
          </Link>

          <div className="mt-6 flex items-center gap-2">
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
              {FORMAT_LABELS[resource.format] || resource.format}
            </span>

            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {CATEGORY_LABELS[resource.category] || resource.category}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {resource.title}
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            {resource.summary}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <div className="whitespace-pre-wrap leading-8 text-slate-700">
          {resource.body}
        </div>

        {resource.externalUrl && (
          <a
            href={resource.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            View related external resource →
          </a>
        )}
      </section>
    </main>
  );
}
