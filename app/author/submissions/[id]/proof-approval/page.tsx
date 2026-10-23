import Link from "next/link";
import { notFound } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import {
    approveAuthorProof,
    requestAuthorProofCorrections,
} from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatDate(
    value: Date | null | undefined,
) {
    if (!value) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export default async function AuthorProofApprovalPage({
    params,
}: PageProps) {
    const author =
        await requireAnyRole(AUTHOR_ROLES);
    const { id } = await params;

    const submission =
        await prisma.submission.findFirst({
            where: {
                id,

                ...(isSuperAdmin(author)
                    ? {}
                    : {
                        authorId: author.id,
                    }),
            },

            include: {
                author: true,
                journal: true,

                productionAssignments: {
                    where: {
                        stage: "PROOFREADING",
                    },

                    include: {
                        assignee: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },

                        assignedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },

                        files: {
                            include: {
                                uploadedBy: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },

                            orderBy: [
                                {
                                    versionNumber: "desc",
                                },
                                {
                                    createdAt: "desc",
                                },
                            ],
                        },

                        notes: {
                            where: {
                                isInternal: false,
                            },

                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },

                            orderBy: {
                                createdAt: "desc",
                            },
                        },
                    },

                    orderBy: {
                        round: "desc",
                    },

                    take: 1,
                },
            },
        });

    if (!submission) {
        notFound();
    }

    const proofreadingAssignment =
        submission.productionAssignments[0];

    if (!proofreadingAssignment) {
        return (
            <main className="mx-auto max-w-5xl px-6 py-12">
                <Link
                    href={`/author/submissions/${submission.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to submission
                </Link>

                <section className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-8">
                    <h1 className="text-2xl font-bold text-yellow-900">
                        Final proof unavailable
                    </h1>

                    <p className="mt-3 text-yellow-800">
                        No proofreading assignment was found for this manuscript.
                    </p>
                </section>
            </main>
        );
    }

    const finalProofFile =
        proofreadingAssignment.files.find(
            (file) =>
                file.fileType === "PROOF_FILE" &&
                file.isFinal,
        ) ??
        proofreadingAssignment.files.find(
            (file) =>
                file.fileType === "PROOF_FILE",
        );

    const canReview =
        submission.status ===
        "AUTHOR_PROOF_APPROVAL" &&
        proofreadingAssignment.status ===
        "APPROVED";

    return (
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href={`/author/submissions/${submission.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to submission details
                </Link>

                <div className="mt-4">
                    <h1 className="text-3xl font-bold">
                        Final Proof Approval
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Review the final proof carefully before approving it for publication.
                    </p>
                </div>
            </header>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Manuscript Information
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <p className="text-sm text-gray-500">
                            Title
                        </p>

                        <p className="font-medium">
                            {submission.title}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Author
                        </p>

                        <p className="font-medium">
                            {submission.author.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Journal
                        </p>

                        <p className="font-medium">
                            {submission.journal.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Submission status
                        </p>

                        <p className="font-medium">
                            {formatStatus(submission.status)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Proofreader
                        </p>

                        <p className="font-medium">
                            {proofreadingAssignment.assignee.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Proof approved by editor
                        </p>

                        <p className="font-medium">
                            {formatDate(
                                proofreadingAssignment.approvedAt,
                            )}
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Final Proof
                </h2>

                {!finalProofFile ? (
                    <div className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                        <p className="font-semibold text-yellow-900">
                            No proof file is available
                        </p>

                        <p className="mt-2 text-sm text-yellow-800">
                            The proofreader may have confirmed that no corrected proof file was required.
                        </p>
                    </div>
                ) : (
                    <article className="mt-5 rounded-xl border p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h3 className="font-semibold">
                                    {finalProofFile.fileName}
                                </h3>

                                <p className="mt-1 text-sm text-gray-600">
                                    Version{" "}
                                    {finalProofFile.versionNumber}
                                </p>

                                <p className="mt-1 text-sm text-gray-600">
                                    Uploaded by{" "}
                                    {finalProofFile.uploadedBy.name}
                                </p>

                                <p className="mt-1 text-sm text-gray-600">
                                    {formatDate(
                                        finalProofFile.createdAt,
                                    )}
                                </p>

                                {finalProofFile.description && (
                                    <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                                        {finalProofFile.description}
                                    </div>
                                )}
                            </div>

                            <a
                                href={`/api/production-files/${finalProofFile.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                                Download Final Proof
                            </a>
                        </div>
                    </article>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Proofreading Notes
                </h2>

                {proofreadingAssignment.notes.length ===
                    0 ? (
                    <p className="mt-4 text-gray-600">
                        No proofreading notes were added.
                    </p>
                ) : (
                    <div className="mt-6 space-y-4">
                        {proofreadingAssignment.notes.map(
                            (note) => (
                                <article
                                    key={note.id}
                                    className="rounded-lg bg-gray-50 p-5"
                                >
                                    <div className="flex flex-wrap justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">
                                                {note.author.name}
                                            </p>

                                            <p className="text-sm text-gray-500">
                                                {note.isInternal
                                                    ? "Internal production note"
                                                    : "Shared note"}
                                            </p>
                                        </div>

                                        <p className="text-sm text-gray-500">
                                            {formatDate(note.createdAt)}
                                        </p>
                                    </div>

                                    <p className="mt-4 whitespace-pre-wrap text-sm">
                                        {note.message}
                                    </p>
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>

            {!canReview && (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        Proof approval unavailable
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        The manuscript must be awaiting author proof approval, and proofreading must be approved by the editor.
                    </p>
                </section>
            )}

            {canReview && (
                <section className="grid gap-6 lg:grid-cols-2">
                    <article className="rounded-xl border border-green-300 bg-green-50 p-6">
                        <h2 className="text-xl font-semibold text-green-900">
                            Approve Final Proof
                        </h2>

                        <p className="mt-2 text-sm text-green-800">
                            Approval confirms that the manuscript may proceed to publication.
                        </p>

                        <form
                            action={approveAuthorProof}
                            className="mt-6 space-y-5"
                        >
                            <input
                                type="hidden"
                                name="submissionId"
                                value={submission.id}
                            />

                            <input
                                type="hidden"
                                name="authorId"
                                value={submission.authorId}
                            />

                            <div>
                                <label
                                    htmlFor="approvalNote"
                                    className="mb-2 block font-semibold text-green-900"
                                >
                                    Approval Note
                                </label>

                                <textarea
                                    id="approvalNote"
                                    name="approvalNote"
                                    rows={6}
                                    className="w-full rounded-lg border p-3"
                                    placeholder="I have reviewed and approved the final proof for publication."
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
                            >
                                Approve Final Proof
                            </button>
                        </form>
                    </article>

                    <article className="rounded-xl border border-orange-300 bg-orange-50 p-6">
                        <h2 className="text-xl font-semibold text-orange-900">
                            Request Final Corrections
                        </h2>

                        <p className="mt-2 text-sm text-orange-800">
                            Clearly describe any remaining errors in the final proof.
                        </p>

                        <form
                            action={
                                requestAuthorProofCorrections
                            }
                            className="mt-6 space-y-5"
                        >
                            <input
                                type="hidden"
                                name="submissionId"
                                value={submission.id}
                            />

                            <input
                                type="hidden"
                                name="authorId"
                                value={submission.authorId}
                            />

                            <div>
                                <label
                                    htmlFor="correctionNote"
                                    className="mb-2 block font-semibold text-orange-900"
                                >
                                    Required Corrections
                                </label>

                                <textarea
                                    id="correctionNote"
                                    name="correctionNote"
                                    rows={8}
                                    required
                                    className="w-full rounded-lg border p-3"
                                    placeholder="Describe each correction required before publication."
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-lg bg-orange-700 px-6 py-3 font-semibold text-white hover:bg-orange-800"
                            >
                                Request Proof Corrections
                            </button>
                        </form>
                    </article>
                </section>
            )}
        </main>
    );
}