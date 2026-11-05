import Link from "next/link";

/*
 * Public, indexable landing page for the toolkit, shown to logged-out
 * visitors (and search engines). Logged-in students get the workbench.
 */

export const TOOLKIT_FAQ = [
    {
        question: "Is the research topic checker free?",
        answer: "Yes. Create a free account to check your topic, build topics from your variables, and preview your objectives plan. A small one-time payment unlocks the full plan, topic suggestions and topic reservation.",
    },
    {
        question: "How do I know if my project topic is researchable?",
        answer: "A researchable topic names a clear independent variable (the cause), a measurable dependent variable (the outcome), a population and a location, and avoids vague phrases such as \"the role of\" or \"an assessment of\". The checker flags each of these problems and tells you how to fix them.",
    },
    {
        question: "Can it write my specific objectives, research questions and hypotheses?",
        answer: "Yes. Choose how many specific objectives you need (2 to 8). The workbench breaks your independent and dependent variables into measurable proxies and writes one objective, research question and null hypothesis for each, worded consistently.",
    },
    {
        question: "Does it suggest validated scales for my variables?",
        answer: "Yes. For questionnaire variables it sources a validated measurement scale from the literature, such as the Multifactor Leadership Questionnaire for transformational leadership. For variables that need secondary data, such as return on assets, it states the data source and formula instead. Always confirm each citation in the original paper.",
    },
    {
        question: "Which degree levels is it for?",
        answer: "ND, HND, BSc, PGD, MSc, MPhil and PhD students writing a research project, dissertation or thesis, especially in management, social and health sciences.",
    },
] as const;

const FEATURES = [
    {
        title: "Research topic checker",
        body: "Flags a missing independent or dependent variable, vague phrasing, unmeasurable constructs and mismatched sub-variables — before your supervisor does.",
    },
    {
        title: "Build a topic from your variables",
        body: "Enter the variables you are interested in and get three well-formulated project topics, each with its variables broken into standard dimensions.",
    },
    {
        title: "Specific objectives generator",
        body: "Pick how many specific objectives you need. Get aligned objectives, research questions and null hypotheses for Chapter One.",
    },
    {
        title: "Validated scales and secondary data",
        body: "Each proxy comes with a validated scale from the literature, or the secondary data source and formula when a questionnaire won't work.",
    },
    {
        title: "Theory, framework and methodology",
        body: "Underpinning theories, a conceptual framework, and a methodology outline that matches your data: design, sampling, instrument and analysis.",
    },
    {
        title: "Topic reservation",
        body: "Lock your topic with a timestamped first claim so no one else in the pool takes the same variables, sector and location.",
    },
];

export type LandingVariableGuide = { slug: string; name: string };

export default function ToolkitLanding({
    variableGuides = [],
}: {
    variableGuides?: LandingVariableGuide[];
}) {
    const signupHref = "/register";
    const loginHref = `/login?callbackUrl=${encodeURIComponent("/toolkit")}`;

    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "IJKRI Research Topic Formulation Workbench",
            url: "https://www.ijkri.org/toolkit",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Any",
            description:
                "Free research topic checker and specific objectives generator for project, dissertation and thesis students.",
            offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free topic check and plan preview",
            },
            publisher: {
                "@type": "Organization",
                name: "International Journal of Knowledge, Research and Innovation",
                url: "https://www.ijkri.org",
            },
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: TOOLKIT_FAQ.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
        },
    ];

    return (
        <main className="bg-white">
            <script
                type="application/ld+json"
                // Static content defined above, not user input.
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData),
                }}
            />

            <section className="relative overflow-hidden bg-slate-950 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

                <div className="relative mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
                        Free for students
                    </p>

                    <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                        Research Topic Checker &amp; Objectives Generator
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                        Check your project topic in seconds, then turn your
                        variables into specific objectives, research
                        questions and hypotheses — with validated scales
                        from the literature. Built by the International
                        Journal of Knowledge, Research and Innovation.
                    </p>

                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Link
                            href={signupHref}
                            className="rounded-lg bg-amber-500 px-8 py-4 text-lg font-bold text-slate-950 hover:bg-amber-400"
                        >
                            Check my topic free
                        </Link>

                        <Link
                            href={loginHref}
                            className="rounded-lg border border-slate-600 px-8 py-4 text-lg font-semibold text-white hover:border-white"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
                <h2 className="text-center text-3xl font-bold">
                    Everything you need for Chapter One
                </h2>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="rounded-2xl border border-slate-200 p-6"
                        >
                            <h3 className="text-lg font-bold">
                                {feature.title}
                            </h3>

                            <p className="mt-2 leading-7 text-slate-600">
                                {feature.body}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-slate-50">
                <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
                    <h2 className="text-3xl font-bold">How it works</h2>

                    <ol className="mt-6 list-decimal space-y-3 pl-6 text-lg leading-8 text-slate-700">
                        <li>
                            Type your working topic, or just the
                            independent and dependent variables you want
                            to study.
                        </li>
                        <li>
                            Get your formulation checklist and variable
                            breakdown instantly.
                        </li>
                        <li>
                            Choose how many specific objectives you need
                            and preview your plan free.
                        </li>
                        <li>
                            Unlock the full plan — every objective,
                            proxy, scale, theory and methodology step —
                            with a one-time payment.
                        </li>
                    </ol>
                </div>
            </section>

            {variableGuides.length > 0 ? (
                <section className="mx-auto max-w-6xl px-6 pt-16 lg:px-8">
                    <h2 className="text-3xl font-bold">
                        Popular research variables
                    </h2>

                    <p className="mt-2 text-slate-600">
                        Dimensions, validated scales and example topics for
                        each.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {variableGuides.map((guide) => (
                            <Link
                                key={guide.slug}
                                href={`/variables/${guide.slug}`}
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:border-amber-500 hover:bg-amber-50"
                            >
                                {guide.name}
                            </Link>
                        ))}

                        <Link
                            href="/variables"
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            All variables →
                        </Link>
                    </div>
                </section>
            ) : null}

            <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
                <h2 className="text-3xl font-bold">
                    Frequently asked questions
                </h2>

                <div className="mt-8 space-y-6">
                    {TOOLKIT_FAQ.map((item) => (
                        <div key={item.question}>
                            <h3 className="text-lg font-bold">
                                {item.question}
                            </h3>

                            <p className="mt-2 leading-7 text-slate-600">
                                {item.answer}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                    <h2 className="text-2xl font-bold text-amber-950">
                        Will your topic pass?
                    </h2>

                    <p className="mt-2 text-amber-900">
                        Find out free before your proposal defence.
                    </p>

                    <Link
                        href={signupHref}
                        className="mt-6 inline-block rounded-lg bg-amber-500 px-8 py-4 font-bold text-slate-950 hover:bg-amber-400"
                    >
                        Check my topic free
                    </Link>

                    <p className="mt-4 text-sm text-amber-900">
                        More guides on methodology and analysis in our{" "}
                        <Link href="/resources" className="underline">
                            Research Resources
                        </Link>
                        .
                    </p>
                </div>
            </section>
        </main>
    );
}
