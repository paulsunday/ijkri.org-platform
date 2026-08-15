import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Researcher Community",
  description:
    "Meet IJKRI's editorial board, recently published authors, and featured reviewer ambassadors.",
  alternates: {
    canonical: "/community",
  },
};

export default async function CommunityPage() {
  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const [boardMembers, recentArticles, featuredReviewers] = journal
    ? await Promise.all([
        prisma.editorialBoardMember.findMany({
          where: { journalId: journal.id },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 6,
        }),
        prisma.article.findMany({
          where: { journalId: journal.id, status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 8,
          select: {
            slug: true,
            title: true,
            publishedAt: true,
            authors: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: {
                fullName: true,
                affiliation: true,
                country: true,
              },
            },
          },
        }),
        prisma.reviewerAmbassador.findMany({
          where: {
            journalId: journal.id,
            isPublicProfileEnabled: true,
            slug: { not: null },
            status: "ACTIVE",
          },
          orderBy: { publishedReferralCount: "desc" },
          take: 6,
          select: {
            slug: true,
            level: true,
            publishedReferralCount: true,
            user: {
              select: { name: true, affiliation: true, country: true },
            },
          },
        }),
      ])
    : [[], [], []];

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Researcher Community
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            The people behind IJKRI
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Editorial board members, recently published authors, and
            reviewers who have chosen to share a public profile.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-950">
            Editorial Board
          </h2>

          <Link
            href="/editorial-board"
            className="font-semibold text-amber-700 hover:text-amber-900"
          >
            View full editorial board →
          </Link>
        </div>

        {boardMembers.length === 0 ? (
          <p className="mt-6 text-slate-600">
            Editorial board information will appear here soon.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boardMembers.map((member) => (
              <article
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
                  {member.role || "Editorial Board Member"}
                </p>

                <h3 className="mt-2 text-lg font-bold text-slate-950">
                  {member.name}
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  {member.affiliation || "Affiliation not provided"}
                  {member.country ? ` · ${member.country}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-950">
              Recently Published Authors
            </h2>

            <Link
              href="/archives"
              className="font-semibold text-amber-700 hover:text-amber-900"
            >
              Browse the archives →
            </Link>
          </div>

          {recentArticles.length === 0 ? (
            <p className="mt-6 text-slate-600">
              Published articles will appear here once available.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recentArticles.map((article) => {
                const author = article.authors[0];

                return (
                  <Link
                    key={article.slug}
                    href={`/articles/${article.slug}`}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <p className="text-sm font-bold text-slate-950">
                      {author?.fullName || "Author information unavailable"}
                    </p>

                    {author?.affiliation && (
                      <p className="mt-1 text-xs text-slate-500">
                        {author.affiliation}
                        {author.country ? ` · ${author.country}` : ""}
                      </p>
                    )}

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
                      {article.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-950">
            Featured Reviewers
          </h2>

          <Link
            href="/leaderboard"
            className="font-semibold text-amber-700 hover:text-amber-900"
          >
            View full leaderboard →
          </Link>
        </div>

        {featuredReviewers.length === 0 ? (
          <p className="mt-6 text-slate-600">
            Reviewers who choose to share a public profile will appear
            here.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredReviewers.map((reviewer) => (
              <Link
                key={reviewer.slug}
                href={`/ambassador/${reviewer.slug}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-slate-950">
                  {reviewer.user.name}
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  {reviewer.user.affiliation || "Affiliation not provided"}
                  {reviewer.user.country
                    ? ` · ${reviewer.user.country}`
                    : ""}
                </p>

                <p className="mt-3 text-sm font-semibold text-amber-700">
                  {reviewer.publishedReferralCount} published referral
                  {reviewer.publishedReferralCount === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold text-slate-950">
              Join the community
            </h2>

            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-700">
              Submit your research, apply to review, or take part in the
              reviewer ambassador programme.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/author/submit"
                className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Submit Manuscript
              </Link>

              <Link
                href="/reviewer/apply"
                className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:border-slate-950"
              >
                Become a Reviewer
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
