import Link from "next/link";

import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import { DEFAULT_STATIC_PAGE_CONTENT } from "@/lib/static-pages/default-content";

import { STATIC_PAGE_DEFS } from "./page-defs";
import { resetStaticPage, saveStaticPage } from "./actions";

export default async function StaticPagesAdminPage() {
  await requireRole("SUPER_ADMIN");

  const journal = await prisma.journal.findFirst({
    where: { slug: "IJKRI" },
    select: { id: true },
  });

  const overrides = journal
    ? await prisma.staticPage.findMany({
        where: { journalId: journal.id },
        include: { updatedBy: { select: { name: true } } },
      })
    : [];

  const overrideByKey = new Map(
    overrides.map((override) => [override.key, override]),
  );

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Super Admin
        </p>

        <h1 className="mt-2 text-4xl font-bold">Site Pages</h1>

        <p className="mt-3 text-slate-600">
          Edit the content of the journal&apos;s static policy and
          information pages. A page not yet customized here shows its
          original built-in content &mdash; nothing is lost or changed
          until you save an edit.
        </p>
      </header>

      <div className="space-y-6">
        {STATIC_PAGE_DEFS.map((def) => {
          const override = overrideByKey.get(def.key);
          const defaults = DEFAULT_STATIC_PAGE_CONTENT[def.key];

          return (
            <section
              key={def.key}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{def.label}</h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {override
                      ? `Customized${
                          override.updatedBy?.name
                            ? ` by ${override.updatedBy.name}`
                            : ""
                        } on ${override.updatedAt.toLocaleDateString()}`
                      : "Showing default built-in content"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      override
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {override ? "Customized" : "Default"}
                  </span>

                  <Link
                    href={def.path}
                    target="_blank"
                    className="text-sm font-semibold text-blue-700 hover:underline"
                  >
                    View live &rarr;
                  </Link>
                </div>
              </div>

              <div className="mt-5 rounded-lg border">
                <p className="p-4 font-semibold">Edit Page</p>

                <form
                  action={saveStaticPage}
                  className="space-y-4 border-t p-4"
                >
                  <input type="hidden" name="key" value={def.key} />

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Title
                    </label>

                    <input
                      type="text"
                      name="title"
                      required
                      defaultValue={override?.title ?? defaults.title}
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Tagline (optional)
                    </label>

                    <input
                      type="text"
                      name="tagline"
                      defaultValue={override?.tagline ?? defaults.tagline}
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Body
                    </label>

                    <textarea
                      name="body"
                      rows={14}
                      required
                      defaultValue={override?.body ?? defaults.body}
                      placeholder="Write the full page content here. Line breaks are preserved."
                      className="w-full rounded-lg border p-3 font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="rounded-lg bg-black px-5 py-2.5 font-semibold text-white hover:bg-gray-800"
                    >
                      Save
                    </button>

                    {override && (
                      <span className="text-sm text-slate-500">
                        Saving replaces the live page with this text.
                      </span>
                    )}
                  </div>
                </form>

                {override && (
                  <form
                    action={resetStaticPage}
                    className="border-t p-4"
                  >
                    <input type="hidden" name="key" value={def.key} />

                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-5 py-2.5 font-semibold text-red-700 hover:bg-red-50"
                    >
                      Reset to Default
                    </button>
                  </form>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
