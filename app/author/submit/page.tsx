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
        Submit your manuscript to the International Journal of Advanced
        Research and Innovation (IJARI).
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