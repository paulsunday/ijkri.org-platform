import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function CurrentIssuePage() {
  // First, try to find the issue explicitly marked as current.
  let currentIssue = await prisma.issue.findFirst({
    where: {
      isCurrent: true,
      isPublished: true,
    },
    select: {
      slug: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  // Fallback: if no issue is marked as current,
  // use the latest published issue.
  if (!currentIssue) {
    currentIssue = await prisma.issue.findFirst({
      where: {
        isPublished: true,
      },
      select: {
        slug: true,
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });
  }

  // No published issue exists.
  if (!currentIssue) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Latest Publication
          </p>

          <h1 className="mt-2 text-4xl font-bold">Current Issue</h1>

          <p className="mt-3 text-gray-600">
            View the latest published issue and articles.
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-yellow-300 bg-yellow-50 p-8">
          <h2 className="text-xl font-semibold text-yellow-900">
            No published issue is available
          </h2>

          <p className="mt-2 text-yellow-800">
            The journal has not yet published an issue. Once an issue containing
            published articles is published, it will appear here automatically.
          </p>

          <Link
            href="/archives"
            className="mt-5 inline-block font-semibold text-blue-700 hover:underline"
          >
            Browse the archives
          </Link>
        </section>
      </main>
    );
  }

  // Safety check in case the issue has no slug.
  if (!currentIssue.slug) {
    redirect("/archives");
  }

  // Redirect to the canonical issue page.
  redirect(`/issues/${currentIssue.slug}`);
}
