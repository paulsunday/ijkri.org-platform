import { requireAnyRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";

import { submitManuscript } from "./actions";

export default async function SubmitManuscriptPage() {
  await requireAnyRole(AUTHOR_ROLES);

  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-4 text-4xl font-bold">
        Submit Manuscript
      </h1>

      <p className="mb-8 text-gray-600">
        Submit your manuscript to the International Journal of Knowledge,
        Research and Innovation (IJKRI).
      </p>

      <form action={submitManuscript} className="space-y-6">
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
            className="w-full rounded-lg border p-3"
            placeholder="Enter manuscript title"
            required
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
            className="w-full rounded-lg border p-3"
            placeholder="Enter abstract"
            required
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
            className="w-full rounded-lg border p-3"
            required
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
        <div className="space-y-2">
          <label
            htmlFor="manuscriptFile"
            className="block text-sm font-semibold text-slate-900"
          >
            Manuscript File
          </label>

          <input
            id="manuscriptFile"
            name="manuscriptFile"
            type="file"
            accept=".pdf,.doc,.docx"
            required
            className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-800"
          />

          <p className="text-sm text-slate-500">
            Upload a PDF, DOC, or DOCX manuscript. Maximum file size: 20 MB.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
        >
          Submit Manuscript
        </button>
      </form>
    </main>
  );
}

