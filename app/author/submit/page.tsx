import { requireAnyRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";

import { submitManuscript } from "./actions";

export default async function SubmitManuscriptPage() {
  await requireAnyRole(AUTHOR_ROLES);

  return (
    <main className="container mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-4 text-4xl font-bold">
        Submit Manuscript
      </h1>

      <p className="mb-8 text-gray-600">
        Submit your manuscript to the International Journal of Knowledge,
        Research and Innovation (IJKRI).
      </p>

      <form action={submitManuscript} className="space-y-8">

        {/* ===========================
            MANUSCRIPT DETAILS
        ============================ */}

        <div>
          <label
            htmlFor="title"
            className="mb-2 block font-medium"
          >
            Manuscript Title
          </label>

          <input
            id="title"
            type="text"
            name="title"
            required
            className="w-full rounded-lg border p-3"
            placeholder="Enter manuscript title"
          />
        </div>

        <div>
          <label
            htmlFor="abstract"
            className="mb-2 block font-medium"
          >
            Abstract
          </label>

          <textarea
            id="abstract"
            name="abstract"
            rows={8}
            required
            className="w-full rounded-lg border p-3"
            placeholder="Enter abstract"
          />
        </div>

        <div>
          <label
            htmlFor="manuscriptType"
            className="mb-2 block font-medium"
          >
            Manuscript Type
          </label>

          <select
            id="manuscriptType"
            name="manuscriptType"
            required
            className="w-full rounded-lg border p-3"
          >
            <option value="">
              Select manuscript type
            </option>

            <option value="Research Article">
              Research Article
            </option>

            <option value="Review Article">
              Review Article
            </option>

            <option value="Short Communication">
              Short Communication
            </option>

            <option value="Case Study">
              Case Study
            </option>
          </select>
        </div>

        {/* ===========================
            AUTHORS
        ============================ */}

        <div className="rounded-xl border p-6 bg-gray-50 space-y-6">
          <h2 className="text-2xl font-semibold">
            Authors
          </h2>

          <p className="text-sm text-gray-600">
            Enter all authors exactly as they should appear in the published article.
            The first author should be the corresponding author.
          </p>

          {/* Author 1 */}

          <div className="rounded-lg border bg-white p-5 space-y-4">

            <h3 className="font-semibold">
              Author 1 (Corresponding Author)
            </h3>

            <div>
              <label className="mb-1 block font-medium">
                Full Name
              </label>

              <input
                name="authorName[]"
                required
                className="w-full rounded-lg border p-3"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Email
              </label>

              <input
                type="email"
                name="authorEmail[]"
                required
                className="w-full rounded-lg border p-3"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Affiliation
              </label>

              <input
                name="authorAffiliation[]"
                className="w-full rounded-lg border p-3"
                placeholder="Department, University"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Country
              </label>

              <input
                name="authorCountry[]"
                className="w-full rounded-lg border p-3"
                placeholder="Nigeria"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                ORCID
              </label>

              <input
                name="authorOrcid[]"
                className="w-full rounded-lg border p-3"
                placeholder="0000-0000-0000-0000"
              />
            </div>

          </div>

          {/* Author 2 */}

          <div className="rounded-lg border bg-white p-5 space-y-4">

            <h3 className="font-semibold">
              Author 2 (Optional)
            </h3>

            <div>
              <label className="mb-1 block font-medium">
                Full Name
              </label>

              <input
                name="authorName[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Email
              </label>

              <input
                type="email"
                name="authorEmail[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Affiliation
              </label>

              <input
                name="authorAffiliation[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Country
              </label>

              <input
                name="authorCountry[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                ORCID
              </label>

              <input
                name="authorOrcid[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

          </div>

          {/* Author 3 */}

          <div className="rounded-lg border bg-white p-5 space-y-4">

            <h3 className="font-semibold">
              Author 3 (Optional)
            </h3>

            <div>
              <label className="mb-1 block font-medium">
                Full Name
              </label>

              <input
                name="authorName[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Email
              </label>

              <input
                type="email"
                name="authorEmail[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Affiliation
              </label>

              <input
                name="authorAffiliation[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                Country
              </label>

              <input
                name="authorCountry[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium">
                ORCID
              </label>

              <input
                name="authorOrcid[]"
                className="w-full rounded-lg border p-3"
              />
            </div>

          </div>

        </div>

        {/* ===========================
            MANUSCRIPT FILE
        ============================ */}

        <div className="space-y-2">

          <label
            htmlFor="manuscriptFile"
            className="block font-medium"
          >
            Manuscript File
          </label>

          <input
            id="manuscriptFile"
            name="manuscriptFile"
            type="file"
            accept=".pdf,.doc,.docx"
            required
            className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-black file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-gray-800"
          />

          <p className="text-sm text-gray-500">
            Upload PDF, DOC or DOCX. Maximum size: 20 MB.
          </p>

        </div>

        <button
          type="submit"
          className="rounded-lg bg-black px-8 py-3 font-semibold text-white hover:bg-gray-800"
        >
          Submit Manuscript
        </button>

      </form>
    </main>
  );
}