import Link from "next/link";

import { COUNTRIES } from "@/lib/constants/countries";

const contactDepartments = [
  {
    title: "Editorial Office",
    description:
      "For manuscript suitability, editorial screening, peer-review progress and decision-related enquiries.",
    email: "editor@IJKRI.org",
    items: [
      "Manuscript enquiries",
      "Review status",
      "Editorial decisions",
      "Scope clarification",
    ],
  },
  {
    title: "Technical Support",
    description:
      "For assistance with accounts, login, registration and submission-platform problems.",
    email: "support@IJKRI.org",
    items: [
      "Account access",
      "Submission errors",
      "Password recovery",
      "File-upload problems",
    ],
  },
  {
    title: "Publication Office",
    description:
      "For accepted manuscripts, production stages, article metadata and publication scheduling.",
    email: "publication@IJKRI.org",
    items: [
      "Accepted papers",
      "Copyediting and proofs",
      "DOI enquiries",
      "Publication schedule",
    ],
  },
  {
    title: "Reviewer Support",
    description:
      "For reviewer invitations, assignment deadlines, technical support and reviewer recognition.",
    email: "reviewers@IJKRI.org",
    items: [
      "Review invitations",
      "Deadline extensions",
      "Reviewer applications",
      "Certificates and records",
    ],
  },
];

const enquiryCategories = [
  "General Enquiry",
  "Manuscript Submission",
  "Technical Support",
  "Editorial Enquiry",
  "Publication Enquiry",
  "Reviewer Enquiry",
  "Complaint",
  "Suggestion",
];

const frequentlyAskedQuestions = [
  {
    question: "How do I submit a manuscript?",
    answer:
      "Create an author account, read the author guidelines and submit your manuscript through the online author submission page.",
  },
  {
    question: "How long does peer review take?",
    answer:
      "Review time varies according to the subject area, reviewer availability and revision requirements. Authors can monitor progress through their dashboard.",
  },
  {
    question: "How can I become a reviewer?",
    answer:
      "Use the reviewer application page and provide your academic qualifications, affiliation, research fields, publication profile and areas of expertise.",
  },
  {
    question: "How do I submit a revised manuscript?",
    answer:
      "Open the relevant submission in your author dashboard, review the editor’s instructions and upload the revised manuscript with a point-by-point response.",
  },
  {
    question: "Will my article receive a DOI?",
    answer:
      "Eligible published articles may receive a DOI after the article metadata has been approved and successfully registered.",
  },
  {
    question: "How should I cite an IJKRI article?",
    answer:
      "Use the complete author names, publication year, article title, journal title, volume, issue, page or article number and DOI where available.",
  },
];

export default function ContactPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
            Contact IJKRI
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Contact the Editorial Office
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Authors, reviewers, readers, editors, institutions and
            research partners may contact IJKRI for editorial, technical,
            publication or general enquiries.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/author/submit"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Submit Manuscript
            </Link>

            <Link
              href="/reviewer/apply"
              className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
            >
              Become a Reviewer
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-6">
          <article className="rounded-2xl border bg-slate-50 p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Editorial Office
            </p>

            <h2 className="mt-4 text-2xl font-bold">
              International Journal of Knowledge, Research and Innovation
            </h2>

            <p className="mt-3 leading-7 text-slate-700">
              Published by Innovare Academic Publishing
            </p>

            <dl className="mt-7 space-y-5">
              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  General email
                </dt>
                <dd className="mt-1 font-semibold">
                  editor@IJKRI.org
                </dd>
              </div>

              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Technical support
                </dt>
                <dd className="mt-1 font-semibold">
                  support@IJKRI.org
                </dd>
              </div>

              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Telephone
                </dt>
                <dd className="mt-1 font-semibold">
                  +1757 692 6972
                </dd>
              </div>

              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  WhatsApp
                </dt>
                <dd className="mt-1 font-semibold">
                  +1757 692 6972
                </dd>
              </div>

              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Office hours
                </dt>
                <dd className="mt-1 font-semibold">
                  Monday–Friday, 09:00–17:00 WAT
                </dd>
              </div>

              <div>
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Expected response time
                </dt>
                <dd className="mt-1 font-semibold">
                  Usually within two business days
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <h2 className="text-xl font-bold text-amber-950">
              Before contacting us
            </h2>

            <ul className="mt-5 space-y-3 text-sm leading-6 text-amber-900">
              <li>
                Include the manuscript title and submission ID when asking
                about an existing submission.
              </li>
              <li>
                Use the email address connected to your IJKRI account.
              </li>
              <li>
                Do not submit the same enquiry repeatedly within a short
                period.
              </li>
              <li>
                Do not send a manuscript by email unless the editorial office
                specifically requests it.
              </li>
            </ul>
          </article>
        </aside>

        <section className="rounded-2xl border bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Send an Enquiry
          </p>

          <h2 className="mt-4 text-3xl font-bold">
            Contact form
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Complete the form below and provide enough information for the
            appropriate team to respond.
          </p>

          <form className="mt-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block font-semibold"
                >
                  Full name *
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="institution"
                  className="mb-2 block font-semibold"
                >
                  Institution or organisation
                </label>

                <input
                  id="institution"
                  name="institution"
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
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

            <div>
              <label
                htmlFor="category"
                className="mb-2 block font-semibold"
              >
                Enquiry category *
              </label>

              <select
                id="category"
                name="category"
                required
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="" disabled>
                  Select a category
                </option>

                {enquiryCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="subject"
                className="mb-2 block font-semibold"
              >
                Subject *
              </label>

              <input
                id="subject"
                name="subject"
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="Briefly state the purpose of your enquiry"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block font-semibold"
              >
                Message *
              </label>

              <textarea
                id="message"
                name="message"
                rows={8}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="Provide the relevant details..."
              />
            </div>

            <div>
              <label
                htmlFor="attachmentUrl"
                className="mb-2 block font-semibold"
              >
                Supporting file URL
              </label>

              <input
                id="attachmentUrl"
                name="attachmentUrl"
                type="url"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="https://..."
              />

              <p className="mt-2 text-sm text-slate-500">
                Direct file upload will be added when permanent storage is
                connected.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
              <input
                type="checkbox"
                name="consent"
                value="true"
                required
                className="mt-1"
              />

              <span className="text-sm leading-6 text-slate-700">
                I confirm that the information provided is accurate and may be
                used to respond to this enquiry.
              </span>
            </label>

            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-7 py-3 font-bold text-slate-950 transition hover:bg-amber-400"
            >
              Send Enquiry
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            The form interface is ready. Its database action and email
            notification will be connected in the next backend step.
          </div>
        </section>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Contact Departments
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Direct your enquiry to the right team
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {contactDepartments.map((department) => (
              <article
                key={department.title}
                className="rounded-2xl border bg-white p-7 shadow-sm"
              >
                <h3 className="text-xl font-bold">
                  {department.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {department.description}
                </p>

                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  {department.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-amber-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 break-all font-semibold text-amber-700">
                  {department.email}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2">
        <article>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Office Location
          </p>

          <h2 className="mt-4 text-3xl font-bold">
            Innovare Academic Publishing
          </h2>

        </article>

        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:min-h-80">
          <div>
            <p className="text-xl font-bold text-slate-800">
              Map Location
            </p>

            <p className="mt-3 max-w-md leading-7 text-slate-600">
              A Google Maps embed can be added here after the permanent office
              address and map coordinates are confirmed.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
              Frequently Asked Questions
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Common journal enquiries
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {frequentlyAskedQuestions.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-7"
              >
                <h3 className="text-xl font-bold text-amber-300">
                  {item.question}
                </h3>

                <p className="mt-4 leading-7 text-slate-300">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Explore IJKRI
            </p>

            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold">
              Submit, review or read research with IJKRI
            </h2>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/author/submit"
                className="rounded-lg bg-amber-500 px-7 py-3 font-semibold text-slate-950 hover:bg-amber-400"
              >
                Submit Manuscript
              </Link>

              <Link
                href="/reviewer/apply"
                className="rounded-lg bg-slate-950 px-7 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Become a Reviewer
              </Link>

              <Link
                href="/register"
                className="rounded-lg border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-50"
              >
                Register
              </Link>

              <Link
                href="/current-issue"
                className="rounded-lg border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-50"
              >
                View Current Issue
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

