import Link from "next/link";

const opportunities = [
    {
        title: "Editor-in-Chief",
        type: "Editorial Leadership",
        description:
            "Provide strategic academic leadership, oversee editorial policy and maintain the scholarly quality and reputation of the journal.",
        requirements: [
            "PhD or equivalent terminal qualification",
            "Strong publication and citation record",
            "Previous editorial or journal leadership experience",
            "Recognised expertise in a relevant discipline",
            "Commitment to publication ethics and editorial independence",
        ],
    },
    {
        title: "Managing Editor",
        type: "Editorial Operations",
        description:
            "Coordinate the editorial workflow, communicate with authors and reviewers and support the efficient movement of manuscripts through the journal.",
        requirements: [
            "Experience in academic publishing or research administration",
            "Strong written and verbal communication",
            "Ability to manage deadlines and editorial records",
            "Knowledge of peer-review and production workflows",
            "High level of professional judgement and organisation",
        ],
    },
    {
        title: "Section Editor",
        type: "Subject Editorial",
        description:
            "Manage submissions within a defined subject area, select reviewers and make evidence-based editorial recommendations.",
        requirements: [
            "Master's degree or PhD in a relevant field",
            "Subject-area research expertise",
            "Peer-review or editorial experience",
            "Strong academic writing and evaluation skills",
            "Ability to manage conflicts of interest responsibly",
        ],
    },
    {
        title: "Reviewer",
        type: "Peer Review",
        description:
            "Provide confidential, constructive and timely assessments of manuscripts that match your research expertise.",
        requirements: [
            "Relevant postgraduate qualification",
            "Demonstrable research expertise",
            "Academic publications or professional research experience",
            "Ability to provide objective and constructive feedback",
            "Commitment to confidentiality and reviewer ethics",
        ],
    },
    {
        title: "Copyeditor",
        type: "Production",
        description:
            "Improve clarity, consistency, grammar, style, references and presentation while preserving the author's meaning.",
        requirements: [
            "Excellent command of academic English",
            "Knowledge of APA 7th edition",
            "Experience editing scholarly manuscripts",
            "Attention to detail and consistency",
            "Ability to work within production deadlines",
        ],
    },
    {
        title: "Proofreader",
        type: "Production",
        description:
            "Review typeset proofs for language, formatting, citation and layout errors before final publication.",
        requirements: [
            "Excellent grammar and proofreading skills",
            "Experience reviewing academic or professional documents",
            "Ability to identify formatting and citation errors",
            "Strong attention to detail",
            "Reliable turnaround time",
        ],
    },
    {
        title: "Typesetter",
        type: "Production",
        description:
            "Prepare publication-ready article layouts, galley proofs and final PDF files according to journal standards.",
        requirements: [
            "Strong Microsoft Word and PDF production skills",
            "Experience with scholarly document formatting",
            "Knowledge of tables, figures, headings and reference layouts",
            "Adobe Acrobat or equivalent production experience",
            "OJS or journal-platform experience is an advantage",
        ],
    },
    {
        title: "Editorial Assistant",
        type: "Editorial Support",
        description:
            "Support manuscript screening, correspondence, reviewer records, scheduling and general editorial administration.",
        requirements: [
            "Strong administrative and communication skills",
            "Good knowledge of research and academic writing",
            "Ability to maintain accurate records",
            "Professional email and document-management skills",
            "Ability to work confidentially and meet deadlines",
        ],
    },
];

const benefits = [
    {
        title: "Professional Development",
        description:
            "Build practical experience in peer review, editorial decision-making and scholarly publishing.",
    },
    {
        title: "Academic Networking",
        description:
            "Engage with researchers, reviewers, editors and institutions across different disciplines and countries.",
    },
    {
        title: "Recognition",
        description:
            "Eligible contributors may receive appointment letters, certificates and formal recognition of service.",
    },
    {
        title: "Editorial Experience",
        description:
            "Develop experience that supports academic promotion, professional advancement and research leadership.",
    },
    {
        title: "Knowledge Exchange",
        description:
            "Stay informed about emerging research, methods and debates across multidisciplinary fields.",
    },
    {
        title: "Scholarly Impact",
        description:
            "Contribute directly to the quality, credibility and accessibility of published research.",
    },
];

const applicationSteps = [
    {
        number: "01",
        title: "Select a Position",
        description:
            "Review the available opportunities and choose the role that best matches your qualifications and experience.",
    },
    {
        number: "02",
        title: "Submit Your Application",
        description:
            "Provide your professional details, expertise, experience, supporting links and application statement.",
    },
    {
        number: "03",
        title: "Editorial Screening",
        description:
            "The publishing team reviews your qualifications, experience, research profile and suitability for the role.",
    },
    {
        number: "04",
        title: "Interview or Assessment",
        description:
            "Shortlisted candidates may be invited for an interview, practical assessment or additional document review.",
    },
    {
        number: "05",
        title: "Appointment Decision",
        description:
            "Successful applicants receive an appointment decision and onboarding instructions for the relevant platform role.",
    },
];

export default function CareersPage() {
    return (
        <main className="bg-white text-slate-950">
            <section className="border-b bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
                        Careers and Editorial Opportunities
                    </p>

                    <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        Join Innovare Academic Publishing
                    </h1>

                    <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                        Help us advance scholarly communication through the International
                        Journal of Knowledge, Research and Innovation. We welcome qualified
                        academics, researchers and publishing professionals who share our
                        commitment to quality, integrity and accessible knowledge.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link
                            href="#opportunities"
                            className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
                        >
                            View Current Opportunities
                        </Link>

                        <Link
                            href="/reviewer/apply"
                            className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
                        >
                            Apply as Reviewer
                        </Link>

                        <Link
                            href="/contact"
                            className="rounded-lg px-6 py-3 font-semibold text-amber-300 transition hover:text-amber-200"
                        >
                            Contact the Publisher →
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
                <article>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                        Work With Us
                    </p>

                    <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                        Contribute to credible and ethical academic publishing
                    </h2>

                    <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
                        <p>
                            Innovare Academic Publishing is developing a multidisciplinary
                            editorial and production network to support the growth of IJKRI
                            and future scholarly journals.
                        </p>

                        <p>
                            Appointments may be voluntary, part-time, project-based or
                            contract-based depending on the role, workload and current needs
                            of the publisher.
                        </p>

                        <p>
                            Every appointment is subject to qualification review, conflict
                            checks, publication-ethics requirements and formal approval.
                        </p>
                    </div>
                </article>

                <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
                    <h2 className="text-2xl font-bold text-amber-950">
                        General expectations
                    </h2>

                    <ul className="mt-6 space-y-4 leading-7 text-amber-900">
                        <li>Maintain confidentiality and professional conduct.</li>
                        <li>Disclose actual or potential conflicts of interest.</li>
                        <li>Meet agreed deadlines and communicate delays promptly.</li>
                        <li>Follow journal policies and recognised ethical standards.</li>
                        <li>Provide accurate qualifications and professional information.</li>
                        <li>Support fair, inclusive and evidence-based decision-making.</li>
                    </ul>
                </aside>
            </section>

            <section
                id="opportunities"
                className="bg-slate-50"
            >
                <div className="mx-auto max-w-7xl px-6 py-20">
                    <div className="max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                            Current Opportunities
                        </p>

                        <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                            Editorial, review and production roles
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-slate-700">
                            Review each role carefully before applying. Meeting the minimum
                            requirements does not guarantee appointment.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
                        {opportunities.map((opportunity) => (
                            <article
                                key={opportunity.title}
                                className="flex h-full flex-col rounded-2xl border bg-white p-7 shadow-sm"
                            >
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700">
                                        {opportunity.type}
                                    </p>

                                    <h3 className="mt-3 text-2xl font-bold">
                                        {opportunity.title}
                                    </h3>

                                    <p className="mt-4 leading-7 text-slate-700">
                                        {opportunity.description}
                                    </p>

                                    <h4 className="mt-6 font-bold">
                                        Typical requirements
                                    </h4>

                                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                                        {opportunity.requirements.map((requirement) => (
                                            <li
                                                key={requirement}
                                                className="flex gap-3"
                                            >
                                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                                                <span>{requirement}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-auto pt-8">
                                    <Link
                                        href={`/careers/apply?position=${encodeURIComponent(
                                            opportunity.title,
                                        )}`}
                                        className="inline-flex w-full justify-center rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                                    >
                                        Apply for This Position
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20">
                <div className="max-w-3xl">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                        Why Join Us?
                    </p>

                    <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                        Professional and scholarly benefits
                    </h2>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {benefits.map((benefit) => (
                        <article
                            key={benefit.title}
                            className="rounded-2xl border bg-white p-7 shadow-sm"
                        >
                            <div className="h-1 w-14 rounded bg-amber-500" />

                            <h3 className="mt-5 text-xl font-bold">
                                {benefit.title}
                            </h3>

                            <p className="mt-4 leading-7 text-slate-700">
                                {benefit.description}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-20">
                    <div className="max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
                            Application Process
                        </p>

                        <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                            What happens after you apply
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {applicationSteps.map((step) => (
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

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-2">
                <article className="rounded-2xl border bg-white p-8">
                    <h2 className="text-2xl font-bold">
                        Equal and fair consideration
                    </h2>

                    <p className="mt-4 leading-8 text-slate-700">
                        Applications are reviewed on the basis of qualifications,
                        experience, subject expertise, ethical suitability and the current
                        operational needs of the journal.
                    </p>

                    <p className="mt-4 leading-8 text-slate-700">
                        Applicants should not pay any unofficial fee or provide gifts in
                        exchange for appointment or editorial access.
                    </p>
                </article>

                <article className="rounded-2xl border bg-white p-8">
                    <h2 className="text-2xl font-bold">
                        Supporting documents
                    </h2>

                    <p className="mt-4 leading-8 text-slate-700">
                        Depending on the role, applicants may be asked to provide a CV,
                        cover letter, publication profile, qualification evidence, writing
                        sample or references.
                    </p>

                    <p className="mt-4 leading-8 text-slate-700">
                        Submitted documents must be genuine and may be verified before an
                        appointment is confirmed.
                    </p>
                </article>
            </section>

            <section className="bg-amber-50">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center sm:p-12">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                            Apply to Join the Team
                        </p>

                        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold">
                            Bring your expertise to IJKRI
                        </h2>

                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700">
                            Submit your professional information for consideration by the
                            editorial and publishing team.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <Link
                                href="/careers/apply"
                                className="rounded-lg bg-amber-500 px-7 py-3 font-semibold text-slate-950 hover:bg-amber-400"
                            >
                                Apply Now
                            </Link>

                            <Link
                                href="/reviewer/apply"
                                className="rounded-lg bg-slate-950 px-7 py-3 font-semibold text-white hover:bg-slate-800"
                            >
                                Reviewer Application
                            </Link>

                            <Link
                                href="/contact"
                                className="rounded-lg border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-50"
                            >
                                Ask a Question
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
