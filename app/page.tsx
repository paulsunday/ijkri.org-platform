import Image from "next/image";
import Link from "next/link";

const journalFacts = [
  {
    label: "Review Model",
    value: "Double-blind peer review",
  },
  {
    label: "Access Model",
    value: "Open access",
  },
  {
    label: "Publisher",
    value: "Innovare Academic Publishing",
  },
  {
    label: "Publication Scope",
    value: "Multidisciplinary research and innovation",
  },
];

const manuscriptTypes = [
  "Original Research Articles",
  "Review Articles",
  "Short Communications",
  "Case Studies",
  "Conceptual Papers",
  "Technical Notes",
];

const authorInstructions = [
  "Prepare an original manuscript that has not been published or submitted elsewhere.",
  "Include a clear title, abstract, keywords, introduction, methodology, results, discussion and conclusion where applicable.",
  "Remove identifying information from the manuscript file to support double-blind peer review.",
  "Use consistent in-text citations and provide a complete reference list.",
  "Upload tables, figures and supplementary materials in clear, publication-ready formats.",
  "Confirm that every listed author approved the manuscript before submission.",
];

const reviewSteps = [
  {
    number: "01",
    title: "Initial Screening",
    description:
      "The editorial team checks relevance, completeness, originality and compliance with journal requirements.",
  },
  {
    number: "02",
    title: "Peer Review",
    description:
      "Suitable manuscripts are evaluated by independent reviewers through a double-blind review process.",
  },
  {
    number: "03",
    title: "Editorial Decision",
    description:
      "The editor considers reviewer reports and issues an acceptance, revision or rejection decision.",
  },
  {
    number: "04",
    title: "Production",
    description:
      "Accepted manuscripts proceed through copyediting, typesetting, proofreading and final publication.",
  },
];

export default function Home() {
  return (
    <main className="bg-white text-slate-950">
      <section className="overflow-hidden border-b bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-400">
              KNOWLEDGE {"\u2022"} INNOVATION {"\u2022"} IMPACT
            </p>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              International Journal of Knowledge, Research and Innovation
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              A multidisciplinary, peer-reviewed and open-access journal
              committed to publishing rigorous research, practical insights
              and innovative ideas with academic and societal relevance.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/author/submit"
                className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Submit Manuscript
              </Link>

              <Link
                href="/current-issue"
                className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
              >
                View Current Issue
              </Link>

              <Link
                href="/author-guidelines"
                className="rounded-lg px-6 py-3 font-semibold text-amber-300 transition hover:text-amber-200"
              >
                Author Guidelines {"\u2192"}
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="rounded-3xl bg-white p-6 shadow-2xl">
              <Image
                src="/logo.png"
                alt="International Journal of Knowledge, Research and Innovation logo"
                width={560}
                height={560}
                priority
                className="h-auto w-full max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-amber-50">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {journalFacts.map((fact) => (
            <article
              key={fact.label}
              className="rounded-xl border border-amber-200 bg-white p-5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                {fact.label}
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {fact.value}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">
            About IJKRI
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Advancing research across disciplines
          </h2>

          <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
            <p>
              IJKRI provides a scholarly platform for researchers,
              practitioners, educators and policy professionals to communicate
              original findings and evidence-based ideas.
            </p>

            <p>
              The journal welcomes interdisciplinary contributions in
              management, social sciences, technology, engineering, education,
              health-related management, sustainability and applied research.
            </p>

            <p>
              Every manuscript is assessed for academic quality, relevance,
              originality, ethical compliance and contribution to knowledge.
            </p>
          </div>

          <Link
            href="/aims-scope"
            className="mt-8 inline-flex font-semibold text-amber-700 hover:text-amber-800"
          >
            Read our aims and scope {"\u2192"}
          </Link>
        </div>

        <aside className="rounded-2xl border bg-slate-50 p-8">
          <h3 className="text-2xl font-bold">
            Why publish with IJKRI?
          </h3>

          <ul className="mt-6 space-y-4 text-slate-700">
            <li className="rounded-lg bg-white p-4 shadow-sm">
              Independent double-blind peer review
            </li>

            <li className="rounded-lg bg-white p-4 shadow-sm">
              Transparent editorial workflow
            </li>

            <li className="rounded-lg bg-white p-4 shadow-sm">
              Multidisciplinary readership
            </li>

            <li className="rounded-lg bg-white p-4 shadow-sm">
              Open-access publication
            </li>

            <li className="rounded-lg bg-white p-4 shadow-sm">
              Structured revision and production process
            </li>
          </ul>
        </aside>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">
              Manuscript Categories
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Types of contributions we consider
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              Authors may submit original scholarly work in several recognised
              academic formats.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {manuscriptTypes.map((type) => (
              <article
                key={type}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="mb-4 h-1 w-12 rounded bg-amber-500" />
                <h3 className="text-lg font-bold">{type}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">
              Instructions for Authors
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Prepare your manuscript correctly
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              Following the submission requirements reduces delays during
              editorial screening and peer review.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/author-guidelines"
                className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Full Author Guidelines
              </Link>

              <Link
                href="/publication-ethics"
                className="rounded-lg border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50"
              >
                Publication Ethics
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {authorInstructions.map((instruction, index) => (
              <article
                key={instruction}
                className="flex gap-4 rounded-xl border bg-white p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
                  {index + 1}
                </span>

                <p className="leading-7 text-slate-700">
                  {instruction}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
              Editorial Process
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              From submission to publication
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Each manuscript moves through a structured editorial and
              production workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {reviewSteps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
              >
                <p className="text-3xl font-bold text-amber-400">
                  {step.number}
                </p>

                <h3 className="mt-4 text-xl font-bold">
                  {step.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-300">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl bg-amber-50 px-6 py-12 text-center sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">
            Submit to IJKRI
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
            Share your research with a multidisciplinary academic audience
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700">
            Create an author account, prepare your manuscript according to the
            journal guidelines and begin your submission.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/author/submit"
              className="rounded-lg bg-amber-500 px-7 py-3 font-semibold text-slate-950 hover:bg-amber-400"
            >
              Submit Manuscript
            </Link>

            <Link
              href="/call-for-papers"
              className="rounded-lg border border-amber-700 px-7 py-3 font-semibold text-amber-800 hover:bg-amber-100"
            >
              View Call for Papers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

