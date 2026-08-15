import Link from "next/link";
import type { Metadata } from "next";

const reasons = [
  {
    title: "Independent double-blind peer review",
    description:
      "Every submission is assessed by qualified reviewers without revealing author or reviewer identity to each other, reducing bias in the editorial decision.",
  },
  {
    title: "Transparent editorial workflow",
    description:
      "Authors can track their manuscript through screening, review, revision, and production, with clear communication at each stage.",
  },
  {
    title: "Open-access publication",
    description:
      "Published articles are freely available online, with no subscription barrier for readers, widening the potential audience for your work.",
  },
  {
    title: "DOI assignment",
    description:
      "Accepted articles receive a Digital Object Identifier, giving your work a permanent, citable link.",
  },
  {
    title: "Professional article pages",
    description:
      "Each published article gets a dedicated page with abstract, metadata, citation formats, and a downloadable PDF.",
  },
  {
    title: "Structured revision and production process",
    description:
      "Manuscripts move through copyediting, typesetting, and proofreading before publication, following a defined production workflow.",
  },
  {
    title: "Multidisciplinary readership",
    description:
      "IJKRI publishes across management, social science, technology, education, and sustainability, connecting your research with readers outside a single narrow field.",
  },
  {
    title: "Author support throughout submission",
    description:
      "Author guidelines, submission tracking, and an editorial office contact are available at every step of the process.",
  },
];

export const metadata: Metadata = {
  title: "Why Publish With IJKRI",
  description:
    "What the International Journal of Knowledge, Research and Innovation offers authors: peer review, DOI assignment, open access, and editorial support.",
  alternates: {
    canonical: "/why-ijkri",
  },
};

export default function WhyIjkriPage() {
  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Why Publish With IJKRI
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            A transparent, supported path from submission to publication
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            The International Journal of Knowledge, Research and Innovation
            is a multidisciplinary, peer-reviewed, open-access journal.
            Here is what that means in practice for authors considering a
            submission.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/author/submit"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Submit Manuscript
            </Link>

            <Link
              href="/author-guidelines"
              className="rounded-lg border border-white/25 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              View Author Guidelines
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {reasons.map((reason) => (
            <article
              key={reason.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <div className="h-1 w-14 rounded-full bg-amber-500" />

              <h2 className="mt-5 text-xl font-bold text-slate-950">
                {reason.title}
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                {reason.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
              A note on claims
            </p>

            <p className="mt-3 leading-7 text-slate-700">
              We do not claim a journal impact factor, guaranteed acceptance,
              or membership in indexing databases we are not verifiably
              listed in. If you are evaluating IJKRI for a submission,
              review our{" "}
              <Link
                href="/publication-ethics"
                className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
              >
                publication ethics
              </Link>{" "}
              and{" "}
              <Link
                href="/peer-review"
                className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
              >
                peer review process
              </Link>
              , or{" "}
              <Link
                href="/contact"
                className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
              >
                contact the editorial office
              </Link>{" "}
              directly with questions.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-slate-950 px-8 py-12 text-white lg:px-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-bold">
                Ready to submit your manuscript?
              </h2>

              <p className="mt-4 max-w-3xl leading-7 text-slate-300">
                Review the current call for papers and author guidelines
                before you begin.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/call-for-papers"
                className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                View Call for Papers
              </Link>

              <Link
                href="/author/submit"
                className="rounded-lg border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Submit Manuscript
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
