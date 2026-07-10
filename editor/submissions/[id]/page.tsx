import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditorSubmissionDetailsPage({ params }: PageProps) {
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: {
      id,
    },
    include: {
      author: true,
      journal: true,
    },
  });

  if (!submission) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-10 text-4xl font-bold">Editor Review Workspace</h1>

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">{submission.title}</h2>

        <p><strong>Author:</strong> {submission.author.name}</p>
        <p><strong>Email:</strong> {submission.author.email}</p>
        <p><strong>Journal:</strong> {submission.journal.name}</p>
        <p><strong>Type:</strong> {submission.manuscriptType}</p>
        <p><strong>Status:</strong> {submission.status}</p>

        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold">Abstract</h3>
          <div className="rounded-lg border bg-slate-50 p-6 whitespace-pre-wrap">
            {submission.abstract}
          </div>
        </div>
      </div>
    </main>
  );
}