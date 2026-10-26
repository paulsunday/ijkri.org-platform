import Link from "next/link";

import { getStaticPageOverride } from "@/lib/static-pages/get-static-page";
import { StaticPageOverrideView } from "@/components/static-pages/StaticPageOverrideView";
import type { Metadata } from "next";

const LAST_UPDATED = "August 15, 2026";

const sections = [
  {
    title: "1. Acceptance of these terms",
    body: (
      <>
        <p>
          These Terms of Use govern your access to and use of the
          International Journal of Knowledge, Research and Innovation
          (IJKRI) platform, published by Innovare Academic Publishing. By
          creating an account, submitting a manuscript, reviewing a
          manuscript, or otherwise using the platform, you agree to these
          terms.
        </p>

        <p>
          If you do not agree to these terms, please do not use the
          platform.
        </p>
      </>
    ),
  },
  {
    title: "2. Accounts and eligibility",
    body: (
      <>
        <p>
          You must provide accurate registration information and keep
          your account credentials confidential. You are responsible for
          all activity that occurs under your account.
        </p>

        <p>
          Accounts are personal to the individual who registered them.
          Authors, reviewers, and editors must use their own identity —
          shared or fabricated accounts are not permitted.
        </p>
      </>
    ),
  },
  {
    title: "3. Manuscript submission and publication",
    body: (
      <>
        <p>
          By submitting a manuscript, you confirm that the work is
          original, that you have the right to submit it, and that it is
          not under consideration elsewhere, consistent with our{" "}
          <Link
            href="/publication-ethics"
            className="font-semibold text-amber-700 hover:underline"
          >
            publication ethics
          </Link>{" "}
          policy.
        </p>

        <p>
          Manuscripts are subject to editorial screening and peer review
          as described in our{" "}
          <Link
            href="/peer-review"
            className="font-semibold text-amber-700 hover:underline"
          >
            peer review process
          </Link>
          . Submission does not guarantee acceptance or publication, and
          the editorial team retains full discretion over editorial
          decisions.
        </p>

        <p>
          Once an article is published, it becomes part of the permanent
          scholarly record and is not withdrawn from the archive except
          through a formal correction, expression of concern, or
          retraction, in line with standard academic publishing practice.
        </p>
      </>
    ),
  },
  {
    title: "4. Intellectual property and licensing",
    body: (
      <>
        <p>
          Authors retain the rights described in their publication
          agreement and the licence applied to their published article.
          You must own or have permission to use all material you submit,
          including third-party figures, data, or excerpts.
        </p>

        <p>
          Platform content that is not a published article — including
          the site design, branding, and editorial content such as
          Research Insights — remains the property of Innovare Academic
          Publishing or its licensors and may not be reproduced without
          permission, except as permitted by the licence on an individual
          published article.
        </p>
      </>
    ),
  },
  {
    title: "5. Fees and payments",
    body: (
      <p>
        Any article processing charge, subscription, or article purchase
        price is stated before payment is requested and processed through
        our payment provider. Editorial decisions are made independently
        of an author&apos;s ability to pay.
      </p>
    ),
  },
  {
    title: "6. Prohibited conduct",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Submitting fabricated, falsified, or plagiarised work.</li>
        <li>
          Attempting to manipulate the peer review process, including
          impersonating a reviewer or reviewing your own work.
        </li>
        <li>
          Using the platform to upload malicious files or attempt
          unauthorised access to other accounts or systems.
        </li>
        <li>
          Harassing, discriminating against, or acting abusively toward
          other users, reviewers, or editorial staff.
        </li>
      </ul>
    ),
  },
  {
    title: "7. Disclaimers and limitation of liability",
    body: (
      <>
        <p>
          The platform is provided on an &ldquo;as is&rdquo; basis.
          While we take reasonable steps to keep the platform available
          and accurate, we do not guarantee uninterrupted access or that
          published content is free of error.
        </p>

        <p>
          To the fullest extent permitted by applicable law, Innovare
          Academic Publishing is not liable for indirect, incidental, or
          consequential damages arising from your use of the platform.
        </p>
      </>
    ),
  },
  {
    title: "8. Changes to these terms",
    body: (
      <p>
        We may update these terms from time to time. Material changes
        will be reflected by updating the &ldquo;Last updated&rdquo;
        date above. Continued use of the platform after an update
        constitutes acceptance of the revised terms.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms governing use of the IJKRI journal platform, submissions, and published content.",
  alternates: {
    canonical: "/terms",
  },
};

export default async function TermsPage() {
  const override = await getStaticPageOverride("TERMS");

  if (override) {
    return <StaticPageOverrideView override={override} />;
  }

  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Terms of Use
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Terms governing use of the IJKRI platform
          </h1>

          <p className="mt-5 max-w-2xl leading-8 text-slate-300">
            Please read these terms carefully before creating an account,
            submitting a manuscript, or using the platform in any other
            capacity.
          </p>

          <p className="mt-4 text-sm text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">
          These terms describe the platform&apos;s intended operation in
          plain language. They are not a substitute for formal legal
          advice; the publisher should have this document reviewed by
          qualified legal counsel for the jurisdictions in which it
          operates before relying on it as a binding legal agreement.
        </div>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-2xl font-bold text-slate-950">
                {section.title}
              </h2>

              <div className="mt-4 space-y-4 leading-7 text-slate-700">
                {section.body}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-950">
            Questions about these terms?
          </h2>

          <p className="mt-3 text-slate-600">
            Contact the editorial office for any question about these
            terms.
          </p>

          <Link
            href="/contact"
            className="mt-6 inline-flex rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Contact the Journal
          </Link>
        </div>
      </section>
    </main>
  );
}
