import Link from "next/link";
import type { Metadata } from "next";

type FaqEntry = {
  question: string;
  answer: React.ReactNode;
};

type FaqGroup = {
  category: string;
  entries: FaqEntry[];
};

const faqGroups: FaqGroup[] = [
  {
    category: "Submission",
    entries: [
      {
        question: "How do I submit a manuscript to IJKRI?",
        answer: (
          <>
            Create an author account, then use the{" "}
            <Link
              href="/author/submit"
              className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
            >
              manuscript submission
            </Link>{" "}
            form to upload your paper and supporting documents. Review the{" "}
            <Link
              href="/author-guidelines"
              className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
            >
              author guidelines
            </Link>{" "}
            first to make sure your manuscript meets formatting requirements.
          </>
        ),
      },
      {
        question: "What manuscript types does IJKRI accept?",
        answer:
          "Original research articles, review articles, conceptual papers, and case studies. See the current Call for Papers for the specific scope of the open issue.",
      },
      {
        question: "Can I submit the same manuscript to another journal at the same time?",
        answer:
          "No. Manuscripts must be original and not under review elsewhere. Submitting the same work to multiple journals simultaneously is a breach of publication ethics.",
      },
    ],
  },
  {
    category: "Peer Review",
    entries: [
      {
        question: "What type of peer review does IJKRI use?",
        answer: (
          <>
            Double-blind peer review by default — author and reviewer
            identities are not disclosed to each other. See the full{" "}
            <Link
              href="/peer-review"
              className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
            >
              peer review process
            </Link>{" "}
            for each stage and possible decisions.
          </>
        ),
      },
      {
        question: "How long does peer review take?",
        answer:
          "Timelines vary by submission volume and reviewer availability. You can track your manuscript's status from your author dashboard at any point in the process.",
      },
      {
        question: "How do I respond to reviewer comments?",
        answer:
          "If a revision is requested, you will receive reviewer comments through your author dashboard and can upload a revised manuscript along with a response to reviewers.",
      },
    ],
  },
  {
    category: "Authors",
    entries: [
      {
        question: "Do I need to pay to submit my manuscript?",
        answer:
          "Submission itself is free. An article processing charge applies only if your manuscript is accepted for publication — see Fees below.",
      },
      {
        question: "Who can be listed as a co-author?",
        answer:
          "Everyone listed as a co-author should have made a substantive contribution to the research and have approved the final manuscript and author order before submission.",
      },
    ],
  },
  {
    category: "Reviewers",
    entries: [
      {
        question: "How do I become a reviewer for IJKRI?",
        answer: (
          <>
            Apply through{" "}
            <Link
              href="/reviewer/apply"
              className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
            >
              Become a Reviewer
            </Link>
            . Reviewer responsibilities and review criteria are outlined on
            the peer review page.
          </>
        ),
      },
      {
        question: "Is there recognition for reviewers?",
        answer:
          "Reviewers can receive digital certificates for completed reviews, and the journal recognises consistent reviewer contributions through its reviewer programme.",
      },
    ],
  },
  {
    category: "Editors",
    entries: [
      {
        question: "Who makes the final decision on a manuscript?",
        answer:
          "Editorial decisions are made by the handling editor based on reviewer recommendations, editorial policy, and the manuscript's fit with the journal's scope.",
      },
    ],
  },
  {
    category: "Publication",
    entries: [
      {
        question: "How will I know when my article is published?",
        answer:
          "You will be notified once your article is published, and it will appear on the current issue and archives pages with its own article page.",
      },
      {
        question: "Can I share my published article?",
        answer:
          "Yes. Published articles are open access, so you are free to share the link, download the PDF, and cite the article using the citation formats provided on its article page.",
      },
    ],
  },
  {
    category: "DOI",
    entries: [
      {
        question: "Does IJKRI assign DOIs?",
        answer:
          "Accepted articles receive a Digital Object Identifier (DOI), giving your work a permanent, citable link.",
      },
    ],
  },
  {
    category: "Open Access",
    entries: [
      {
        question: "Is IJKRI an open-access journal?",
        answer:
          "Yes. Published articles are freely available to read online without a subscription.",
      },
    ],
  },
  {
    category: "Fees",
    entries: [
      {
        question: "What is the article processing charge (APC)?",
        answer:
          "The current APC is shown at the point of acceptance and on your invoice. It covers editorial handling, production, and open-access hosting of your article. The APC applies only after a manuscript is accepted.",
      },
    ],
  },
  {
    category: "Ethics",
    entries: [
      {
        question: "What is IJKRI's position on plagiarism?",
        answer: (
          <>
            Manuscripts are expected to be original work with proper
            attribution. See the full{" "}
            <Link
              href="/publication-ethics"
              className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
            >
              publication ethics
            </Link>{" "}
            policy for details on plagiarism, duplicate submission, and
            research integrity.
          </>
        ),
      },
      {
        question: "How does IJKRI handle conflicts of interest?",
        answer:
          "Authors, reviewers, and editors are required to disclose any conflicts of interest that could influence a manuscript's evaluation. See the publication ethics page for the full policy.",
      },
    ],
  },
  {
    category: "Copyright",
    entries: [
      {
        question: "Who holds copyright for published articles?",
        answer:
          "Copyright and licensing terms are set out in the journal's copyright policy, available from the journal administration and referenced on each article's page.",
      },
    ],
  },
];

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about submitting to, reviewing for, and publishing with the International Journal of Knowledge, Research and Innovation.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Academic FAQ
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Frequently asked questions
          </h1>

          <p className="mt-5 max-w-2xl leading-8 text-slate-300">
            Common questions from authors, reviewers, and editors about
            submitting to and publishing with IJKRI.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <nav
          aria-label="FAQ categories"
          className="flex flex-wrap gap-2"
        >
          {faqGroups.map((group) => (
            <a
              key={group.category}
              href={`#${group.category.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-800"
            >
              {group.category}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12">
          {faqGroups.map((group) => (
            <div
              key={group.category}
              id={group.category.toLowerCase().replace(/\s+/g, "-")}
              className="scroll-mt-24"
            >
              <h2 className="text-2xl font-bold text-slate-950">
                {group.category}
              </h2>

              <div className="mt-5 space-y-3">
                {group.entries.map((entry) => (
                  <details
                    key={entry.question}
                    className="group rounded-xl border border-slate-200 bg-white p-5 open:border-amber-300 open:bg-amber-50/40"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-slate-950 marker:content-none">
                      <span className="flex items-center justify-between gap-4">
                        {entry.question}

                        <span className="shrink-0 text-amber-700 group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>

                    <p className="mt-3 leading-7 text-slate-700">
                      {entry.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-950">
            Still have a question?
          </h2>

          <p className="mt-3 text-slate-600">
            Reach out to the editorial office and we will get back to you.
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
