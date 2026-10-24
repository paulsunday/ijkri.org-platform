import Link from "next/link";

const manuscriptTypes = [
  {
    title: "Original Research Article",
    wordGuide: "5,000–8,000 words",
    description:
      "Reports original empirical or theoretical research with a clearly defined problem, rigorous methodology, substantial analysis and a meaningful contribution to knowledge.",
    structure:
      "Abstract, keywords, introduction, literature review, methodology, results, discussion, conclusion and references.",
  },
  {
    title: "Review Article",
    wordGuide: "6,000–10,000 words",
    description:
      "Provides a critical and well-structured synthesis of existing literature, identifies gaps and proposes directions for future research.",
    structure:
      "Abstract, keywords, introduction, review method, thematic synthesis, discussion, research gaps, conclusion and references.",
  },
  {
    title: "Short Communication",
    wordGuide: "2,000–4,000 words",
    description:
      "Presents important preliminary findings, concise empirical results, methodological innovations or time-sensitive scholarly observations.",
    structure:
      "Abstract, keywords, introduction, method, key findings, discussion, conclusion and references.",
  },
  {
    title: "Case Study",
    wordGuide: "3,500–6,000 words",
    description:
      "Examines a specific organisation, event, intervention, policy, industry or social setting and draws clear theoretical or practical lessons.",
    structure:
      "Abstract, keywords, case background, problem, analysis, findings, implications, conclusion and references.",
  },
  {
    title: "Conceptual Paper",
    wordGuide: "4,000–7,000 words",
    description:
      "Develops or extends concepts, frameworks, models or theoretical propositions through logical analysis and engagement with relevant literature.",
    structure:
      "Abstract, keywords, introduction, conceptual foundation, proposed framework, discussion, implications and conclusion.",
  },
  {
    title: "Technical Note",
    wordGuide: "2,000–4,000 words",
    description:
      "Describes a practical method, research instrument, process improvement, technical development or applied innovation.",
    structure:
      "Abstract, keywords, background, method or technique, application, results, limitations and conclusion.",
  },
];

const preparationSections = [
  {
    number: "01",
    title: "Title Page",
    items: [
      "Provide a clear, specific and informative manuscript title.",
      "List the full names of all authors in the correct publication order.",
      "State each author’s institutional affiliation, department, city and country.",
      "Identify the corresponding author and provide a valid email address.",
      "Include ORCID identifiers where available.",
      "Provide a short running title where appropriate.",
    ],
  },
  {
    number: "02",
    title: "Anonymous Manuscript File",
    items: [
      "Remove author names, affiliations, acknowledgements and identifying information.",
      "Remove identifying details from file properties and tracked changes.",
      "Avoid self-references that reveal the identity of the authors.",
      "Use neutral wording such as ‘previous research’ instead of ‘our previous study’ where anonymity may be compromised.",
    ],
  },
  {
    number: "03",
    title: "Abstract",
    items: [
      "Use a structured or unstructured abstract depending on the manuscript type.",
      "The abstract should normally contain 150–300 words.",
      "State the purpose, method, principal findings, implications and conclusion.",
      "Do not include citations, unexplained abbreviations, tables or figures.",
      "Ensure the abstract accurately reflects the content of the manuscript.",
    ],
  },
  {
    number: "04",
    title: "Keywords",
    items: [
      "Provide four to seven keywords immediately after the abstract.",
      "Choose terms that reflect the main concepts, variables, population, setting or method.",
      "Avoid repeating words already used extensively in the title.",
      "Use recognised subject terms where possible to improve discoverability.",
    ],
  },
  {
    number: "05",
    title: "Introduction",
    items: [
      "Present the background and context of the study.",
      "Clearly identify the research problem or knowledge gap.",
      "Explain the importance and relevance of the study.",
      "State the aim, objectives, research questions or hypotheses.",
      "End with a concise statement of the contribution of the manuscript.",
    ],
  },
  {
    number: "06",
    title: "Literature Review or Theoretical Foundation",
    items: [
      "Critically engage with recent and relevant literature.",
      "Organise the review around themes, concepts, debates or theoretical relationships.",
      "Avoid a purely descriptive sequence of individual studies.",
      "Explain the theoretical or conceptual framework guiding the study.",
      "Show clearly how the study addresses an identified gap.",
    ],
  },
  {
    number: "07",
    title: "Methodology",
    items: [
      "Describe the research design and justify its suitability.",
      "Identify the study population, sample, setting and selection procedure.",
      "Explain data-collection instruments and procedures.",
      "Report validity, reliability, trustworthiness or quality controls.",
      "Describe the data-analysis techniques used.",
      "Include ethical approval and informed-consent information where applicable.",
      "Provide enough detail for another researcher to understand or reproduce the method.",
    ],
  },
  {
    number: "08",
    title: "Results or Findings",
    items: [
      "Present findings clearly and logically in relation to the research objectives.",
      "Avoid repeating all numerical information in both text and tables.",
      "Report appropriate statistical values, effect sizes and significance levels where relevant.",
      "For qualitative work, present themes with adequate supporting evidence.",
      "Do not introduce extensive interpretation that belongs in the discussion section.",
    ],
  },
  {
    number: "09",
    title: "Discussion",
    items: [
      "Interpret the principal findings rather than merely restating them.",
      "Relate the findings to relevant theories and previous studies.",
      "Explain agreements, differences, unexpected results and possible reasons.",
      "Discuss theoretical, managerial, policy, professional or social implications.",
      "Avoid claims that are not supported by the evidence.",
    ],
  },
  {
    number: "10",
    title: "Conclusion and Recommendations",
    items: [
      "Summarise the study’s main contribution without repeating the abstract.",
      "State the practical and scholarly significance of the findings.",
      "Present recommendations that follow directly from the evidence.",
      "Acknowledge important limitations.",
      "Suggest realistic areas for future research.",
    ],
  },
  {
    number: "11",
    title: "Declarations",
    items: [
      "Funding statement.",
      "Conflict-of-interest declaration.",
      "Ethical approval statement where applicable.",
      "Informed-consent statement where applicable.",
      "Data-availability statement.",
      "Author-contribution statement.",
      "Acknowledgements.",
      "Declaration of generative artificial-intelligence use where applicable.",
    ],
  },
  {
    number: "12",
    title: "References",
    items: [
      "Use APA 7th edition unless the journal announces a different style for a special issue.",
      "Ensure every in-text citation appears in the reference list.",
      "Ensure every reference-list entry is cited in the text.",
      "Include DOI links for sources that have DOIs.",
      "Prioritise credible, relevant and reasonably recent scholarly sources.",
    ],
  },
];

const formattingRequirements = [
  {
    label: "File format",
    value:
      "Microsoft Word format (.doc or .docx). A PDF may be included only as a supplementary viewing copy.",
  },
  {
    label: "Page size",
    value: "A4 paper size.",
  },
  {
    label: "Margins",
    value: "At least 2.54 cm on all sides.",
  },
  {
    label: "Font",
    value:
      "Times New Roman, 12-point font for the main text. Use consistent font sizes throughout the manuscript.",
  },
  {
    label: "Line spacing",
    value:
      "Double spacing for the main text, references, tables and figure captions unless otherwise instructed.",
  },
  {
    label: "Alignment",
    value:
      "Use left alignment for headings and justified or left-aligned body text consistently.",
  },
  {
    label: "Paragraphs",
    value:
      "Use consistent paragraph indentation or spacing. Do not separate every sentence with a blank line.",
  },
  {
    label: "Page numbers",
    value:
      "Number all pages consecutively, beginning with the title page.",
  },
  {
    label: "Headings",
    value:
      "Use a clear and consistent hierarchy. Do not number headings unnecessarily unless required by the discipline.",
  },
  {
    label: "Language",
    value:
      "Manuscripts must be written in clear academic English. British or American spelling may be used, but usage must remain consistent.",
  },
  {
    label: "Abbreviations",
    value:
      "Define each abbreviation at first use and avoid unnecessary abbreviations.",
  },
  {
    label: "Units",
    value:
      "Use internationally recognised units, preferably SI units, and define uncommon measurements.",
  },
];

const referenceExamples = [
  {
    type: "Journal article",
    example:
      "Author, A. A., & Author, B. B. (2024). Title of the article. Journal Title, 12(3), 101–118. https://doi.org/10.xxxx/xxxxx",
  },
  {
    type: "Book",
    example:
      "Author, A. A. (2023). Title of the book (2nd ed.). Publisher.",
  },
  {
    type: "Chapter in an edited book",
    example:
      "Author, A. A. (2022). Title of chapter. In B. B. Editor (Ed.), Title of book (pp. 25–48). Publisher.",
  },
  {
    type: "Webpage",
    example:
      "Organisation Name. (2025, March 14). Title of webpage. Site Name. https://example.com/page",
  },
  {
    type: "Report",
    example:
      "Organisation Name. (2024). Title of report (Report No. 15). Publisher. https://doi.org/10.xxxx/xxxxx",
  },
];

const ethicsPolicies = [
  {
    title: "Originality and plagiarism",
    description:
      "Submitted work must be original. All quotations, ideas, data, figures and materials obtained from other sources must be properly acknowledged. Manuscripts may be screened using similarity-detection software.",
  },
  {
    title: "Duplicate and simultaneous submission",
    description:
      "A manuscript must not be submitted to IJKRI while it is under consideration by another journal. Substantially similar work must not be published more than once without clear justification and disclosure.",
  },
  {
    title: "Data fabrication and falsification",
    description:
      "Authors must not invent, manipulate, omit or misrepresent research data, methods, images, statistical results or participant information.",
  },
  {
    title: "Authorship and contributorship",
    description:
      "Every listed author must have made a meaningful scholarly contribution, approved the submitted version and accepted responsibility for the work. Individuals who do not meet authorship criteria should be acknowledged appropriately.",
  },
  {
    title: "Conflicts of interest",
    description:
      "Authors must disclose financial, professional, institutional or personal relationships that could reasonably be perceived to influence the research or its interpretation.",
  },
  {
    title: "Funding disclosure",
    description:
      "All financial support, grants, sponsorships and material assistance must be identified, including the role of the funder in the study.",
  },
];

const aiPolicyItems = [
  {
    title: "Permitted assistance",
    description:
      "Generative artificial-intelligence tools may be used for limited language improvement, grammar correction, translation assistance or organisational support, provided the authors review and take responsibility for the final content.",
  },
  {
    title: "Required disclosure",
    description:
      "Authors must disclose the name of the tool, the purpose for which it was used and the sections of the manuscript affected.",
  },
  {
    title: "Prohibited authorship",
    description:
      "An artificial-intelligence system cannot be listed as an author because it cannot accept responsibility, approve publication or declare conflicts of interest.",
  },
  {
    title: "Prohibited practices",
    description:
      "Authors must not use AI tools to fabricate references, invent data, generate misleading results, conceal plagiarism or create false participant or ethical information.",
  },
  {
    title: "Human accountability",
    description:
      "The authors remain fully responsible for the accuracy, originality, citations, arguments, data and ethical integrity of the manuscript.",
  },
];

const reviewProcess = [
  {
    number: "01",
    title: "Submission",
    description:
      "The corresponding author submits the manuscript, metadata and supporting files through the journal platform.",
  },
  {
    number: "02",
    title: "Initial editorial screening",
    description:
      "The editorial office checks scope, completeness, originality, ethics, language and compliance with the author guidelines.",
  },
  {
    number: "03",
    title: "Reviewer assignment",
    description:
      "Suitable manuscripts are assigned to qualified independent reviewers under the double-blind review model.",
  },
  {
    number: "04",
    title: "Peer review",
    description:
      "Reviewers assess originality, methodology, analysis, clarity, significance and ethical compliance.",
  },
  {
    number: "05",
    title: "Editorial decision",
    description:
      "The editor issues an acceptance, minor revision, major revision or rejection decision after considering the reports.",
  },
  {
    number: "06",
    title: "Revision",
    description:
      "Authors submit a revised manuscript together with a detailed point-by-point response to reviewer and editor comments.",
  },
  {
    number: "07",
    title: "Production",
    description:
      "Accepted manuscripts proceed through copyediting, typesetting, proofreading and final author approval.",
  },
  {
    number: "08",
    title: "Publication",
    description:
      "The final article is assigned to an issue and published with its approved metadata and publication files.",
  },
];

const submissionChecklist = [
  "The manuscript falls within the aims and scope of IJKRI.",
  "The work is original and is not under consideration elsewhere.",
  "All authors approved the manuscript and author order.",
  "The title page and anonymous manuscript are separate files.",
  "The abstract and keywords meet the journal requirements.",
  "The manuscript is formatted consistently and pages are numbered.",
  "Tables and figures are cited, numbered and clearly labelled.",
  "All in-text citations appear in the reference list.",
  "All reference-list entries are cited in the manuscript.",
  "References follow APA 7th edition.",
  "Ethical approval and informed consent are reported where required.",
  "Funding, conflicts of interest and data availability are declared.",
  "Any use of generative AI has been disclosed.",
  "Permission has been obtained for copyrighted material.",
  "The corresponding author’s contact information is complete.",
];

export default function AuthorGuidelinesPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
            Instructions for Authors
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Author Guidelines
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Authors should read these instructions carefully before submitting
            a manuscript to the International Journal of Advanced Research and
            Innovation. Manuscripts that do not meet the journal requirements
            may be returned before peer review.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/author/submit"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Submit Manuscript
            </Link>

            <Link
              href="/register"
              className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
            >
              Create Author Account
            </Link>

            <Link
              href="/contact"
              className="rounded-lg px-6 py-3 font-semibold text-amber-300 transition hover:text-amber-200"
            >
              Contact Editorial Office →
            </Link>
          </div>
        </div>
      </section>

      <nav className="border-b bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-7 gap-y-3 px-6 py-5 text-sm font-semibold">
          <a href="#before-submission" className="hover:text-amber-700">
            Before Submission
          </a>

          <a href="#manuscript-types" className="hover:text-amber-700">
            Manuscript Types
          </a>

          <a href="#manuscript-preparation" className="hover:text-amber-700">
            Manuscript Preparation
          </a>

          <a href="#formatting" className="hover:text-amber-700">
            Formatting
          </a>

          <a href="#journey" className="hover:text-amber-700">
            Publication Journey
          </a>

          <a href="#references" className="hover:text-amber-700">
            References
          </a>

          <a href="#ethics" className="hover:text-amber-700">
            Ethics
          </a>

          <a href="#submission-checklist" className="hover:text-amber-700">
            Submission Checklist
          </a>
        </div>
      </nav>

      <section
        id="before-submission"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <article>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Before You Submit
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Confirm that the manuscript is suitable for IJKRI
          </h2>

          <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
            <p>
              The corresponding author is responsible for ensuring that the
              manuscript is complete, accurate and approved by every listed
              author before submission.
            </p>

            <p>
              Submission to IJKRI confirms that the work is original, has not
              been published previously and is not being considered
              simultaneously by another journal.
            </p>

            <p>
              Authors must ensure that the study falls within the journal’s
              multidisciplinary scope and that all research, ethical and
              reporting requirements have been satisfied.
            </p>
          </div>

          <Link
            href="/aims-scope"
            className="mt-7 inline-flex font-semibold text-amber-700 hover:underline"
          >
            Review the journal’s aims and scope →
          </Link>
        </article>

        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-bold text-amber-950">
            Essential submission conditions
          </h2>

          <ul className="mt-6 space-y-4 text-sm leading-6 text-amber-950">
            <li className="rounded-lg bg-white p-4">
              The manuscript is original and not under consideration elsewhere.
            </li>

            <li className="rounded-lg bg-white p-4">
              All authors have reviewed and approved the submission.
            </li>

            <li className="rounded-lg bg-white p-4">
              Required ethical approvals and participant consent have been
              obtained.
            </li>

            <li className="rounded-lg bg-white p-4">
              Sources, quotations, data, figures and ideas have been properly
              acknowledged.
            </li>

            <li className="rounded-lg bg-white p-4">
              Conflicts of interest, funding and artificial-intelligence use
              have been disclosed.
            </li>
          </ul>
        </aside>
      </section>

      <section id="manuscript-types" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Manuscript Categories
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Types of manuscripts considered
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              Word ranges are general guides and may vary depending on the
              discipline, research design and complexity of the contribution.
              References, tables and supplementary material may be excluded
              from the main word count where appropriate.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {manuscriptTypes.map((type) => (
              <article
                key={type.title}
                className="rounded-2xl border bg-white p-7 shadow-sm"
              >
                <div className="h-1 w-14 rounded bg-amber-500" />

                <h3 className="mt-5 text-xl font-bold">
                  {type.title}
                </h3>

                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Suggested length: {type.wordGuide}
                </p>

                <p className="mt-4 leading-7 text-slate-700">
                  {type.description}
                </p>

                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Typical structure
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {type.structure}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="manuscript-preparation"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Manuscript Preparation
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Required manuscript components
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-700">
            The exact organisation may differ by manuscript type, but the
            following elements should be included where they are relevant to
            the study.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {preparationSections.map((section) => (
            <article
              key={section.number}
              className="grid gap-6 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-[100px_1fr] md:p-8"
            >
              <div>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-800">
                  {section.number}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold">
                  {section.title}
                </h3>

                <ul className="mt-5 space-y-3">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 leading-7 text-slate-700"
                    >
                      <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="formatting" className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
              Formatting Requirements
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Present the manuscript clearly and consistently
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Good formatting supports efficient editorial screening,
              anonymous peer review and production.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-700">
            <div className="grid bg-slate-900 text-sm font-bold uppercase tracking-wider text-amber-300 md:grid-cols-[220px_1fr]">
              <div className="border-b border-slate-700 p-5 md:border-b-0 md:border-r">
                Requirement
              </div>

              <div className="p-5">
                Journal standard
              </div>
            </div>

            {formattingRequirements.map((requirement) => (
              <div
                key={requirement.label}
                className="grid border-t border-slate-700 md:grid-cols-[220px_1fr]"
              >
                <div className="bg-slate-900 p-5 font-semibold text-white md:border-r md:border-slate-700">
                  {requirement.label}
                </div>

                <div className="p-5 leading-7 text-slate-300">
                  {requirement.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <article className="rounded-2xl border bg-white p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Tables
            </p>

            <h2 className="mt-4 text-2xl font-bold">
              Preparing tables
            </h2>

            <ul className="mt-6 space-y-4 leading-7 text-slate-700">
              <li>
                Number tables consecutively in the order in which they are
                mentioned in the manuscript.
              </li>

              <li>
                Provide a concise and informative title above each table.
              </li>

              <li>
                Define abbreviations and explanatory notes below the table.
              </li>

              <li>
                Ensure the table can be understood without excessive reference
                to the main text.
              </li>

              <li>
                Do not submit tables as low-quality screenshots or images.
              </li>

              <li>
                Obtain permission to reproduce or adapt previously published
                material.
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border bg-white p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Figures
            </p>

            <h2 className="mt-4 text-2xl font-bold">
              Preparing figures and illustrations
            </h2>

            <ul className="mt-6 space-y-4 leading-7 text-slate-700">
              <li>
                Number figures consecutively according to their first mention
                in the text.
              </li>

              <li>
                Supply clear captions below each figure.
              </li>

              <li>
                Use high-resolution images with readable labels and legends.
              </li>

              <li>
                Avoid unnecessary decoration, three-dimensional effects and
                misleading scales.
              </li>

              <li>
                Remove personal identifiers from photographs and research
                images unless written consent permits their use.
              </li>

              <li>
                State the source and permission status of reproduced figures.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="references" className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Referencing
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              APA 7th edition reference style
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              IJKRI uses the American Psychological Association
              reference style, seventh edition. Authors are responsible
              for the accuracy and completeness of every citation.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-amber-200 bg-white p-8">
              <h3 className="text-2xl font-bold">
                In-text citations
              </h3>

              <div className="mt-6 space-y-5 text-slate-700">
                <div>
                  <p className="font-semibold">
                    One author
                  </p>
                  <p className="mt-1">
                    Parenthetical: (Author, 2024)
                  </p>
                  <p>
                    Narrative: Author (2024)
                  </p>
                </div>

                <div>
                  <p className="font-semibold">
                    Two authors
                  </p>
                  <p className="mt-1">
                    Parenthetical: (Author & Author, 2024)
                  </p>
                  <p>
                    Narrative: Author1 and Author2(2024)
                  </p>
                </div>

                <div>
                  <p className="font-semibold">
                    Three or more authors
                  </p>
                  <p className="mt-1">
                    Parenthetical: (Author et al., 2024)
                  </p>
                  <p>
                    Narrative: Author et al. (2024)
                  </p>
                </div>

                <div>
                  <p className="font-semibold">
                    Direct quotation
                  </p>
                  <p className="mt-1">
                    Include the author, year and page number:
                    (Author, 2024, p. 18).
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-white p-8">
              <h3 className="text-2xl font-bold">
                Reference-list principles
              </h3>

              <ul className="mt-6 space-y-4 leading-7 text-slate-700">
                <li>
                  Arrange entries alphabetically by the surname of
                  the first author.
                </li>

                <li>
                  Use a hanging indentation for each entry.
                </li>

                <li>
                  Italicise journal titles, volume numbers and book
                  titles as required by APA 7.
                </li>

                <li>
                  Present DOI values as active links beginning with
                  https://doi.org/.
                </li>

                <li>
                  Do not include database names for ordinary journal
                  articles unless APA 7 specifically requires them.
                </li>

                <li>
                  Verify author names, dates, article titles, page
                  ranges, DOI links and URLs before submission.
                </li>
              </ul>
            </article>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-amber-200 bg-white">
            {referenceExamples.map((reference) => (
              <div
                key={reference.type}
                className="grid border-b border-amber-100 p-6 last:border-b-0 md:grid-cols-[220px_1fr]"
              >
                <p className="font-bold text-amber-900">
                  {reference.type}
                </p>

                <p className="mt-2 break-words leading-7 text-slate-700 md:mt-0">
                  {reference.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ethics" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Publication Ethics
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Ethical responsibilities of authors
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-700">
            Authors must comply with recognised principles of
            research integrity and publication ethics throughout the
            submission and publication process.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ethicsPolicies.map((policy) => (
            <article
              key={policy.title}
              className="rounded-2xl border bg-white p-7 shadow-sm"
            >
              <h3 className="text-xl font-bold">
                {policy.title}
              </h3>

              <p className="mt-4 leading-7 text-slate-700">
                {policy.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-8">
            <h3 className="text-2xl font-bold text-blue-950">
              Ethical approval and informed consent
            </h3>

            <p className="mt-4 leading-8 text-blue-900">
              Research involving human participants, identifiable
              personal data, clinical material or animals must comply
              with applicable ethical and legal standards.
            </p>

            <ul className="mt-6 space-y-4 leading-7 text-blue-900">
              <li>
                Identify the approving ethics committee or review
                board.
              </li>

              <li>
                Include the approval reference number where one was
                issued.
              </li>

              <li>
                State how informed consent was obtained.
              </li>

              <li>
                Explain any waiver of consent or ethical review.
              </li>

              <li>
                Protect participant confidentiality and remove
                unnecessary identifying information.
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border border-green-200 bg-green-50 p-8">
            <h3 className="text-2xl font-bold text-green-950">
              Research data and reproducibility
            </h3>

            <p className="mt-4 leading-8 text-green-900">
              Authors should retain accurate research records and
              provide sufficient methodological information to permit
              evaluation and, where appropriate, replication.
            </p>

            <ul className="mt-6 space-y-4 leading-7 text-green-900">
              <li>
                Include a data-availability statement.
              </li>

              <li>
                State whether data are publicly available, restricted
                or available on reasonable request.
              </li>

              <li>
                Identify recognised repositories and persistent links
                where applicable.
              </li>

              <li>
                Do not disclose confidential or legally protected
                information.
              </li>

              <li>
                Preserve source data and research documentation
                according to disciplinary and institutional policy.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
              Generative Artificial Intelligence
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Policy on AI-assisted writing and research
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              IJKRI permits limited and transparent use of
              generative-AI tools. Such tools must not replace author
              judgement, scholarly responsibility or research
              integrity.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {aiPolicyItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-7"
              >
                <h3 className="text-xl font-bold text-amber-300">
                  {item.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-300">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-7">
            <h3 className="text-xl font-bold text-amber-300">
              Suggested AI-use declaration
            </h3>

            <p className="mt-4 leading-8 text-slate-200">
              “During the preparation of this manuscript, the
              author(s) used [tool name and version] for [specific
              purpose]. The author(s) reviewed and edited the resulting
              material and accept full responsibility for the final
              content.”
            </p>
          </div>
        </div>
      </section>

      <section id="journey" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Publication Journey
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Prepare → Submit → Peer Review → Revise → Accept → Production → Publish
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-700">
            IJKRI follows a structured editorial process designed to
            support independent assessment, constructive revision and
            accountable publication decisions. You can track exactly
            where your manuscript stands from your{" "}
            <Link
              href="/author/dashboard"
              className="font-semibold text-amber-700 hover:underline"
            >
              author dashboard
            </Link>{" "}
            at any point in this process.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reviewProcess.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <p className="text-3xl font-bold text-amber-600">
                {step.number}
              </p>

              <h3 className="mt-4 text-xl font-bold">
                {step.title}
              </h3>

              <p className="mt-3 leading-7 text-slate-700">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-purple-200 bg-purple-50 p-8">
          <h3 className="text-2xl font-bold text-purple-950">
            Preparing a revised manuscript
          </h3>

          <ul className="mt-6 grid gap-4 leading-7 text-purple-900 md:grid-cols-2">
            <li className="rounded-lg bg-white p-4">
              Address every editor and reviewer comment.
            </li>

            <li className="rounded-lg bg-white p-4">
              Provide a point-by-point response document.
            </li>

            <li className="rounded-lg bg-white p-4">
              Clearly identify changes made in the revised manuscript.
            </li>

            <li className="rounded-lg bg-white p-4">
              Explain respectfully when a suggested change was not
              made.
            </li>

            <li className="rounded-lg bg-white p-4">
              Upload both the clean manuscript and any marked version
              requested.
            </li>

            <li className="rounded-lg bg-white p-4">
              Submit the revision before the stated deadline or request
              an extension.
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-3">
          <article className="rounded-2xl border bg-white p-8">
            <h2 className="text-2xl font-bold">
              Publication charges
            </h2>

            <p className="mt-4 leading-8 text-slate-700">
              Any submission, processing or article-publication charge
              must be stated clearly before payment is requested.
              Editorial decisions must not depend on an author&apos;s
              ability to pay.
            </p>

            <p className="mt-4 leading-8 text-slate-700">
              Current charges, exemptions and waiver arrangements
              should be confirmed on the journal website or directly
              with the editorial office.
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-8">
            <h2 className="text-2xl font-bold">
              Copyright and licensing
            </h2>

            <p className="mt-4 leading-8 text-slate-700">
              Authors must own or have permission to use all submitted
              material. The publication agreement will state the
              rights retained by authors and the licence applied to the
              final article.
            </p>

            <p className="mt-4 leading-8 text-slate-700">
              Third-party material must be identified and supported by
              written permission where required.
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-8">
            <h2 className="text-2xl font-bold">
              Corrections and retractions
            </h2>

            <p className="mt-4 leading-8 text-slate-700">
              Authors must inform the journal promptly if a significant
              error is discovered after submission or publication.
            </p>

            <p className="mt-4 leading-8 text-slate-700">
              The journal may issue corrections, expressions of
              concern or retractions where necessary to protect the
              integrity of the scholarly record.
            </p>
          </article>
        </div>
      </section>

      <section
        id="submission-checklist"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Final Submission Checklist
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Check every item before submitting
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              Incomplete submissions may be returned to the
              corresponding author before editorial screening.
            </p>
          </div>

          <div className="space-y-3">
            {submissionChecklist.map((item) => (
              <label
                key={item}
                className="flex items-start gap-4 rounded-xl border bg-white p-5"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-slate-300"
                />

                <span className="leading-7 text-slate-700">
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Ready to Submit?
            </p>

            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold">
              Submit a complete and publication-ready manuscript
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              Ensure that the manuscript, author information,
              declarations and supporting files satisfy all applicable
              journal requirements.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/author/submit"
                className="rounded-lg bg-amber-500 px-7 py-3 font-semibold text-slate-950 hover:bg-amber-400"
              >
                Submit Manuscript
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-slate-950 px-7 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Create Author Account
              </Link>

              <Link
                href="/contact"
                className="rounded-lg border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-50"
              >
                Ask the Editorial Office
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

