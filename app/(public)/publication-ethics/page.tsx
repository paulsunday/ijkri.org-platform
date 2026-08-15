import Link from "next/link";

const authorResponsibilities = [
  "Submit only original work that has not been published or submitted elsewhere.",
  "Present research honestly without fabrication, falsification, or inappropriate data manipulation.",
  "Accurately acknowledge all contributors and list only eligible authors.",
  "Disclose funding sources and any potential conflicts of interest.",
  "Obtain ethical approval where research involves humans, animals, or sensitive data.",
  "Promptly notify the editorial office if a significant error is discovered after submission or publication.",
];

const editorResponsibilities = [
  "Evaluate manuscripts solely on academic merit without discrimination.",
  "Maintain confidentiality throughout the editorial and peer-review process.",
  "Manage conflicts of interest transparently.",
  "Ensure fair, timely, and objective editorial decisions.",
  "Take appropriate action in cases of suspected research misconduct.",
];

const reviewerResponsibilities = [
  "Provide objective, constructive, and evidence-based reviews.",
  "Maintain strict confidentiality of submitted manuscripts.",
  "Declare any conflicts of interest before accepting a review invitation.",
  "Complete reviews within the agreed timeframe.",
  "Identify relevant literature that has not been cited where appropriate.",
];

const ethicsPolicies = [
  {
    title: "Plagiarism",
    description:
      "All submissions are screened for originality. Manuscripts containing plagiarism, self-plagiarism, or unattributed material will be rejected.",
  },
  {
    title: "Duplicate Submission",
    description:
      "Authors must not submit the same manuscript simultaneously to multiple journals or conferences.",
  },
  {
    title: "Conflict of Interest",
    description:
      "Authors, reviewers, and editors must disclose any financial, institutional, or personal relationships that could influence editorial decisions.",
  },
  {
    title: "Research Integrity",
    description:
      "Fabrication, falsification, manipulation of images or data, and unethical research practices are strictly prohibited.",
  },
  {
    title: "Corrections & Retractions",
    description:
      "Where necessary, the journal will publish corrections, expressions of concern, or retractions to maintain the integrity of the scholarly record.",
  },
  {
    title: "AI-Assisted Writing",
    description:
      "Artificial intelligence tools may assist writing but must not replace human authorship. Authors remain fully responsible for the accuracy, originality, and integrity of their work.",
  },
];

const trustPolicies = [
  {
    title: "Editorial Independence",
    description:
      "Editorial decisions are based solely on academic merit, peer-review outcomes, and journal policy. Commercial or publisher interests do not influence acceptance or rejection decisions.",
  },
  {
    title: "Complaints & Appeals",
    description:
      "Authors, reviewers, or readers may raise a reasoned complaint or appeal regarding an editorial decision or process by contacting the editorial office. Each case is reviewed on its merits; disagreement alone does not guarantee reconsideration.",
  },
  {
    title: "Data Availability",
    description:
      "Authors are expected to include a data-availability statement describing whether underlying research data are publicly available, restricted, or available on reasonable request.",
  },
  {
    title: "Archiving",
    description:
      "Published articles are retained on the journal platform for permanent online access, with their assigned DOI providing a stable, citable link to the published version of record.",
  },
  {
    title: "Copyright & Licensing",
    description:
      "Authors must own or have permission to use all submitted material. The publication agreement states the rights retained by authors and the licence applied to the final published article.",
  },
];

export default function PublicationEthicsPage() {
  return (
    <main className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
              Publication Ethics
            </p>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Upholding integrity, transparency, and responsible scholarly publishing
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              The International Journal of Knowledge, Research and Innovation
              (IJKRI) is committed to maintaining the highest standards of
              publication ethics and follows internationally recognised best
              practices to ensure the credibility and integrity of the scholarly
              record.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Editorial Policy
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              Fair and impartial review
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Ethics Standard
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              International best practice
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Review Process
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              Double-blind peer review
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Research Integrity
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              Zero tolerance for misconduct
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
              Our Commitment
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Ethical publishing is the foundation of scholarly communication
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              IJKRI expects authors, reviewers, editors, and publishers to
              uphold honesty, transparency, accountability, confidentiality,
              and respect throughout the publication process. Every manuscript
              is assessed solely on academic merit without discrimination.
            </p>

            <p className="mt-4 leading-7 text-slate-700">
              Allegations of plagiarism, duplicate publication, fabricated
              research, image manipulation, citation manipulation, or any other
              form of research misconduct are investigated thoroughly before
              editorial decisions are made.
            </p>
          </div>

          <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <h3 className="text-2xl font-bold text-slate-950">
              Principles
            </h3>

            <div className="mt-6 space-y-4">
              {[
                "Integrity",
                "Transparency",
                "Confidentiality",
                "Fairness",
                "Accountability",
                "Research Quality",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 font-bold text-slate-950">
                    ✓
                  </span>

                  <p>{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-2xl border p-8">
              <h2 className="text-2xl font-bold">Authors</h2>

              <ul className="mt-6 space-y-3 text-slate-700">
                {authorResponsibilities.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border p-8">
              <h2 className="text-2xl font-bold">Editors</h2>

              <ul className="mt-6 space-y-3 text-slate-700">
                {editorResponsibilities.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border p-8">
              <h2 className="text-2xl font-bold">Reviewers</h2>

              <ul className="mt-6 space-y-3 text-slate-700">
                {reviewerResponsibilities.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
            Journal Policies
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-950">
            Ethical standards applied throughout publication
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {ethicsPolicies.map((policy) => (
            <article
              key={policy.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <div className="h-1 w-14 rounded-full bg-amber-500" />

              <h3 className="mt-5 text-xl font-bold">
                {policy.title}
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                {policy.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
              Trust &amp; Transparency
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              How the journal is governed and how the record is protected
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trustPolicies.map((policy) => (
              <article
                key={policy.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="h-1 w-14 rounded-full bg-amber-500" />

                <h3 className="mt-5 text-xl font-bold">
                  {policy.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {policy.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-bold">
                Questions about publication ethics?
              </h2>

              <p className="mt-4 max-w-3xl text-slate-300 leading-7">
                Authors, reviewers, and readers may contact the editorial office
                regarding ethical concerns, appeals, corrections, or suspected
                research misconduct.
              </p>
            </div>

            <Link
              href="/contact"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-400"
            >
              Contact Editorial Office
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}