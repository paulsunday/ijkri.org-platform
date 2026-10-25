import Link from "next/link";

import { COUNTRIES } from "@/lib/constants/countries";
import { HoneypotField } from "@/components/forms/honeypot-field";

import { submitReviewerApplication } from "./actions";

type ReviewerApplicationPageProps = {
    searchParams: Promise<{
        submitted?: string;
        existing?: string;
    }>;
};

const fields = [
    "Management and organisational studies",
    "Business and entrepreneurship",
    "Leadership and human resource management",
    "Economics and finance",
    "Marketing and consumer research",
    "Public administration and policy",
    "Education and educational management",
    "Information technology and digital innovation",
    "Engineering and applied technology",
    "Environmental sustainability",
    "Health and healthcare management",
    "Social sciences and interdisciplinary studies",
];

export default async function ReviewerApplicationPage({
    searchParams,
}: ReviewerApplicationPageProps) {
    const { submitted, existing } =
        await searchParams;

    return (
        <main className="bg-white text-slate-950">
            <section className="border-b bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
                        Reviewer Centre
                    </p>

                    <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        Apply to Become an IJKRI Reviewer
                    </h1>

                    <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                        IJKRI welcomes qualified researchers and
                        professionals who can provide independent,
                        constructive and ethical evaluations of scholarly
                        manuscripts.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.75fr_1.25fr]">
                <aside className="space-y-6">
                    <article className="rounded-2xl border bg-slate-50 p-7">
                        <h2 className="text-2xl font-bold">
                            Reviewer expectations
                        </h2>

                        <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
                            <li>
                                Hold relevant academic or professional
                                expertise.
                            </li>

                            <li>
                                Evaluate manuscripts objectively and
                                confidentially.
                            </li>

                            <li>
                                Declare conflicts of interest promptly.
                            </li>

                            <li>
                                Provide clear and constructive comments.
                            </li>

                            <li>
                                Meet agreed review deadlines.
                            </li>

                            <li>
                                Follow journal ethics and peer-review policy.
                            </li>
                        </ul>
                    </article>

                    <article className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
                        <h2 className="font-bold text-amber-950">
                            Account requirement
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-amber-900">
                            You may submit an application before registering,
                            but using the same email as your IJKRI account
                            allows the application to be linked automatically.
                        </p>

                        <Link
                            href="/register"
                            className="mt-5 inline-flex font-semibold text-amber-800 hover:underline"
                        >
                            Create an account →
                        </Link>
                    </article>
                </aside>

                <div className="rounded-2xl border bg-white p-7 shadow-sm sm:p-10">
                    <h2 className="text-3xl font-bold">
                        Reviewer application
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Provide accurate information that allows the
                        editorial team to assess your expertise.
                    </p>

                    {submitted && (
                        <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-5 text-green-800">
                            Your reviewer application has been submitted
                            successfully. The editorial office will review it
                            before assigning reviewer access.
                        </div>
                    )}

                    {existing && (
                        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-900">
                            An application already exists for this email.
                            Current status:{" "}
                            <strong>
                                {existing.replaceAll("_", " ")}
                            </strong>
                            .
                        </div>
                    )}

                    <form
                        action={submitReviewerApplication}
                        className="mt-8 space-y-8"
                    >
                        <HoneypotField />

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Personal and institutional information
                            </legend>

                            <div className="grid gap-6 md:grid-cols-2">
                                <Input
                                    label="Full name"
                                    name="fullName"
                                    required
                                />

                                <Input
                                    label="Email address"
                                    name="email"
                                    type="email"
                                    required
                                />

                                <Input
                                    label="Phone number"
                                    name="phone"
                                    type="tel"
                                />

                                <Select
                                    label="Country"
                                    name="country"
                                    options={COUNTRIES}
                                    required
                                />

                                <Input
                                    label="Institution or affiliation"
                                    name="affiliation"
                                    required
                                />

                                <Input
                                    label="Department"
                                    name="department"
                                />

                                <Input
                                    label="Current position"
                                    name="currentPosition"
                                    required
                                />

                                <Input
                                    label="Highest qualification"
                                    name="highestQualification"
                                    required
                                />
                            </div>
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Research expertise
                            </legend>

                            <div>
                                <label
                                    htmlFor="primaryField"
                                    className="mb-2 block font-semibold"
                                >
                                    Primary field *
                                </label>

                                <select
                                    id="primaryField"
                                    name="primaryField"
                                    required
                                    defaultValue=""
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                >
                                    <option value="" disabled>
                                        Select your primary field
                                    </option>

                                    {fields.map((field) => (
                                        <option
                                            key={field}
                                            value={field}
                                        >
                                            {field}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Textarea
                                label="Secondary fields"
                                name="secondaryFields"
                                rows={3}
                                placeholder="List related disciplines or specialisations."
                            />

                            <Textarea
                                label="Areas of expertise"
                                name="areasOfExpertise"
                                rows={5}
                                required
                                placeholder="List specific topics, methods, industries, theories or research areas you can review."
                            />

                            <Textarea
                                label="Research interests"
                                name="researchInterests"
                                rows={4}
                            />

                            <Textarea
                                label="Preferred manuscript topics"
                                name="preferredTopics"
                                rows={4}
                            />
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Experience and scholarly profile
                            </legend>

                            <div className="grid gap-6 md:grid-cols-3">
                                <Input
                                    label="Years of research experience"
                                    name="yearsResearchExperience"
                                    type="number"
                                    min="0"
                                    required
                                />

                                <Input
                                    label="Years of review experience"
                                    name="yearsReviewExperience"
                                    type="number"
                                    min="0"
                                />

                                <Input
                                    label="Approximate publication count"
                                    name="publicationCount"
                                    type="number"
                                    min="0"
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <Input
                                    label="ORCID iD"
                                    name="orcid"
                                    placeholder="0000-0000-0000-0000"
                                />

                                <Input
                                    label="Scopus Author ID"
                                    name="scopusId"
                                />

                                <Input
                                    label="Web of Science Researcher ID"
                                    name="webOfScienceId"
                                />

                                <Input
                                    label="Professional profile URL"
                                    name="profileUrl"
                                    type="url"
                                />

                                <Input
                                    label="Google Scholar profile URL"
                                    name="googleScholarUrl"
                                    type="url"
                                />

                                <Input
                                    label="ResearchGate profile URL"
                                    name="researchGateUrl"
                                    type="url"
                                />
                            </div>

                            <Textarea
                                label="Previous journals reviewed for"
                                name="journalsReviewedFor"
                                rows={4}
                            />
                        </fieldset>

                        <fieldset className="space-y-6">
                            <legend className="text-xl font-bold">
                                Supporting information
                            </legend>

                            <Textarea
                                label="Professional statement"
                                name="professionalStatement"
                                rows={7}
                                required
                                placeholder="Explain why you wish to review for IJKRI and how your expertise supports the journal."
                            />

                            <Textarea
                                label="Availability"
                                name="availability"
                                rows={3}
                                placeholder="For example: up to two manuscripts per quarter."
                            />

                            <div className="grid gap-6 md:grid-cols-2">
                                <Input
                                    label="CV URL"
                                    name="cvUrl"
                                    type="url"
                                    placeholder="https://..."
                                />

                                <Input
                                    label="Recent publication URL"
                                    name="recentPublicationUrl"
                                    type="url"
                                    placeholder="https://..."
                                />
                            </div>

                            <p className="text-sm leading-6 text-slate-500">
                                Direct CV upload will be connected after the
                                permanent file-storage service is configured.
                            </p>
                        </fieldset>

                        <fieldset className="space-y-4">
                            <legend className="text-xl font-bold">
                                Declarations
                            </legend>

                            <Declaration
                                name="conflictDeclaration"
                                text="I will declare any conflict of interest before accepting a review assignment."
                            />

                            <Declaration
                                name="ethicsAgreement"
                                text="I agree to maintain confidentiality and follow the journal’s reviewer and publication-ethics policies."
                            />

                            <Declaration
                                name="dataConsent"
                                text="I consent to IJKRI storing and processing this information for reviewer recruitment and editorial administration."
                            />
                        </fieldset>

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-amber-500 px-7 py-3 font-bold text-slate-950 hover:bg-amber-400"
                        >
                            Submit Reviewer Application
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}

type InputProps = {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    min?: string;
};

function Input({
    label,
    name,
    type = "text",
    required = false,
    placeholder,
    min,
}: InputProps) {
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
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
        </div>
    );
}

type SelectProps = {
    label: string;
    name: string;
    options: readonly string[];
    required?: boolean;
};

function Select({
    label,
    name,
    options,
    required = false,
}: SelectProps) {
    return (
        <div>
            <label
                htmlFor={name}
                className="mb-2 block font-semibold"
            >
                {label}
                {required ? " *" : ""}
            </label>

            <select
                id={name}
                name={name}
                required={required}
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
                <option value="" disabled>
                    Select country
                </option>

                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

type TextareaProps = {
    label: string;
    name: string;
    rows: number;
    required?: boolean;
    placeholder?: string;
};

function Textarea({
    label,
    name,
    rows,
    required = false,
    placeholder,
}: TextareaProps) {
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

function Declaration({
    name,
    text,
}: {
    name: string;
    text: string;
}) {
    return (
        <label className="flex items-start gap-3 rounded-lg border p-4">
            <input
                type="checkbox"
                name={name}
                value="true"
                required
                className="mt-1"
            />

            <span className="text-sm leading-6 text-slate-700">
                {text}
            </span>
        </label>
    );
}

