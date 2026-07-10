import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

import {
    acceptReview,
    declineReview,
    submitReview,
} from "./actions";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export default async function ReviewerReviewPage({ params }: Props) {
    const { id } = await params;

    const assignment = await prisma.reviewAssignment.findUnique({
        where: { id },
        include: {
            reviewer: true,
            submission: {
                include: {
                    journal: true,
                    author: true,
                },
            },
            review: true,
        },
    });

    if (!assignment) {
        notFound();
    }

    return (
        <main className="mx-auto max-w-5xl px-6 py-12">
            <h1 className="text-4xl font-bold">Review Manuscript</h1>

            <div className="mt-10 rounded-xl border bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-semibold">
                    {assignment.submission.title}
                </h2>

                <div className="mt-6 space-y-2">
                    <p>
                        <strong>Journal:</strong> {assignment.submission.journal.shortName}
                    </p>

                    <p>
                        <strong>Manuscript Type:</strong>{" "}
                        {assignment.submission.manuscriptType || "—"}
                    </p>

                    <p>
                        <strong>Review Status:</strong> {assignment.status}
                    </p>

                    <p>
                        <strong>Invited:</strong> {assignment.invitedAt.toLocaleString()}
                    </p>
                </div>

                <div className="mt-8">
                    <h3 className="text-xl font-semibold">Abstract</h3>

                    <div className="mt-8 flex gap-4">
                        <form action={acceptReview}>
                            <input type="hidden" name="assignmentId" value={assignment.id} />

                            <button className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">
                                Accept Review
                            </button>
                        </form>

                        <form action={declineReview}>
                            <input type="hidden" name="assignmentId" value={assignment.id} />

                            <button className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700">
                                Decline Review
                            </button>
                        </form>
                    </div>

                    <div className="mt-3 rounded-lg border bg-slate-50 p-6 whitespace-pre-wrap">
                        {assignment.submission.abstract}
                    </div>
                    <hr className="my-10" />

                    <h2 className="text-3xl font-bold">
                        Peer Review Report
                    </h2>

                    <form action={submitReview} className="mt-8 space-y-8">

                        <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                        />

                        <div>
                            <label className="block mb-2 font-semibold">
                                Overall Score (1–10)
                            </label>

                            <input
                                type="number"
                                name="score"
                                min={1}
                                max={10}
                                required
                                className="w-40 rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold">
                                Recommendation
                            </label>

                            <select
                                name="recommendation"
                                required
                                className="w-full rounded-lg border p-3"
                            >
                                <option value="ACCEPT">Accept</option>
                                <option value="MINOR_REVISION">Minor Revision</option>
                                <option value="MAJOR_REVISION">Major Revision</option>
                                <option value="REJECT">Reject</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold">
                                Comments to the Author
                            </label>

                            <textarea
                                name="commentsToAuthor"
                                rows={8}
                                required
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 font-semibold">
                                Confidential Comments to the Editor
                            </label>

                            <textarea
                                name="commentsToEditor"
                                rows={6}
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <button
                            type="submit"
                            className="rounded-lg bg-blue-700 px-8 py-3 font-semibold text-white"
                        >
                            Submit Review
                        </button>

                    </form>
                </div>
            </div>
        </main>
    );
}