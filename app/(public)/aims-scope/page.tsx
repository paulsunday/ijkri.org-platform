import Link from "next/link";

const subjectAreas = [
  {
    title: "Business, Management and Economics",
    topics: [
      "Management and organisational studies",
      "Leadership and strategic management",
      "Entrepreneurship and innovation",
      "Human resource management",
      "Marketing and consumer behaviour",
      "Accounting, finance and taxation",
      "Public administration and governance",
      "Operations and supply-chain management",
    ],
  },
  {
    title: "Science, Engineering and Technology",
    topics: [
      "Computer science and information systems",
      "Artificial intelligence and automation",
      "Engineering and applied technology",
      "Renewable energy and sustainable technologies",
      "Data science and digital transformation",
      "Telecommunications and network systems",
      "Industrial and production engineering",
      "Technology management and innovation systems",
    ],
  },
  {
    title: "Education and Social Sciences",
    topics: [
      "Educational management and policy",
      "Curriculum development and teaching practice",
      "Higher education and institutional development",
      "Sociology and social development",
      "Psychology and behavioural studies",
      "Communication and media studies",
      "Development studies",
      "Public policy and social innovation",
    ],
  },
  {
    title: "Health and Life Sciences",
    topics: [
      "Public health and health administration",
      "Healthcare management",
      "Nursing and allied health sciences",
      "Health technology and innovation",
      "Environmental and occupational health",
      "Biomedical and applied life sciences",
      "Healthcare logistics and service delivery",
      "Community health and health policy",
    ],
  },
  {
    title: "Agriculture, Environment and Sustainability",
    topics: [
      "Agricultural economics and agribusiness",
      "Food systems and food security",
      "Environmental management",
      "Climate change and adaptation",
      "Sustainable development",
      "Green business and circular economy",
      "Natural-resource management",
      "Rural development and agricultural innovation",
    ],
  },
  {
    title: "Interdisciplinary and Emerging Research",
    topics: [
      "Research crossing disciplinary boundaries",
      "Innovation with practical or policy relevance",
      "Digital society and emerging technologies",
      "Sustainability and responsible innovation",
      "Institutional and organisational transformation",
      "Knowledge management",
      "Artificial intelligence in business and society",
      "Applied research addressing contemporary problems",
    ],
  },
];

const acceptedArticleTypes = [
  "Original empirical research articles",
  "Systematic literature reviews",
  "Scoping and integrative reviews",
  "Conceptual and theoretical papers",
  "Case studies",
  "Methodological papers",
  "Policy and practice papers",
  "Short research communications",
  "Book reviews, where formally commissioned",
];

export default function AimsAndScopePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
            Journal Profile
          </p>

          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">
            Aims and Scope
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            The International Journal of Knowledge, Research
            and Innovation publishes rigorous, original and
            relevant scholarship that advances understanding,
            informs practice and contributes to responsible
            innovation across disciplines.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_330px]">
        <article>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Journal Aim
          </p>

          <h2 className="mt-4 text-3xl font-bold">
            Advancing knowledge through credible research
          </h2>

          <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
            <p>
              IJKRI provides an international and
              multidisciplinary platform for researchers,
              academics, practitioners and policy professionals
              to communicate high-quality research and
              innovative ideas.
            </p>

            <p>
              The journal encourages work that addresses
              contemporary academic, organisational, economic,
              social, technological, environmental and public
              policy challenges.
            </p>

            <p>
              Particular attention is given to manuscripts that
              demonstrate methodological rigour, theoretical
              relevance, practical usefulness and a clear
              contribution to existing knowledge.
            </p>
          </div>
        </article>

        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
          <h2 className="text-xl font-bold text-amber-950">
            Core publishing principles
          </h2>

          <ul className="mt-6 space-y-4 leading-7 text-amber-900">
            <li>Originality and scholarly contribution</li>
            <li>Methodological and analytical rigour</li>
            <li>Ethical and transparent research practice</li>
            <li>Clear practical or theoretical relevance</li>
            <li>Constructive and impartial peer review</li>
            <li>Accessibility of research findings</li>
          </ul>
        </aside>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Subject Coverage
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Areas welcomed by the journal
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              The list below is indicative rather than
              exhaustive. Interdisciplinary manuscripts are
              welcome when their contribution is clearly
              explained.
            </p>
          </div>

          <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {subjectAreas.map((area) => (
              <article
                key={area.title}
                className="rounded-2xl border bg-white p-7 shadow-sm"
              >
                <h3 className="text-xl font-bold">
                  {area.title}
                </h3>

                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                  {area.topics.map((topic) => (
                    <li
                      key={topic}
                      className="flex gap-3"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">
            Article types considered
          </h2>

          <ul className="mt-6 space-y-4 leading-7 text-slate-700">
            {acceptedArticleTypes.map((type) => (
              <li
                key={type}
                className="flex gap-3"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span>{type}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">
            Manuscripts outside the scope
          </h2>

          <ul className="mt-6 space-y-4 leading-7 text-slate-700">
            <li>
              Work lacking a clear research question or
              scholarly contribution.
            </li>

            <li>
              Manuscripts that are purely promotional or
              commercial.
            </li>

            <li>
              Submissions without adequate methodological
              explanation.
            </li>

            <li>
              Material already published or simultaneously
              submitted elsewhere.
            </li>

            <li>
              Manuscripts containing fabricated, falsified or
              plagiarised material.
            </li>

            <li>
              Work that falls outside the journal’s academic
              and professional remit.
            </li>
          </ul>
        </article>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-3">
          <PolicyCard
            title="International relevance"
            text="Submissions may address local, national or international contexts, but the contribution should be clearly relevant to a wider scholarly or professional audience."
          />

          <PolicyCard
            title="Practical contribution"
            text="Applied studies should clearly explain how findings may inform management, policy, technology, education, healthcare, industry or community practice."
          />

          <PolicyCard
            title="Interdisciplinary value"
            text="Research combining methods, theories or evidence from multiple fields is encouraged when the integration strengthens the manuscript."
          />
        </div>
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold">
              Is your manuscript suitable for IJKRI?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              Review the author guidelines before submission
              and ensure that your work clearly fits the
              journal’s aims and scope.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/author-guidelines"
                className="rounded-lg border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-50"
              >
                Read Author Guidelines
              </Link>

              <Link
                href="/author/submit"
                className="rounded-lg bg-amber-500 px-7 py-3 font-semibold text-slate-950 hover:bg-amber-400"
              >
                Submit Manuscript
              </Link>

              <Link
                href="/contact"
                className="rounded-lg bg-slate-950 px-7 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Contact the Editorial Office
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PolicyCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900 p-7">
      <h2 className="text-xl font-bold text-amber-300">
        {title}
      </h2>

      <p className="mt-4 leading-7 text-slate-300">
        {text}
      </p>
    </article>
  );
}