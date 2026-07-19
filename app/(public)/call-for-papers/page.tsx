import Link from "next/link";

const submissionTypes = [
  {
    title: "Original Research Articles",
    description:
      "Empirical and theoretical studies that present original findings, robust analysis, and a clear contribution to knowledge.",
  },
  {
    title: "Review Articles",
    description:
      "Systematic, scoping, integrative, and critical reviews that synthesise existing literature and identify meaningful research gaps.",
  },
  {
    title: "Conceptual Papers",
    description:
      "Scholarly papers that develop new frameworks, models, propositions, or perspectives grounded in established literature.",
  },
  {
    title: "Case Studies",
    description:
      "Well-documented organisational, sectoral, institutional, or policy cases with clear lessons for research and practice.",
  },
];

const journalStrengths = [
  "Rigorous double-blind peer review",
  "International and multidisciplinary readership",
  "Transparent editorial decision process",
  "Permanent online publication and archiving",
  "Support for original and practice-relevant scholarship",
  "Clear author guidance throughout the publication process",
];

const submissionChecklist = [
  "The manuscript is original and is not under review elsewhere.",
  "The paper follows the journal’s author guidelines and formatting requirements.",
  "The title, abstract, keywords, and references are complete.",
  "All authors have approved the final manuscript and author order.",
  "Conflicts of interest, funding, and ethical approval are disclosed where applicable.",
  "Tables, figures, appendices, and supplementary materials are properly labelled.",
];

const publicationSteps = [
  {
    number: "01",
    title: "Submission",
    description:
      "Authors create an account, complete the submission form, and upload the manuscript and supporting documents.",
  },
  {
    number: "02",
    title: "Editorial Screening",
    description:
      "The editorial office checks the manuscript for relevance, completeness, originality, and compliance with journal policies.",
  },
  {
    number: "03",
    title: "Peer Review",
    description:
      "Suitable manuscripts are assigned to qualified reviewers through a double-blind review process.",
  },
  {
    number: "04",
    title: "Decision and Revision",
    description:
      "Authors receive an editorial decision and, where required, submit a revised manuscript and response to reviewers.",
  },
  {
    number: "05",
    title: "Production and Publication",
    description:
      "Accepted papers proceed through copyediting, typesetting, proofreading, final approval, and publication.",
  },
];

export default function CallForPapersPage() {
  return (
    <main className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
              Call for Papers
            </p>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Share research that advances knowledge, innovation, and practice
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              The International Journal of Knowledge, Research and Innovation
              invites researchers, academics, professionals, and postgraduate
              scholars to submit high-quality manuscripts for consideration in
              forthcoming issues.
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
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Review model
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              Double-blind peer review
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Access model
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              Open scholarly access
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Submission
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              Online manuscript system
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Audience
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              International and multidisciplinary
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
              Current invitation
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Manuscripts are invited for upcoming issues
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              IJKRI welcomes original, methodologically sound, and ethically
              conducted scholarship that contributes to research, policy,
              management, innovation, education, technology, development, and
              related areas.
            </p>

            <p className="mt-4 leading-7 text-slate-700">
              Submissions should demonstrate a clear problem, appropriate
              methodology, strong engagement with relevant literature, and
              practical or theoretical significance. Interdisciplinary studies
              and research addressing emerging issues are particularly
              encouraged.
            </p>
          </div>

          <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
              Before you submit
            </p>

            <h3 className="mt-3 text-2xl font-bold text-slate-950">
              Prepare your manuscript carefully
            </h3>

            <p className="mt-4 leading-7 text-slate-700">
              Authors should review the journal scope, ethical policies,
              formatting rules, and submission checklist before uploading their
              manuscript.
            </p>

            <Link
              href="/author-guidelines"
              className="mt-6 inline-flex font-semibold text-amber-800 hover:text-amber-950"
            >
              Read the complete author guidelines →
            </Link>
          </aside>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
              Manuscript categories
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Types of submissions considered
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {submissionTypes.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="h-1 w-14 rounded-full bg-amber-500" />

                <h3 className="mt-5 text-xl font-bold text-slate-950">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl bg-slate-950 p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-400">
            Why publish with IJKRI
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            A professional pathway from submission to publication
          </h2>

          <div className="mt-8 space-y-4">
            {journalStrengths.map((strength) => (
              <div key={strength} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-slate-950">
                  ✓
                </span>

                <p className="leading-7 text-slate-300">{strength}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
            Submission checklist
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-950">
            Confirm these requirements before submission
          </h2>

          <div className="mt-8 space-y-4">
            {submissionChecklist.map((item) => (
              <div key={item} className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <p className="leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
              Publication workflow
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              What happens after submission
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-5">
            {publicationSteps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-3xl font-bold text-amber-500">{step.number}</p>

                <h3 className="mt-4 text-lg font-bold text-slate-950">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-slate-950 px-8 py-12 text-white lg:px-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-400">
                Ready to contribute?
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Submit your manuscript for editorial consideration
              </h2>

              <p className="mt-4 max-w-3xl leading-7 text-slate-300">
                Ensure that your submission is complete, original, and prepared
                in accordance with the journal’s author guidelines.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/author/submit"
                className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Submit Manuscript
              </Link>

              <Link
                href="/contact"
                className="rounded-lg border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Contact Editorial Office
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}