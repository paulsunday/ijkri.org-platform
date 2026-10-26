import Link from "next/link";

import { getStaticPageOverride } from "@/lib/static-pages/get-static-page";
import { StaticPageOverrideView } from "@/components/static-pages/StaticPageOverrideView";

const reviewStages = [
  {
    number: "01",
    title: "Submission and technical checks",
    description:
      "The editorial office confirms that the manuscript is complete, properly anonymised, within scope and broadly compliant with the submission requirements.",
  },
  {
    number: "02",
    title: "Initial editorial assessment",
    description:
      "An editor evaluates originality, relevance, presentation, ethical compliance and overall suitability before external review.",
  },
  {
    number: "03",
    title: "Reviewer selection",
    description:
      "Qualified reviewers are selected according to subject expertise, availability, independence and the absence of conflicting interests.",
  },
  {
    number: "04",
    title: "Double-blind peer review",
    description:
      "Reviewer and author identities are concealed from one another. Reviewers assess the manuscript confidentially and provide reasoned recommendations.",
  },
  {
    number: "05",
    title: "Editorial decision",
    description:
      "The editor considers the reviewers’ reports, the manuscript and journal policy before issuing an editorial decision.",
  },
  {
    number: "06",
    title: "Revision and reassessment",
    description:
      "Where revision is requested, authors respond to each comment and submit a revised manuscript. Further review may be required.",
  },
  {
    number: "07",
    title: "Final decision",
    description:
      "The editor may accept, request further revision or reject the manuscript based on the evidence available.",
  },
  {
    number: "08",
    title: "Production and publication",
    description:
      "Accepted manuscripts proceed to copyediting, typesetting, proofreading, author proof approval and final publication.",
  },
];

const reviewCriteria = [
  {
    title: "Originality and contribution",
    description:
      "Does the manuscript add something meaningful to existing knowledge, rather than repeating already-published work?",
  },
  {
    title: "Methodological rigour",
    description:
      "Is the research design, sample, data collection and analysis appropriate and clearly justified for the questions being asked?",
  },
  {
    title: "Engagement with literature",
    description:
      "Does the manuscript critically engage with relevant, current scholarship rather than listing sources without synthesis?",
  },
  {
    title: "Clarity and structure",
    description:
      "Is the argument easy to follow, with a logical structure from introduction through to conclusion?",
  },
  {
    title: "Evidence and interpretation",
    description:
      "Are claims and conclusions properly supported by the data or analysis presented, without overreach?",
  },
  {
    title: "Ethical compliance",
    description:
      "Where applicable, is there evidence of appropriate ethical approval, informed consent, and honest reporting of methods and data?",
  },
];

const decisionTypes = [
  {
    title: "Accept",
    text: "The manuscript is suitable for publication, subject to any minor production corrections.",
  },
  {
    title: "Minor Revision",
    text: "Limited changes are required and the editor may assess the revision without another full review round.",
  },
  {
    title: "Major Revision",
    text: "Substantial changes are required. The revised manuscript may be returned to the original or new reviewers.",
  },
  {
    title: "Reject",
    text: "The manuscript is unsuitable for publication because of scope, quality, originality, methodology, ethics or contribution concerns.",
  },
];

export default async function PeerReviewPage() {
  const override = await getStaticPageOverride("PEER_REVIEW");

  if (override) {
    return <StaticPageOverrideView override={override} />;
  }

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
            Editorial Policy
          </p>

          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">
            Peer Review Policy
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            The International Journal of Knowledge, Research
            and Innovation applies a structured double-blind
            peer-review process intended to support fair,
            independent and evidence-based editorial decisions.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_330px]">
        <article>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Review Model
          </p>

          <h2 className="mt-4 text-3xl font-bold">
            Double-blind and confidential assessment
          </h2>

          <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
            <p>
              Under the double-blind model, authors are not
              informed of reviewer identities and reviewers are
              not informed of author identities.
            </p>

            <p>
              Authors must remove names, affiliations,
              acknowledgements and other identifying details
              from the review version of the manuscript.
            </p>

            <p>
              Reviewers must treat the manuscript and all
              associated materials as confidential and must not
              use unpublished information for personal,
              professional or competitive advantage.
            </p>
          </div>
        </article>

        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
          <h2 className="text-xl font-bold text-amber-950">
            Core principles
          </h2>

          <ul className="mt-6 space-y-4 leading-7 text-amber-900">
            <li>Editorial independence</li>
            <li>Reviewer confidentiality</li>
            <li>Impartial assessment</li>
            <li>Conflict-of-interest disclosure</li>
            <li>Constructive feedback</li>
            <li>Timely review</li>
            <li>Respectful professional conduct</li>
          </ul>
        </aside>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Review Workflow
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              How manuscripts are assessed
            </h2>
          </div>

          <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
            {reviewStages.map((stage) => (
              <article
                key={stage.number}
                className="rounded-2xl border bg-white p-7 shadow-sm"
              >
                <p className="text-3xl font-bold text-amber-500">
                  {stage.number}
                </p>

                <h3 className="mt-4 text-xl font-bold">
                  {stage.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-700">
                  {stage.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Editorial Decisions
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Possible outcomes after review
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {decisionTypes.map((decision) => (
            <article
              key={decision.title}
              className="rounded-2xl border bg-white p-7 shadow-sm"
            >
              <h3 className="text-xl font-bold">
                {decision.title}
              </h3>

              <p className="mt-4 leading-7 text-slate-700">
                {decision.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-3">
          <PolicyCard
            title="Reviewer responsibilities"
            items={[
              "Accept assignments only within relevant expertise.",
              "Declare conflicts before accepting a review.",
              "Provide objective and evidence-based comments.",
              "Avoid hostile, discriminatory or personal language.",
              "Do not contact authors directly about the manuscript.",
              "Submit reports within the agreed period.",
            ]}
          />

          <PolicyCard
            title="Author responsibilities"
            items={[
              "Submit an anonymised review manuscript.",
              "Respond carefully to reviewer comments.",
              "Identify all changes in the revised manuscript.",
              "Provide a point-by-point response document.",
              "Disclose conflicts, funding and relevant ethical approvals.",
              "Avoid simultaneous submission to another journal.",
            ]}
          />

          <PolicyCard
            title="Editor responsibilities"
            items={[
              "Select suitably qualified and independent reviewers.",
              "Protect confidential information.",
              "Manage conflicts of interest.",
              "Evaluate reviews critically rather than automatically.",
              "Make decisions on scholarly merit and journal policy.",
              "Respond appropriately to ethical concerns and complaints.",
            ]}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-2">
        <article className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">
            Reviewer selection
          </h2>

          <p className="mt-5 leading-8 text-slate-700">
            Reviewers are selected using subject expertise,
            publication history, research profile, previous
            reviewing experience, availability and independence
            from the authors or institutions involved.
          </p>

          <p className="mt-4 leading-8 text-slate-700">
            Editors should avoid reviewers with recent
            collaboration, supervisory, financial, personal or
            competitive relationships that may affect impartiality.
          </p>
        </article>

        <article className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">
            Review timeframe
          </h2>

          <p className="mt-5 leading-8 text-slate-700">
            Reviewers are normally given a defined review period.
            Extensions may be granted where justified and
            communicated promptly.
          </p>

          <p className="mt-4 leading-8 text-slate-700">
            Actual decision times depend on reviewer availability,
            manuscript complexity, revision quality and the need
            for additional review rounds.
          </p>
        </article>

        <article className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">
            Conflicts of interest
          </h2>

          <p className="mt-5 leading-8 text-slate-700">
            Reviewers and editors must disclose any circumstance
            that could reasonably be perceived as affecting
            objectivity. Where necessary, the assignment will be
            declined or reassigned.
          </p>
        </article>

        <article className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">
            Appeals and complaints
          </h2>

          <p className="mt-5 leading-8 text-slate-700">
            Authors may submit a reasoned appeal where they believe
            a material error occurred in the review or decision
            process. Disagreement alone does not guarantee
            reconsideration.
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Review Criteria
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            What reviewers assess
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-700">
            Reviewers are asked to evaluate each manuscript against the
            following criteria when forming a recommendation.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviewCriteria.map((criterion) => (
            <article
              key={criterion.title}
              className="rounded-2xl border bg-white p-7 shadow-sm"
            >
              <h3 className="text-xl font-bold">
                {criterion.title}
              </h3>

              <p className="mt-4 leading-7 text-slate-700">
                {criterion.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Reviewer Recognition
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              How the journal recognises reviewers
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-700">
              Reviewing is a scholarly contribution in its own right.
              IJKRI recognises reviewers in several ways.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border bg-white p-7 shadow-sm">
              <h3 className="text-xl font-bold">
                Digital certificates
              </h3>

              <p className="mt-4 leading-7 text-slate-700">
                Reviewers can generate a certificate for each completed
                review from their reviewer dashboard.
              </p>
            </article>

            <article className="rounded-2xl border bg-white p-7 shadow-sm">
              <h3 className="text-xl font-bold">
                Reviewer Ambassador Programme
              </h3>

              <p className="mt-4 leading-7 text-slate-700">
                Active reviewers can take part in the journal&apos;s
                referral programme and track their standing on the
                public{" "}
                <Link
                  href="/leaderboard"
                  className="font-semibold text-amber-700 hover:underline"
                >
                  reviewer leaderboard
                </Link>
                .
              </p>
            </article>

            <article className="rounded-2xl border bg-white p-7 shadow-sm">
              <h3 className="text-xl font-bold">
                Reviewer profile
              </h3>

              <p className="mt-4 leading-7 text-slate-700">
                Consistent, high-quality reviewers can track their
                performance and standing from their{" "}
                <Link
                  href="/reviewer/performance"
                  className="font-semibold text-amber-700 hover:underline"
                >
                  reviewer performance dashboard
                </Link>
                .
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold">
              Contribute to the peer-review process
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              Qualified researchers may apply to join the
              journal’s reviewer community.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/reviewer/apply"
                className="rounded-lg bg-amber-500 px-7 py-3 font-semibold text-slate-950 hover:bg-amber-400"
              >
                Become a Reviewer
              </Link>

              <Link
                href="/author-guidelines"
                className="rounded-lg border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-50"
              >
                Author Guidelines
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
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900 p-7">
      <h2 className="text-xl font-bold text-amber-300">
        {title}
      </h2>

      <ul className="mt-5 space-y-3 leading-7 text-slate-300">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3"
          >
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
