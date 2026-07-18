import Link from "next/link";

import { submitCareerApplication } from "./actions";

const POSITION_OPTIONS = [
    {
        value: "EDITOR_IN_CHIEF",
        label: "Editor-in-Chief",
    },
    {
        value: "MANAGING_EDITOR",
        label: "Managing Editor",
    },
    {
        value: "SECTION_EDITOR",
        label: "Section Editor",
    },
    {
        value: "REVIEWER",
        label: "Reviewer",
    },
    {
        value: "COPYEDITOR",
        label: "Copyeditor",
    },
    {
        value: "PROOFREADER",
        label: "Proofreader",
    },
    {
        value: "TYPESETTER",
        label: "Typesetter",
    },
    {
        value: "EDITORIAL_ASSISTANT",
        label: "Editorial Assistant",
    },
] as const;

type CareerApplicationPageProps = {
    searchParams: Promise<{
        position?: string;
        submitted?: string;
        existing?: string;
    }>;
};

function normalizePosition(value?: string) {
    if (!value) {
        return "";
    }

    const normalized = value
        .trim()
        .toUpperCase()
        .replaceAll("-", "_")
        .replaceAll(" ", "_");

    return POSITION_OPTIONS.some(
        (position) =>
            position.value === normalized,
    )
        ? normalized
        : "";
}

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export default async function CareerApplicationPage({
    searchParams,
}: CareerApplicationPageProps) {
    const {
        position,
        submitted,
        existing,
    } = await searchParams;

    const selectedPosition =
        normalizePosition(position);

    return (
        <main className="bg-white text-slate-950">
            <section className="border-b bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
                        Career Application
                    </p>

                    <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        Apply to Join Innovare Academic Publishing
                    </h1>

                    <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                        Submit your qualifications, professional
                        experience and supporting information for
                        consideration by the International Journal of
                        Knowledge, Research and Innovation.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link
                            href="/careers"
                            className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
                        >
                            View Career Opportunities
                        </Link>

                        <Link
                            href="/reviewer/apply"
                            className="rounded-lg px-6 py-3 font-semibold text-amber-300 transition hover:text-amber-200"
                        >
                            Reviewer Application →
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr]">
                <aside className="space-y-6">
                    <article className="rounded-2xl border bg-slate-50 p-7">
                        <h2 className="text-2xl font-bold">
                            Before you apply
                        </h2>

                        <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
                            <li>
                                Select the position that best matches
                                your qualifications and experience.
                            </li>

                            <li>
                                Provide accurate academic and
                                professional information.
                            </li>

                            <li>
                                Include links to supporting documents
                                where available.
                            </li>

                            <li>
                                Do not submit multiple active
                                applications for the same position.
                            </li>

                            <li>
                                Appointment is subject to verification,
                                screening and editorial approval.
                            </li>

                            <li>
                                Never pay an unofficial fee for
                                consideration or appointment.
                            </li>
                        </ul>
                    </article>

                    <article className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
                        <h2 className="text-xl font-bold text-amber-950">
                            Supporting documents
                        </h2>

                        <p className="mt-4 text-sm leading-6 text-amber-900">
                            You may provide secure URLs for your CV,
                            cover letter, certificates and portfolio.
                            Direct file upload will be added when the
                            permanent storage service is connected.
                        </p>
                    </article>

                    <article className="rounded-2xl border bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-bold">
                            Application review
                        </h2>

                        <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
                            <li>
                                <strong>1. Submission:</strong> Your
                                application is recorded as pending.
                            </li>

                            <li>
                                <strong>2. Screening:</strong> The
                                publisher checks your qualifications and
                                supporting information.
                            </li>

                            <li>
                                <strong>3. Shortlisting:</strong> Suitable
                                applicants may be shortlisted.
                            </li>

                            <li>
                                <strong>4. Assessment:</strong> An
                                interview or practical assessment may be
                                requested.
                            </li>

                            <li>
                                <strong>5. Decision:</strong> You receive
                                an approval or rejection decision.
                            </li>
                        </ol>
                    </article>
                </aside>

                <section className="rounded-2xl border bg-white p-7 shadow-sm sm:p-10">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                        Application Form
                    </p>

                    <h2 className="mt-4 text-3xl font-bold">
                        Professional information
                    </h2>

                    <p className="mt-4 leading-7 text-slate-600">
                        Complete all required fields and provide
                        enough information for a fair assessment.
                    </p>

                    {submitted === "true" && (
                        <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-5 text-green-800">
                            Your application has been submitted
                            successfully. The publishing team will
                            review it before making a decision.
                        </div>
                    )}

                    {existing && (
                        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-900">
                            You already have an active application for
                            this position. Current status:{" "}
                            <strong>
                                {formatStatus(existing)}
                            </strong>
                            .
                        </div>
                    )}

                    <form
                        action={submitCareerApplication}
                        className="mt-8 space-y-10"
                    >
                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Position
                            </legend>

                            <div>
                                <label
                                    htmlFor="position"
                                    className="mb-2 block font-semibold"
                                >
                                    Position applying for *
                                </label>

                                <select
                                    id="position"
                                    name="position"
                                    required
                                    defaultValue={selectedPosition}
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        Select a position
                                    </option>

                                    {POSITION_OPTIONS.map(
                                        (positionOption) => (
                                            <option
                                                key={
                                                    positionOption.value
                                                }
                                                value={
                                                    positionOption.value
                                                }
                                            >
                                                {
                                                    positionOption.label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Personal information
                            </legend>

                            <div className="grid gap-6 md:grid-cols-2">
                                <FormInput
                                    label="Full name"
                                    name="fullName"
                                    required
                                    autoComplete="name"
                                />

                                <FormInput
                                    label="Email address"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                />

                                <FormInput
                                    label="Phone number"
                                    name="phone"
                                    type="tel"
                                    autoComplete="tel"
                                />

                                <FormInput
                                    label="Country"
                                    name="country"
                                    required
                                    autoComplete="country-name"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Institutional and academic information
                            </legend>

                            <div className="grid gap-6 md:grid-cols-2">
                                <FormInput
                                    label="Institution or organisation"
                                    name="affiliation"
                                />

                                <FormInput
                                    label="Department"
                                    name="department"
                                />

                                <FormInput
                                    label="Current position"
                                    name="currentPosition"
                                />

                                <FormInput
                                    label="Highest qualification"
                                    name="highestQualification"
                                    required
                                    placeholder="PhD, MSc, MBA, BSc..."
                                />

                                <FormInput
                                    label="Field of study"
                                    name="fieldOfStudy"
                                />

                                <FormInput
                                    label="Years of relevant experience"
                                    name="yearsExperience"
                                    type="number"
                                    min="0"
                                    required
                                />

                                <FormInput
                                    label="Approximate publication count"
                                    name="publicationCount"
                                    type="number"
                                    min="0"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Expertise and skills
                            </legend>

                            <FormTextarea
                                label="Areas of expertise"
                                name="areasOfExpertise"
                                rows={5}
                                placeholder="List your research fields, subject areas, methods or industries."
                            />

                            <FormTextarea
                                label="Professional skills"
                                name="professionalSkills"
                                rows={5}
                                placeholder="For example: academic editing, APA referencing, peer review, typesetting, project management or statistical analysis."
                            />
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Research and professional profiles
                            </legend>

                            <div className="grid gap-6 md:grid-cols-2">
                                <FormInput
                                    label="ORCID iD"
                                    name="orcid"
                                    placeholder="0000-0000-0000-0000"
                                />

                                <FormInput
                                    label="Scopus Author ID"
                                    name="scopusId"
                                />

                                <FormInput
                                    label="Web of Science Researcher ID"
                                    name="webOfScienceId"
                                />

                                <FormInput
                                    label="Google Scholar URL"
                                    name="googleScholarUrl"
                                    type="url"
                                    placeholder="https://..."
                                />

                                <FormInput
                                    label="ResearchGate URL"
                                    name="researchGateUrl"
                                    type="url"
                                    placeholder="https://..."
                                />

                                <FormInput
                                    label="LinkedIn URL"
                                    name="linkedinUrl"
                                    type="url"
                                    placeholder="https://..."
                                />
                            </div>
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Supporting documents
                            </legend>

                            <div className="grid gap-6 md:grid-cols-2">
                                <FormInput
                                    label="CV URL"
                                    name="cvUrl"
                                    type="url"
                                    placeholder="https://..."
                                />

                                <FormInput
                                    label="Cover letter URL"
                                    name="coverLetterUrl"
                                    type="url"
                                    placeholder="https://..."
                                />

                                <FormInput
                                    label="Certificates URL"
                                    name="certificatesUrl"
                                    type="url"
                                    placeholder="https://..."
                                />

                                <FormInput
                                    label="Portfolio or work samples URL"
                                    name="portfolioUrl"
                                    type="url"
                                    placeholder="https://..."
                                />
                            </div>

                            <p className="text-sm leading-6 text-slate-500">
                                Ensure each link is accessible to the
                                editorial team and does not require an
                                undisclosed password.
                            </p>
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Application statement
                            </legend>

                            <FormTextarea
                                label="Professional statement"
                                name="professionalStatement"
                                rows={8}
                                required
                                placeholder="Explain why you are applying, your relevant experience and the value you would bring to the journal or publisher."
                            />

                            <FormTextarea
                                label="Availability"
                                name="availability"
                                rows={4}
                                placeholder="State your expected availability, workload capacity or preferred working arrangement."
                            />

                            <FormInput
                                label="Salary or compensation expectation"
                                name="salaryExpectation"
                                placeholder="Optional"
                            />
                        </fieldset>

                        <fieldset className="space-y-4">
                            <legend className="text-xl font-bold">
                                Declarations
                            </legend>

                            <DeclarationCheckbox
                                name="declarationAccepted"
                                text="I declare that the qualifications, experience and supporting information submitted in this application are accurate and genuine."
                            />

                            <DeclarationCheckbox
                                name="consentAccepted"
                                text="I consent to Innovare Academic Publishing storing and processing this information for recruitment, screening, communication and appointment administration."
                            />
                        </fieldset>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                            Submitting an application does not guarantee
                            employment, appointment, remuneration or
                            editorial access. Successful applicants may
                            be required to complete additional
                            verification or onboarding.
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-amber-500 px-7 py-4 font-bold text-slate-950 transition hover:bg-amber-400"
                        >
                            Submit Career Application
                        </button>
                    </form>
                </section>
            </section>
        </main>
    );
}

type FormInputProps = {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    min?: string;
    autoComplete?: string;
};

function FormInput({
    label,
    name,
    type = "text",
    required = false,
    placeholder,
    min,
    autoComplete,
}: FormInputProps) {
    return (
        <div>
            <label
                htmlFor={name}
                className="mb-2 block font-semibold"
            >
                {label}
                {required ? " *" : ""}
            </label>

            <input
                id={name}
                name={name}
                type={type}
                required={required}
                placeholder={placeholder}
                min={min}
                autoComplete={autoComplete}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
        </div>
    );
}

type FormTextareaProps = {
    label: string;
    name: string;
    rows: number;
    required?: boolean;
    placeholder?: string;
};

function FormTextarea({
    label,
    name,
    rows,
    required = false,
    placeholder,
}: FormTextareaProps) {
    return (
        <div>
            <label
                htmlFor={name}
                className="mb-2 block font-semibold"
            >
                {label}
                {required ? " *" : ""}
            </label>

            <textarea
                id={name}
                name={name}
                rows={rows}
                required={required}
                placeholder={placeholder}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
        </div>
    );
}

function DeclarationCheckbox({
    name,
    text,
}: {
    name: string;
    text: string;
}) {
    return (
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-5">
            <input
                type="checkbox"
                name={name}
                value="true"
                required
                className="mt-1 h-4 w-4"
            />

            <span className="text-sm leading-6 text-slate-700">
                {text}
            </span>
        </label>
    );
}
