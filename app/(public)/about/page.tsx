import Link from "next/link";

const coreValues = [
  {
    title: "Academic Integrity",
    description:
      "We promote honest, transparent and responsible scholarship across every stage of submission, review and publication.",
  },
  {
    title: "Research Quality",
    description:
      "Manuscripts are assessed for originality, methodological soundness, relevance and contribution to knowledge.",
  },
  {
    title: "Innovation",
    description:
      "We welcome research that offers new ideas, practical solutions, interdisciplinary perspectives and measurable impact.",
  },
  {
    title: "Global Accessibility",
    description:
      "Our open-access model is designed to make published research available to readers across institutions and countries.",
  },
];

const objectives = [
  "Provide a credible international platform for original and innovative research.",
  "Encourage multidisciplinary collaboration among researchers, practitioners and policy professionals.",
  "Support the dissemination of evidence-based findings with academic and societal relevance.",
  "Maintain a transparent, ethical and efficient peer-review and publication process.",
  "Promote scholarly visibility, knowledge exchange and practical application of research.",
];

const journalFacts = [
  {
    label: "Journal Title",
    value:
      "International Journal of Knowledge, Research and Innovation",
  },
  {
    label: "Abbreviation",
    value: "IJKRI",
  },
  {
    label: "Publisher",
    value: "Innovare Academic Publishing",
  },
  {
    label: "Access Model",
    value: "Open access",
  },
  {
    label: "Review Model",
    value: "Double-blind peer review",
  },
  {
    label: "Publication Scope",
    value: "Multidisciplinary",
  },
  {
    label: "Publication Language",
    value: "English",
  },
  {
    label: "Publication Frequency",
    value:
      "Continuous publication within scheduled issues",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
            About the Journal
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            International Journal of Knowledge, Research and Innovation
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            IJKRI is a multidisciplinary, peer-reviewed and
            open-access scholarly journal dedicated to the
            publication of rigorous research, innovative ideas
            and practical contributions with academic and
            societal relevance.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/aims-scope"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              View Aims and Scope
            </Link>

            <Link
              href="/author-guidelines"
              className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
            >
              Author Guidelines
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr]">
        <article>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Journal Overview
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            A scholarly platform for research, innovation and impact
          </h2>

          <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
            <p>
              The International Journal of Advanced Research
              and Innovation provides a platform for
              researchers, academics, professionals and policy
              practitioners to publish original research,
              reviews, conceptual studies, case analyses and
              applied innovations.
            </p>

            <p>
              The journal welcomes high-quality contributions
              from management, social sciences, education,
              technology, engineering, sustainability, health
              management and related interdisciplinary fields.
            </p>

            <p>
              Each manuscript is evaluated for originality,
              relevance, methodological quality, ethical
              compliance and contribution to scholarship or
              professional practice.
            </p>
          </div>
        </article>

        <aside className="rounded-2xl border bg-slate-50 p-8">
          <h2 className="text-2xl font-bold">
            Journal Information
          </h2>

          <dl className="mt-6 space-y-5">
            {journalFacts.map((fact) => (
              <div
                key={fact.label}
                className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0"
              >
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  {fact.label}
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-2">
          <article className="rounded-2xl border bg-white p-8 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Mission
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              To advance credible and useful scholarship
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              IJKRI exists to support the publication and
              dissemination of original, ethical and
              methodologically sound research that advances
              knowledge, informs practice and contributes to
              innovation.
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-8 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Vision
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              To become a trusted international research journal
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              Our vision is to develop IJKRI into a respected
              multidisciplinary publication recognised for
              research quality, editorial transparency,
              accessibility and meaningful scholarly impact.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Journal Objectives
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              What IJKRI seeks to achieve
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              The journal is structured around clear academic,
              ethical and publishing objectives.
            </p>
          </div>

          <div className="space-y-4">
            {objectives.map((objective, index) => (
              <article
                key={objective}
                className="flex gap-4 rounded-xl border bg-white p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
                  {index + 1}
                </span>

                <p className="leading-7 text-slate-700">
                  {objective}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
              Core Values
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Principles that guide the journal
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {coreValues.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
              >
                <h3 className="text-xl font-bold text-amber-300">
                  {value.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-300">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-2">
        <article className="rounded-2xl border bg-white p-8">
          <h2 className="text-2xl font-bold">
            Peer Review and Editorial Independence
          </h2>

          <p className="mt-4 leading-8 text-slate-700">
            IJKRI uses a double-blind peer-review process.
            Reviewers evaluate manuscripts independently, and
            editorial decisions are based on scholarly merit,
            reviewer recommendations and journal policy.
          </p>

          <p className="mt-4 leading-8 text-slate-700">
            Editors are expected to make decisions without
            improper influence from authors, reviewers,
            advertisers, sponsors or institutional interests.
          </p>

          <Link
            href="/peer-review"
            className="mt-6 inline-flex font-semibold text-amber-700 hover:underline"
          >
            Read the peer-review policy →
          </Link>
        </article>

        <article className="rounded-2xl border bg-white p-8">
          <h2 className="text-2xl font-bold">
            Open Access and Copyright
          </h2>

          <p className="mt-4 leading-8 text-slate-700">
            The journal is committed to broad access to
            scholarly work. Published articles are made
            available online according to the journal&apos;s
            open-access and licensing policies.
          </p>

          <p className="mt-4 leading-8 text-slate-700">
            Authors retain rights subject to the publication
            agreement and applicable licence. Final licensing
            details will be stated clearly on each published
            article.
          </p>
        </article>
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-3">
          <article className="rounded-2xl border border-amber-200 bg-white p-7">
            <h2 className="text-xl font-bold">
              Publication Ethics
            </h2>

            <p className="mt-4 leading-7 text-slate-700">
              IJKRI expects authors, reviewers and editors to
              follow recognised standards of research and
              publication ethics.
            </p>

            <Link
              href="/publication-ethics"
              className="mt-5 inline-flex font-semibold text-amber-700 hover:underline"
            >
              View ethics policy →
            </Link>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-white p-7">
            <h2 className="text-xl font-bold">
              DOI Registration
            </h2>

            <p className="mt-4 leading-7 text-slate-700">
              Eligible published articles may be assigned
              Digital Object Identifiers after metadata review
              and successful registration.
            </p>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-white p-7">
            <h2 className="text-xl font-bold">
              Abstracting and Indexing
            </h2>

            <p className="mt-4 leading-7 text-slate-700">
              Indexing applications and inclusion claims will
              be displayed only after confirmation by the
              relevant indexing service.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl bg-slate-950 px-6 py-12 text-center text-white sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
            Publish with IJKRI
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
            Submit research that advances knowledge and practice
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Review the journal requirements before beginning
            your submission.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/author-guidelines"
              className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
            >
              Read Author Guidelines
            </Link>

            <Link
              href="/author/submit"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Submit Manuscript
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

