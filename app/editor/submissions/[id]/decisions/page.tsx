import { prisma } from "@/lib/prisma";
import { sendEditorialDecision } from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function EditorialDecisionPage({ params }: PageProps) {
    const { id } = await params;

    const submission = await prisma.submission.findUnique({
        where: { id },
        include: {
            author: true,
            journal: true,
            reviewAssignments: {
                include: {
                    reviewer: true,
                    review: true,
                },
            },
            decisions: {
                include: {
                    editor: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });

    if (!submission) {
        return <div className="p-6">Submission not found.</div>;
    }

    const editor = await prisma.user.findFirst();

    if (!editor) {
        return <div className="p-6">No user account found. Create a user first.</div>;
    }

    return (
        <main className="mx-auto max-w-6xl p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Editorial Decision</h1>
                <p className="text-sm text-gray-600">
                    Review submitted reviewer reports and make a final decision.
                </p>
            </div>

            <section className="rounded-lg border bg-white p-5">
                <h2 className="text-lg font-semibold mb-4">Manuscript Information</h2>

                <div className="grid gap-3 md:grid-cols-2">
                    <p><strong>Title:</strong> {submission.title}</p>
                    <p><strong>Status:</strong> {submission.status}</p>
                    <p><strong>Author:</strong> {submission.author.name}</p>
                    <p><strong>Email:</strong> {submission.author.email}</p>
                    <p><strong>Journal:</strong> {submission.journal.name}</p>
                    <p>
                        <strong>Submitted:</strong>{" "}
                        {submission.submittedAt
                            ? new Date(submission.submittedAt).toLocaleDateString()
                            : "Not submitted"}
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
                                <th className="border p-2 text-left">Status</th>
                                <th className="border p-2 text-left">Recommendation</th>
                                <th className="border p-2 text-left">Submitted</th>
                            </tr>
                        </thead>

                        <tbody>
                            {submission.reviewAssignments.length === 0 ? (
                                <tr>
                                    <td className="border p-3" colSpan={4}>
                                        No reviewers assigned yet.
                                    </td>
                                </tr>
                            ) : (
                                submission.reviewAssignments.map((assignment) => (
                                    <tr key={assignment.id}>
                                        <td className="border p-2">
                                            {assignment.reviewer.name}
                                        </td>
                                        <td className="border p-2">{assignment.status}</td>
                                        <td className="border p-2">
                                            {assignment.review?.recommendation || "Not submitted"}
                                        </td>
                                        <td className="border p-2">
                                            {assignment.review?.submittedAt
                                                ? new Date(assignment.review.submittedAt).toLocaleDateString()
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
                    {submission.reviewAssignments.map((assignment) => (
                        <div key={assignment.id} className="rounded-md border p-4">
                            <h3 className="font-semibold">{assignment.reviewer.name}</h3>

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

                                    <p><strong>Comments to Author:</strong></p>
                                    <div className="rounded bg-gray-50 p-3 whitespace-pre-wrap">
                                        {assignment.review.commentsToAuthor || "No comment"}
                                    </div>

                                    <p><strong>Comments to Editor:</strong></p>
                                    <div className="rounded bg-gray-50 p-3 whitespace-pre-wrap">
                                        {assignment.review.commentsToEditor || "No comment"}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-lg border bg-white p-5">
                <h2 className="text-lg font-semibold mb-4">Make Decision</h2>

                <form action={sendEditorialDecision} className="space-y-5">
                    <input type="hidden" name="submissionId" value={submission.id} />
                    <input type="hidden" name="editorId" value={editor.id} />

                    <div>
                        <label className="block font-medium mb-2">Decision</label>
                        <select name="decision" required className="w-full rounded border p-2">
                            <option value="">Select decision</option>
                            <option value="REVISION_REQUIRED">Revision Required</option>
                            <option value="ACCEPTED">Accept</option>
                            <option value="REJECTED">Reject</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-medium mb-2">
                            Decision Letter / Comments to Author
                        </label>
                        <textarea
                            name="comments"
                            rows={10}
                            required
                            className="w-full rounded border p-3"
                            placeholder="Dear Author, after considering the reviewers' reports..."
                        />
                    </div>

                    <button type="submit" className="rounded bg-black px-5 py-2 text-white">
                        Send Decision
                    </button>
                </form>
            </section>

            <section className="rounded-lg border bg-white p-5">
                <h2 className="text-lg font-semibold mb-4">Previous Decisions</h2>

                {submission.decisions.length === 0 ? (
                    <p className="text-sm text-gray-600">No decision has been made yet.</p>
                ) : (
                    <div className="space-y-3">
                        {submission.decisions.map((decision) => (
                            <div key={decision.id} className="rounded border p-3">
                                <p><strong>Decision:</strong> {decision.decision}</p>
                                <p><strong>Editor:</strong> {decision.editor.name}</p>
                                <p>
                                    <strong>Date:</strong>{" "}
                                    {new Date(decision.createdAt).toLocaleDateString()}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap">{decision.comments}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}