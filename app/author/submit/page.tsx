import { submitManuscript } from "./actions";

export default function SubmitManuscriptPage() {
  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-4 text-4xl font-bold">Submit Manuscript</h1>

      <p className="mb-8 text-gray-600">
        Submit your manuscript to the International Journal of Advanced Research
        and Innovation (IJARI).
      </p>

      <form action={submitManuscript} className="space-y-6">
        <div>
          <label className="mb-2 block font-medium">Manuscript Title</label>
          <input
            type="text"
            name="title"
            className="w-full rounded-lg border p-3"
            placeholder="Enter manuscript title"
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Abstract</label>
          <textarea
            name="abstract"
            rows={8}
            className="w-full rounded-lg border p-3"
            placeholder="Enter abstract"
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Manuscript Type</label>
          <select
            name="manuscriptType"
            className="w-full rounded-lg border p-3"
            required
          >
            <option value="">Select manuscript type</option>
            <option value="Research Article">Research Article</option>
            <option value="Review Article">Review Article</option>
            <option value="Short Communication">Short Communication</option>
            <option value="Case Study">Case Study</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-black px-6 py-3 text-white"
        >
          Submit Manuscript
        </button>
      </form>
    </main>
  );
}