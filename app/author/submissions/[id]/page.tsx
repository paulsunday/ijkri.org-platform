import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: Date | null | undefined) {
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

export default async function AuthorSubmissionDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: {
      id,
    },
    include: {
      journal: true,
      author: true,

      files: {
        orderBy: {
          createdAt: "asc",
        },
      },

      versions: {
        orderBy: {
          versionNumber: "desc",
        },
      },

      decisions: {
        include: {
          editor: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const latestVersion = submission.versions[0];

  const canSubmitRevision =
    submission.status === "REVISION_REQUIRED";

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header>
        <Link
          href="/author/dashboard"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to author dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Submission Details
            </h1>

            <p className="mt-2 text-gray-600">
              Track the editorial status, decisions, files and revision history
              for this manuscript.
            </p>
          </div>

          {canSubmitRevision && (
            <Link
              href={`/author/submissions/${submission.id}/revision`}
              className="rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
            >
              Submit Revision
            </Link>
          )}
        </div>
      </header>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Manuscript Information
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Title</p>
            <p className="font-medium">{submission.title}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Journal</p>
            <p className="font-medium">{submission.journal.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Author</p>
            <p className="font-medium">{submission.author.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">
              {formatStatus(submission.status)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Current review round</p>
            <p className="font-medium">
              Round {submission.currentReviewRound}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Current manuscript version</p>
            <p className="font-medium">
              Version {latestVersion?.versionNumber ?? 1}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Submitted</p>
            <p className="font-medium">
              {formatDate(submission.submittedAt ?? submission.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Manuscript type</p>
            <p className="font-medium">
              {submission.manuscriptType || "Not specified"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Abstract</h2>

        <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-5">
          {submission.abstract}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Editorial Decisions
        </h2>

        {submission.decisions.length === 0 ? (
          <p className="mt-4 text-gray-600">
            No editorial decision has been recorded yet.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {submission.decisions.map((decision) => (
              <article
                key={decision.id}
                className="rounded-lg border p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {formatStatus(decision.decision)}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      By {decision.editor.name} on{" "}
                      {formatDate(decision.createdAt)}
                    </p>
                  </div>

                  {decision.revisionDeadline && (
                    <p className="text-sm font-medium">
                      Revision deadline:{" "}
                      {formatDate(decision.revisionDeadline)}
                    </p>
                  )}
                </div>

                <div className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                  {decision.comments || "No comments were provided."}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Manuscript Versions
        </h2>

        <div className="mt-5 space-y-5">
          {submission.versions.map((version) => (
            <article
              key={version.id}
              className="rounded-lg border p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">
                    Version {version.versionNumber}
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    Uploaded {formatDate(version.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={version.manuscriptFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-blue-700 hover:underline"
                  >
                    Download manuscript
                  </a>

                  {version.responseFileUrl && (
                    <a
                      href={version.responseFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Download response
                    </a>
                  )}
                </div>
              </div>

              {version.coverLetter && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">Cover letter</p>

                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                    {version.coverLetter}
                  </div>
                </div>
              )}

              {version.authorNotes && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">Author notes</p>

                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                    {version.authorNotes}
                  </div>
                </div>
              )}
            </article>
          ))}

          <article className="rounded-lg border p-5">
            <h3 className="font-semibold">
              Version 1 — Original Submission
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Submitted{" "}
              {formatDate(submission.submittedAt ?? submission.createdAt)}
            </p>

            {submission.files.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                No original submission files were found.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {submission.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {file.fileName}
                      </p>

                      <p className="text-xs text-gray-500">
                        {file.label || file.fileType || "Submission file"}
                      </p>
                    </div>

                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}