import Link from "next/link";
import { notFound } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import { publishSubmission } from "./actions";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

const PUBLICATION_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
] as const;

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export default async function PublicationPage({
    params,
}: PageProps) {
    const editor = await requireAnyRole([
        ...PUBLICATION_ROLES,
    ]);

    const { id } = await params;

    const submission =
        await prisma.submission.findUnique({
            where: {
                id,
            },
            include: {
                author: true,
                journal: true,
                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        status: true,
                        amount: true,
                        currency: true,
                    },
                },
                agreement: {
                    select: {
                        status: true,
                    },
                },
                productionFiles: {
                    where: {
                        isFinal: true,
                        fileType: {
                            in: [
                                "PDF_GALLEY",
                                "FINAL_PUBLICATION_FILE",
                                "PROOF_FILE",
                            ],
                        },
                    },
                    select: {
                        id: true,
                    },
                    take: 1,
                },
            },
        });

    if (!submission) {
        notFound();
    }

    if (!isSuperAdmin(editor)) {
        const publicationRole =
            await prisma.userJournalRole.findFirst({
                where: {
                    userId: editor.id,
                    journalId: submission.journalId,
                    role: {
                        in: [...PUBLICATION_ROLES],
                    },
                },
                select: {
                    id: true,
                },
            });

        if (!publicationRole) {
            notFound();
        }
    }

    const issues = await prisma.issue.findMany({
        where: {
            journalId: submission.journalId,
        },
        include: {
            volume: true,
        },
        orderBy: [
            {
                volume: {
                    number: "desc",
                },
            },
            {
                number: "desc",
            },
        ],
    });

    const apcSettled =
        !submission.invoice ||
        submission.invoice.status === "PAID" ||
        submission.invoice.status === "WAIVED";

    const agreementSettled =
        !submission.invoice ||
        submission.agreement?.status === "SIGNED";

    /*
     * Super admins can publish from any stage; the action skips the
     * workflow checks and logs which ones were skipped.
     */
    const fastTrack =
        isSuperAdmin(editor) &&
        submission.status !== "PUBLISHED";

    const skippedSteps = fastTrack
        ? [
            submission.status !== "READY_FOR_PUBLICATION" &&
                `Remaining workflow (current status: ${formatStatus(submission.status)}). Open reviewer invitations and production tasks will be cancelled.`,
            !apcSettled &&
                submission.invoice &&
                `APC payment (invoice ${submission.invoice.invoiceNumber} is ${formatStatus(submission.invoice.status)}).`,
            !agreementSettled &&
                `Signed publication agreement (${submission.agreement ? formatStatus(submission.agreement.status) : "not sent"}).`,
        ].filter((step): step is string => Boolean(step))
        : [];

    const hasFinalPdf = submission.productionFiles.length > 0;

    return (
        <main className="mx-auto max-w-5xl space-y-8 p-8">
            <Link
                href={`/editor/submissions/${submission.id}`}
                className="text-blue-700 hover:underline"
            >
                ← Back
            </Link>

            <div>
                <h1 className="text-3xl font-bold">
                    Publish Article
                </h1>

                <p className="mt-2 text-gray-600">
                    Final publication workflow.
                </p>
            </div>

            <section className="rounded-xl border bg-white p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <strong>Title</strong>
                        <p>{submission.title}</p>
                    </div>

                    <div>
                        <strong>Author</strong>
                        <p>{submission.author.name}</p>
                    </div>

                    <div>
                        <strong>Journal</strong>
                        <p>{submission.journal.name}</p>
                    </div>

                    <div>
                        <strong>Status</strong>
                        <p>
                            {formatStatus(submission.status)}
                        </p>
                    </div>
                </div>
            </section>

            {fastTrack && skippedSteps.length > 0 && (
                <section className="rounded-xl border border-amber-400 bg-amber-50 p-6">
                    <h2 className="font-semibold text-amber-900">
                        Super admin fast-track
                    </h2>

                    <p className="mt-2 text-sm text-amber-800">
                        Publishing now will skip:
                    </p>

                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                        {skippedSteps.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ul>

                    <p className="mt-3 text-sm text-amber-800">
                        This is recorded in the activity log.
                    </p>
                </section>
            )}

            {fastTrack && !hasFinalPdf && (
                <section className="rounded-xl border border-sky-300 bg-sky-50 p-6 text-sm text-sky-900">
                    No final PDF has been produced yet. Paste a PDF link
                    below, or upload the PDF after publishing from{" "}
                    <Link href="/admin/articles" className="font-semibold underline">
                        Admin → Articles
                    </Link>{" "}
                    (Replace PDF).
                </section>
            )}

            {submission.status === "PUBLISHED" ? (
                <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
                    <h2 className="font-semibold text-emerald-900">
                        Already published
                    </h2>

                    <p className="mt-2 text-sm text-emerald-800">
                        Make corrections from{" "}
                        <Link href="/admin/articles" className="font-semibold underline">
                            Admin → Articles
                        </Link>
                        .
                    </p>
                </section>
            ) : !fastTrack &&
                submission.status !==
                "READY_FOR_PUBLICATION" ? (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        Publication unavailable
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        This manuscript must have the status Ready
                        for Publication before it can be published.
                    </p>
                </section>
            ) : !fastTrack && !apcSettled && submission.invoice ? (
                <section className="rounded-xl border border-amber-300 bg-amber-50 p-6">
                    <h2 className="font-semibold text-amber-900">
                        APC payment required
                    </h2>

                    <p className="mt-2 text-sm text-amber-800">
                        Invoice {submission.invoice.invoiceNumber}{" "}
                        ({submission.invoice.currency}{" "}
                        {submission.invoice.amount.toFixed(2)}) has
                        not been paid or waived. This article
                        cannot be published until the author pays
                        the APC, or an administrator grants a
                        waiver.
                    </p>

                    <Link
                        href="/admin/invoices"
                        className="mt-4 inline-block rounded-lg border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                        Manage APC Invoice
                    </Link>
                </section>
            ) : issues.length === 0 ? (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        No issue available
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        Create an issue for this journal before
                        publishing the article.
                    </p>
                </section>
            ) : (
                <form
                    action={publishSubmission}
                    className="space-y-6 rounded-xl border bg-white p-6"
                >
                    <input
                        type="hidden"
                        name="submissionId"
                        value={submission.id}
                    />

                    <div>
                        <label
                            htmlFor="issueId"
                            className="mb-2 block font-semibold"
                        >
                            Volume / Issue
                        </label>

                        <select
                            id="issueId"
                            name="issueId"
                            required
                            defaultValue=""
                            className="w-full rounded border p-3"
                        >
                            <option value="" disabled>
                                Select Issue
                            </option>

                            {issues.map((issue) => (
                                <option
                                    key={issue.id}
                                    value={issue.id}
                                >
                                    Volume {issue.volume.number} Issue{" "}
                                    {issue.number}
                                    {issue.title
                                        ? ` — ${issue.title}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="doi"
                            className="mb-2 block font-semibold"
                        >
                            DOI
                        </label>

                        <input
                            id="doi"
                            type="text"
                            name="doi"
                            className="w-full rounded border p-3"
                            placeholder="10.xxxx/xxxxx"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="publicationDate"
                            className="mb-2 block font-semibold"
                        >
                            Publication Date
                        </label>

                        <input
                            id="publicationDate"
                            type="date"
                            name="publicationDate"
                            required
                            className="w-full rounded border p-3"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="pdfUrl"
                            className="mb-2 block font-semibold"
                        >
                            PDF URL (optional)
                        </label>

                        <input
                            id="pdfUrl"
                            type="url"
                            name="pdfUrl"
                            className="w-full rounded border p-3"
                            placeholder="https://..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
                    >
                        {skippedSteps.length > 0
                            ? "Publish Now (Fast-track)"
                            : "Publish Article"}
                    </button>
                </form>
            )}
        </main>
    );
}