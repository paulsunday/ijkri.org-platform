import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

import {
  CreateVolumeForm,
  UpdateVolumeForm,
  VolumeActionButtons,
} from "./VolumeForms";

export default async function AdminVolumesPage() {
  await requireAnyRole(ADMIN_ROLES);

  const [journals, volumes] = await Promise.all([
    prisma.journal.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.volume.findMany({
      include: {
        journal: true,
        issues: {
          include: {
            articles: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            number: "asc",
          },
        },
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          number: "desc",
        },
      ],
    }),
  ]);

  const publishedCount = volumes.filter(
    (volume) => volume.isPublished,
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <header>
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to admin dashboard
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          Volumes
        </h1>

        <p className="mt-3 text-gray-600">
          Create and manage journal publication volumes.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Volumes
          </p>

          <p className="mt-2 text-3xl font-bold">
            {volumes.length}
          </p>
        </article>

        <article className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Published
          </p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {publishedCount}
          </p>
        </article>

        <article className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">
            Draft
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {volumes.length - publishedCount}
          </p>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Create Volume
        </h2>

        <CreateVolumeForm journals={journals} />
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Existing Volumes
        </h2>

        {volumes.length === 0 ? (
          <p className="mt-5 text-gray-600">
            No volumes have been created.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {volumes.map((volume) => {
              const articleCount =
                volume.issues.reduce(
                  (total, issue) =>
                    total + issue.articles.length,
                  0,
                );

              return (
                <article
                  key={volume.id}
                  className="rounded-xl border p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">
                        {volume.journal.name}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold">
                        Volume {volume.number} ({volume.year})
                      </h3>

                      {volume.title && (
                        <p className="mt-2 text-gray-700">
                          {volume.title}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${volume.isPublished
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                        }`}
                    >
                      {volume.isPublished
                        ? "Published"
                        : "Draft"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <p>
                      <strong>Issues:</strong>{" "}
                      {volume.issues.length}
                    </p>

                    <p>
                      <strong>Articles:</strong>{" "}
                      {articleCount}
                    </p>

                    <p>
                      <strong>Year:</strong>{" "}
                      {volume.year}
                    </p>
                  </div>

                  <UpdateVolumeForm
                    volume={{
                      id: volume.id,
                      number: volume.number,
                      year: volume.year,
                      title: volume.title,
                      description: volume.description,
                    }}
                  />

                  <VolumeActionButtons
                    volume={{
                      id: volume.id,
                      isPublished: volume.isPublished,
                      articleCount,
                    }}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
