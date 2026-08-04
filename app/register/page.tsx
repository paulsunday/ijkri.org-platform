import Link from "next/link";

import { COUNTRIES } from "@/lib/constants/countries";

import { registerUser } from "./actions";

type RegisterPageProps = {
    searchParams: Promise<{
        error?: string;
        ref?: string;
    }>;
};

export default async function RegisterPage({
    searchParams,
}: RegisterPageProps) {
    const { error, ref } = await searchParams;

    return (
        <main className="bg-slate-50">
            <section className="border-b bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-14">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
                        Create an IJKRI account
                    </p>

                    <h1 className="mt-4 text-4xl font-bold">
                        Author Registration
                    </h1>

                    <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                        Register to submit manuscripts, track peer review, upload
                        revisions and receive editorial decisions.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.75fr_1.25fr]">
                <aside className="space-y-6">
                    <div className="rounded-2xl border bg-white p-7 shadow-sm">
                        <h2 className="text-2xl font-bold">
                            Your author account
                        </h2>

                        <p className="mt-4 leading-7 text-slate-600">
                            Your registration creates an author profile for the
                            International Journal of Knowledge, Research and Innovation.
                        </p>

                        <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
                            <li className="rounded-lg bg-slate-50 p-4">
                                Submit and manage manuscripts.
                            </li>

                            <li className="rounded-lg bg-slate-50 p-4">
                                Receive peer-review and editorial updates.
                            </li>

                            <li className="rounded-lg bg-slate-50 p-4">
                                Upload revised manuscripts and responses.
                            </li>

                            <li className="rounded-lg bg-slate-50 p-4">
                                Review and approve publication proofs.
                            </li>
                        </ul>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
                        <h2 className="font-bold text-amber-950">
                            Interested in reviewing?
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-amber-900">
                            Register an account first, then submit a reviewer
                            application with your academic qualifications and areas of
                            expertise.
                        </p>

                        <Link
                            href="/reviewer/apply"
                            className="mt-5 inline-flex font-semibold text-amber-800 hover:text-amber-950"
                        >
                            Become a reviewer →
                        </Link>
                    </div>
                </aside>

                <div className="rounded-2xl border bg-white p-7 shadow-sm sm:p-10">
                    <div>
                        <h2 className="text-3xl font-bold">
                            Create your account
                        </h2>

                        <p className="mt-3 text-slate-600">
                            Fields marked with an asterisk are required.
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800"
                        >
                            {error}
                        </div>
                    )}

                    <form
                        action={registerUser}
                        className="mt-8 space-y-6"
                    >
                        {ref && (
                            <>
                                <input type="hidden" name="referralCode" value={ref} />

                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
                                    You were referred by a journal reviewer. Your account
                                    will be linked to their referral.
                                </div>
                            </>
                        )}

                        <div>
                            <label
                                htmlFor="name"
                                className="mb-2 block font-semibold"
                            >
                                Full name *
                            </label>

                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                autoComplete="name"
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block font-semibold"
                            >
                                Email address *
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="affiliation"
                                    className="mb-2 block font-semibold"
                                >
                                    Institution or affiliation
                                </label>

                                <input
                                    id="affiliation"
                                    name="affiliation"
                                    type="text"
                                    autoComplete="organization"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    placeholder="University, company or organisation"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="country"
                                    className="mb-2 block font-semibold"
                                >
                                    Country
                                </label>

                                <select
                                    id="country"
                                    name="country"
                                    autoComplete="country-name"
                                    defaultValue=""
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                >
                                    <option value="">Select country</option>

                                    {COUNTRIES.map((country) => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="mb-2 block font-semibold"
                                >
                                    Phone number
                                </label>

                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    placeholder="Include your international country code"
                                    aria-describedby="phone-help"
                                />

                                <p
                                    id="phone-help"
                                    className="mt-2 text-sm text-slate-500"
                                >
                                    Example format: +1 202 555 0123
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="orcid"
                                    className="mb-2 block font-semibold"
                                >
                                    ORCID iD
                                </label>

                                <input
                                    id="orcid"
                                    name="orcid"
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    placeholder="0000-0000-0000-0000"
                                />
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block font-semibold"
                                >
                                    Password *
                                </label>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="mb-2 block font-semibold"
                                >
                                    Confirm password *
                                </label>

                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                            Your password must contain at least eight characters, one
                            uppercase letter, one lowercase letter and one number.
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                            <input
                                type="checkbox"
                                name="acceptedTerms"
                                value="true"
                                required
                                className="mt-1"
                            />

                            <span className="text-sm leading-6 text-slate-700">
                                I confirm that the information provided is accurate and
                                agree to comply with the{" "}
                                <Link
                                    href="/publication-ethics"
                                    className="font-semibold text-amber-700 hover:underline"
                                >
                                    publication ethics
                                </Link>{" "}
                                and journal policies.
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-400"
                        >
                            Create Author Account
                        </button>
                    </form>

                    <p className="mt-7 text-center text-sm text-slate-600">
                        Already registered?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-amber-700 hover:underline"
                        >
                            Sign in to your account
                        </Link>
                    </p>
                </div>
            </section>
        </main>
    );
}