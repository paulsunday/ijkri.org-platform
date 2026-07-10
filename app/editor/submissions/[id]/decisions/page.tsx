import { prisma } from "@/lib/prisma";
import { sendEditorialDecision } from "./actions";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function EditorialDecisionPage({ params }: PageProps) {
  const article = await prisma.article.findUnique({
    where: {
      id: params.id,
    },
    include: {
      author: true,
      journal: true,
      reviews: {
        include: {
          reviewer: true,
        },
      },
      reviewAssignments: {
        include: {
          reviewer: true,
          review: true,
        },
      },
    },
  });

  if (!article) {
    return <div className="p-6">Article not found.</div>;
  }

  const editorId = "TEMP_EDITOR_ID_REPLACE_LATER";

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Editorial Decision</h1>
        <p className="text-sm text-gray-600">
          Review the manuscript reports and send the final editorial decision.
        </p>
      </div>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">Manuscript Information</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <p>
            <strong>Title:</strong> {article.title}
          </p>

          <p>
            <strong>Status:</strong> {article.status}
          </p>

          <p>
            <strong>Author:</strong>{" "}
            {article.author?.name || article.author?.email || "Unknown"}
          </p>

          <p>
            <strong>Journal:</strong> {article.journal?.name || "Not assigned"}
          </p>

          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(article.createdAt).toLocaleDateString()}
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">Reviewer Reports</h2>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Reviewer</th>
                <th className="border p-2 text-left">Assignment Status</th>
                <th className="border p-2 text-left">Recommendation</th>
                <th className="border p-2 text-left">Submitted</th>
              </tr>
            </thead>

            <tbody>
              {article.reviewAssignments.length === 0 ? (
                <tr>
                  <td className="border p-3" colSpan={4}>
                    No reviewers assigned yet.
                  </td>
                </tr>
              ) : (
                article.reviewAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="border p-2">
                      {assignment.reviewer?.name ||
                        assignment.reviewer?.email ||
                        "Unknown reviewer"}
                    </td>

                    <td className="border p-2">{assignment.status}</td>

                    <td className="border p-2">
                      {assignment.review?.recommendation || "Not submitted"}
                    </td>

                    <td className="border p-2">
                      {assignment.review?.createdAt
                        ? new Date(
                            assignment.review.createdAt
                          ).toLocaleDateString()
                        : "No"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">Full Review Comments</h2>

        <div className="space-y-5">
          {article.reviewAssignments.map((assignment) => (
            <div key={assignment.id} className="rounded-md border p-4">
              <h3 className="font-semibold">
                {assignment.reviewer?.name ||
                  assignment.reviewer?.email ||
                  "Reviewer"}
              </h3>

              {!assignment.review ? (
                <p className="mt-2 text-sm text-gray-600">
                  This reviewer has not submitted a review yet.
                </p>
              ) : (
                <div className="mt-3 space-y-3 text-sm">
                  <p>
                    <strong>Recommendation:</strong>{" "}
                    {assignment.review.recommendation}
                  </p>

                  <p>
                    <strong>Comments to Author:</strong>
                  </p>
                  <div className="rounded bg-gray-50 p-3 whitespace-pre-wrap">
                    {assignment.review.commentsToAuthor || "No comment"}
                  </div>

                  <p>
                    <strong>Confidential Comments to Editor:</strong>
                  </p>
                  <div className="rounded bg-gray-50 p-3 whitespace-pre-wrap">
                    {assignment.review.confidentialComments || "No comment"}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">Make Editorial Decision</h2>

        <form action={sendEditorialDecision} className="space-y-5">
          <input type="hidden" name="articleId" value={article.id} />
          <input type="hidden" name="editorId" value={editorId} />

          <div>
            <label className="block font-medium mb-2">Decision</label>

            <select
              name="decision"
              required
              className="w-full rounded border p-2"
            >
              <option value="">Select decision</option>
              <option value="ACCEPT">Accept</option>
              <option value="MINOR_REVISION">Minor Revision</option>
              <option value="MAJOR_REVISION">Major Revision</option>
              <option value="REJECT">Reject</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">
              Decision Letter to Author
            </label>

            <textarea
              name="decisionLetter"
              rows={10}
              required
              className="w-full rounded border p-3"
              placeholder="Dear Author, after considering the reviewers' reports..."
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Internal Notes for Editors
            </label>

            <textarea
              name="internalNotes"
              rows={5}
              className="w-full rounded border p-3"
              placeholder="Private notes. This will not be sent to the author."
            />
          </div>

          <button
            type="submit"
            className="rounded bg-black px-5 py-2 text-white"
          >
            Send Decision
          </button>
        </form>
      </section>
    </div>
  );
}