import Link from "next/link";
import { notFound } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyRole,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import FormatArticleWorkspace from "./FormatArticleWorkspace";
import UploadFinalGalleyForm from "./UploadFinalGalleyForm";

/*
 * PDF generation here launches headless Chromium, which routinely
 * exceeds the platform's default serverless function duration.
 * Server Actions invoked from this page inherit this limit.
 */
export const maxDuration = 60;

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

export default async function FormatArticlePage({
    params,
}: PageProps) {
    const editor = await requireAnyRole([
        ...PUBLICATION_ROLES,
    ]);

    const { id } = await params;

    const submission = await prisma.submission.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            title: true,
            abstract: true,
            journalId: true,
            status: true,

            journal: {
                select: {
                    name: true,
                    shortName: true,

                    settings: {
                        select: {
                            copyrightPolicy: true,
                            license: true,
                        },
                    },
                },
            },

            author: {
                select: {
                    name: true,
                    email: true,
                    orcid: true,
                },
            },

            submissionAuthors: {
                orderBy: {
                    sortOrder: "asc",
                },
                select: {
                    fullName: true,
                    affiliation: true,
                    orcid: true,
                    isCorresponding: true,
                },
            },

            keywords: {
                select: {
                    keyword: {
                        select: {
                            name: true,
                        },
                    },
                },
            },

            article: {
                select: {
                    id: true,
                    doi: true,
                    startPage: true,
                    endPage: true,

                    issue: {
                        select: {
                            number: true,

                            volume: {
                                select: {
                                    number: true,
                                    year: true,
                                },
                            },
                        },
                    },
                },
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

    const canFormat =
        submission.status === "READY_FOR_PUBLICATION" ||
        submission.status === "PUBLISHED";

    const authors =
        submission.submissionAuthors.length > 0
            ? submission.submissionAuthors.map((author) => ({
                  fullName: author.fullName,
                  affiliation: author.affiliation ?? "",
                  orcid: author.orcid ?? "",
                  isCorresponding: author.isCorresponding,
              }))
            : [
                  {
                      fullName: submission.author.name,
                      affiliation: "",
                      orcid:
                          submission.author.orcid ?? "",
                      isCorresponding: true,
                  },
              ];

    const keywords = submission.keywords
        .map((entry) => entry.keyword.name)
        .join(", ");

    return (
        <main className="mx-auto max-w-6xl space-y-8 p-8">
            <Link
                href={`/editor/submissions/${submission.id}`}
                className="text-blue-700 hover:underline"
            >
                ← Back
            </Link>

            <div>
                <h1 className="text-3xl font-bold">
                    Format Article
                </h1>

                <p className="mt-2 text-gray-600">
                    Review and arrange this manuscript into
                    the journal&apos;s uniform publication
                    template, then approve it as the final
                    galley PDF.
                </p>
            </div>

            {!canFormat ? (
                <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
                    <h2 className="font-semibold text-yellow-900">
                        Formatting unavailable
                    </h2>

                    <p className="mt-2 text-sm text-yellow-800">
                        This manuscript must be Ready for
                        Publication (or already published)
                        before it can be formatted.
                    </p>
                </section>
            ) : (
                <>
                <UploadFinalGalleyForm
                    submissionId={submission.id}
                />

                <div className="flex items-center gap-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    Or use the formatting tool
                    <span className="h-px flex-1 bg-gray-200" />
                </div>

                <FormatArticleWorkspace
                    submissionId={submission.id}
                    hasExistingArticle={Boolean(
                        submission.article,
                    )}
                    initialInput={{
                        title: submission.title,
                        authors,
                        abstract: submission.abstract,
                        keywords,
                        body: "",
                        tables: "",
                        figures: "",
                        references: "",
                    }}
                    metadataPreview={{
                        journalName: submission.journal.name,
                        journalShortName:
                            submission.journal.shortName,
                        volumeNumber:
                            submission.article?.issue?.volume
                                .number ?? 0,
                        issueNumber:
                            submission.article?.issue
                                ?.number ?? 0,
                        year:
                            submission.article?.issue?.volume
                                .year ??
                            new Date().getFullYear(),
                        startPage:
                            submission.article?.startPage ??
                            null,
                        endPage:
                            submission.article?.endPage ??
                            null,
                        doi: submission.article?.doi ?? null,
                        copyrightPolicy:
                            submission.journal.settings
                                ?.copyrightPolicy ?? null,
                        license:
                            submission.journal.settings
                                ?.license ?? null,
                    }}
                />
                </>
            )}
        </main>
    );
}
