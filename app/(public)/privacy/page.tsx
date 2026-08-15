import Link from "next/link";
import type { Metadata } from "next";

const LAST_UPDATED = "August 15, 2026";

const dataCategories = [
  {
    title: "Account information",
    description:
      "Name, email address, affiliation, country, and password (stored as a salted hash, never in plain text) when you register as an author, reviewer, editor, or other platform user.",
  },
  {
    title: "Submission content",
    description:
      "Manuscript files, metadata, author lists, keywords, cover letters, and any supporting documents you upload as part of a submission or peer review.",
  },
  {
    title: "Payment information",
    description:
      "Article processing charges, subscriptions, and article purchases are processed by Paystack. We store transaction records and status, but card details are handled directly by Paystack and are not stored on our servers.",
  },
  {
    title: "Newsletter subscription",
    description:
      "If you subscribe to the IJKRI Research Update, we store the email address you provide and your subscription status until you unsubscribe.",
  },
  {
    title: "Technical and usage data",
    description:
      "Session cookies required for sign-in, and aggregate, privacy-preserving analytics (Vercel Analytics and Speed Insights) used to understand site performance and usage.",
  },
];

const usePurposes = [
  "Operating your account and the manuscript submission, peer review, and publication workflow.",
  "Processing payments for article processing charges, subscriptions, and article purchases.",
  "Sending transactional emails, such as submission status updates, review invitations, and account notifications.",
  "Sending the IJKRI Research Update newsletter, if you have subscribed, with an unsubscribe link in every email.",
  "Maintaining the security, integrity, and availability of the platform, including error monitoring.",
  "Complying with legal, editorial, and record-keeping obligations, including maintaining the scholarly record for published articles.",
];

const thirdParties = [
  {
    title: "Paystack",
    description:
      "Processes payments for article processing charges, subscriptions, and article purchases.",
  },
  {
    title: "Resend",
    description:
      "Delivers transactional and notification emails on our behalf.",
  },
  {
    title: "Sentry",
    description:
      "Provides error monitoring to help us detect and fix technical issues.",
  },
  {
    title: "Vercel",
    description:
      "Hosts the platform and provides privacy-preserving analytics and performance monitoring.",
  },
];

const userRights = [
  "Request a copy of the personal data we hold about you.",
  "Ask us to correct inaccurate or incomplete information.",
  "Ask us to delete your account information, subject to our need to retain editorial and publication records.",
  "Unsubscribe from the newsletter at any time using the link in every email.",
  "Object to or request that we restrict certain uses of your data.",
];

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How IJKRI collects, uses, and protects personal data across the journal platform.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Privacy Policy
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            How we handle your personal data
          </h1>

          <p className="mt-5 max-w-2xl leading-8 text-slate-300">
            This policy explains what personal data the International
            Journal of Knowledge, Research and Innovation (IJKRI)
            collects, why, and how you can exercise control over it.
          </p>

          <p className="mt-4 text-sm text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">
          This policy describes the data practices of the IJKRI
          platform in plain language. It is not a substitute for
          formal legal advice; the publisher should have this policy
          reviewed by qualified legal counsel for the jurisdictions in
          which it operates before relying on it for regulatory
          compliance.
        </div>

        <h2 className="mt-12 text-2xl font-bold text-slate-950">
          Information we collect
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {dataCategories.map((category) => (
            <article
              key={category.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-slate-950">
                {category.title}
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                {category.description}
              </p>
            </article>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold text-slate-950">
          How we use this information
        </h2>

        <ul className="mt-6 space-y-3">
          {usePurposes.map((purpose) => (
            <li key={purpose} className="flex gap-3 leading-7 text-slate-700">
              <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span>{purpose}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-14 text-2xl font-bold text-slate-950">
          Third parties we work with
        </h2>

        <p className="mt-4 leading-7 text-slate-700">
          We share the minimum data necessary with the following service
          providers to operate the journal. We do not sell personal data.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {thirdParties.map((party) => (
            <article
              key={party.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-slate-950">
                {party.title}
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                {party.description}
              </p>
            </article>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold text-slate-950">
          Data retention
        </h2>

        <p className="mt-4 leading-7 text-slate-700">
          We retain account and submission data for as long as your
          account is active and as needed to maintain the scholarly
          record of published articles, comply with legal obligations,
          resolve disputes, and enforce our policies. Newsletter
          subscriber data is retained until you unsubscribe.
        </p>

        <h2 className="mt-14 text-2xl font-bold text-slate-950">
          Your rights
        </h2>

        <ul className="mt-6 space-y-3">
          {userRights.map((right) => (
            <li key={right} className="flex gap-3 leading-7 text-slate-700">
              <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span>{right}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 leading-7 text-slate-700">
          Note that published articles form part of the permanent
          scholarly record and are not removed from the archive once
          published, in line with standard academic publishing practice
          and our{" "}
          <Link
            href="/publication-ethics"
            className="font-semibold text-amber-700 hover:underline"
          >
            publication ethics
          </Link>{" "}
          policy.
        </p>

        <h2 className="mt-14 text-2xl font-bold text-slate-950">
          Cookies
        </h2>

        <p className="mt-4 leading-7 text-slate-700">
          We use a session cookie that is required to keep you signed
          in, and privacy-preserving, aggregate analytics that do not
          rely on cross-site tracking cookies.
        </p>

        <h2 className="mt-14 text-2xl font-bold text-slate-950">
          Changes to this policy
        </h2>

        <p className="mt-4 leading-7 text-slate-700">
          We may update this policy from time to time. Material changes
          will be reflected by updating the &ldquo;Last updated&rdquo;
          date above.
        </p>

        <div className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-950">
            Questions about your data?
          </h2>

          <p className="mt-3 text-slate-600">
            Contact the editorial office for any privacy-related request.
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
