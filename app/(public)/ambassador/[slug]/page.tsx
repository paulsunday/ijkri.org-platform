import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/ambassador/levels";
import { OrcidVerifiedBadge } from "@/components/ambassador/orcid-badge";

type Props = {
  params: Promise<{ slug: string }>;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

async function getProfile(slug: string) {
  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { slug, isPublicProfileEnabled: true },
    select: {
      referralCode: true,
      level: true,
      publishedReferralCount: true,
      contactEnabled: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          affiliation: true,
          country: true,
          orcid: true,
          orcidVerifiedAt: true,
          email: true,
        },
      },
      certificates: {
        where: { revoked: false },
        orderBy: { issuedAt: "desc" },
        take: 10,
        select: { title: true, issuedAt: true },
      },
    },
  });

  if (!ambassador) {
    return null;
  }

  const application = await prisma.reviewerApplication.findFirst({
    where: { userId: ambassador.user.id, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
    select: {
      department: true,
      googleScholarUrl: true,
      areasOfExpertise: true,
    },
  });

  const [referralOutcomes, recentPublished, reviewsCompleted] = await Promise.all([
    prisma.submission.groupBy({
      by: ["status"],
      where: {
        referrerReviewerId: ambassador.user.id,
        status: { in: ["PUBLISHED", "REJECTED"] },
      },
      _count: { _all: true },
    }),

    // Confidentiality: title only, never abstract/files/review content.
    prisma.submission.findMany({
      where: { referrerReviewerId: ambassador.user.id, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { title: true },
    }),

    prisma.reviewAssignment.count({
      where: { reviewerId: ambassador.user.id, status: "SUBMITTED" },
    }),
  ]);

  const published = referralOutcomes.find((row) => row.status === "PUBLISHED")?._count._all ?? 0;
  const rejected = referralOutcomes.find((row) => row.status === "REJECTED")?._count._all ?? 0;
  const decided = published + rejected;
  const acceptanceRate = decided > 0 ? Math.round((published / decided) * 100) : null;

  const yearsServing = Math.max(
    0,
    Math.floor((Date.now() - ambassador.createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000)),
  );

  return {
    ambassador,
    application,
    acceptanceRate,
    yearsServing,
    recentPublished,
    reviewsCompleted,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile) {
    return { title: "Ambassador not found" };
  }

  const { ambassador } = profile;
  const title = `${ambassador.user.name} — Reviewer Ambassador`;
  const description = `${ambassador.user.name} is a ${LEVEL_LABELS[ambassador.level]} reviewer ambassador${
    ambassador.user.affiliation ? ` at ${ambassador.user.affiliation}` : ""
  }. Submit your manuscript through their referral link.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: ambassador.user.image ? [ambassador.user.image] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function AmbassadorProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile) {
    notFound();
  }

  const {
    ambassador,
    application,
    acceptanceRate,
    yearsServing,
    recentPublished,
    reviewsCompleted,
  } = profile;
  const appUrl = getAppUrl();
  const submitUrl = `${appUrl}/author/submit?ref=${ambassador.referralCode}`;

  return (
    <main className="bg-slate-50">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex flex-wrap items-center gap-6">
            {ambassador.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ambassador.user.image}
                alt={ambassador.user.name}
                className="h-24 w-24 rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-500 text-3xl font-bold text-slate-950">
                {ambassador.user.name.charAt(0)}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold">{ambassador.user.name}</h1>

              <p className="mt-1 text-slate-300">
                {[ambassador.user.affiliation, application?.department, ambassador.user.country]
                  .filter(Boolean)
                  .join(" · ")}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-slate-950">
                  {LEVEL_LABELS[ambassador.level]}
                </span>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold">
                  Reviewer
                </span>

                <OrcidVerifiedBadge
                  orcid={ambassador.user.orcid}
                  verifiedAt={ambassador.user.orcidVerifiedAt}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-lg font-semibold text-amber-900">
            Submit Your Manuscript Through This Ambassador
          </p>
          <Link
            href={submitUrl}
            className="mt-4 inline-flex rounded-lg bg-amber-500 px-8 py-3 font-bold text-slate-950 hover:bg-amber-400"
          >
            Submit Your Manuscript
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Reviews Completed" value={reviewsCompleted} />
          <StatTile label="Published Referrals" value={ambassador.publishedReferralCount} />
          <StatTile
            label="Acceptance Rate"
            value={acceptanceRate === null ? "—" : `${acceptanceRate}%`}
          />
          <StatTile label="Years Serving" value={yearsServing} />
        </div>

        {ambassador.user.bio && (
          <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Biography</h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">{ambassador.user.bio}</p>
          </div>
        )}

        {application?.areasOfExpertise && (
          <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Areas of Expertise</h2>
            <p className="mt-2 text-slate-700">{application.areasOfExpertise}</p>
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Certificates Earned</h2>
            <div className="mt-3 space-y-2">
              {ambassador.certificates.length === 0 && (
                <p className="text-sm text-slate-500">No certificates yet.</p>
              )}
              {ambassador.certificates.map((certificate) => (
                <p key={certificate.title} className="text-sm text-slate-700">
                  {certificate.title} — {certificate.issuedAt.toLocaleDateString()}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Recent Publications Reviewed</h2>
            <div className="mt-3 space-y-2">
              {recentPublished.length === 0 && (
                <p className="text-sm text-slate-500">No published referrals yet.</p>
              )}
              {recentPublished.map((submission, index) => (
                <p key={index} className="text-sm text-slate-700">
                  {submission.title}
                </p>
              ))}
            </div>
          </div>
        </div>

        {ambassador.contactEnabled && (
          <div className="mt-8 text-center">
            <a
              href={`mailto:${ambassador.user.email}`}
              className="inline-flex rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Contact {ambassador.user.name.split(" ")[0]}
            </a>
          </div>
        )}

        {application?.googleScholarUrl && (
          <p className="mt-6 text-center">
            <a
              href={application.googleScholarUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Google Scholar Profile →
            </a>
          </p>
        )}
      </section>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-5 text-center shadow-sm">
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}
