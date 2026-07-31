import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { updateJournalSettings } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{
    journalId?: string;
    saved?: string;
  }>;
};

function formatDecimal(value: {
  toNumber(): number;
}) {
  return value.toNumber().toFixed(2);
}

export default async function AdminSettingsPage({
  searchParams,
}: SettingsPageProps) {
  const administrator = await requireAnyRole(ADMIN_ROLES);

  const { journalId: journalIdParam, saved } =
    await searchParams;

  const isSuperAdmin = administrator.roles.some(
    (roleRecord) => roleRecord.role === "SUPER_ADMIN",
  );

  const permittedJournalIds = Array.from(
    new Set(
      administrator.roles
        .filter((roleRecord) =>
          ADMIN_ROLES.includes(roleRecord.role),
        )
        .map((roleRecord) => roleRecord.journalId),
    ),
  );

  const journals = await prisma.journal.findMany({
    where: isSuperAdmin
      ? {}
      : {
          id: {
            in: permittedJournalIds,
          },
        },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  });

  if (journals.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-4xl font-bold">
          Journal Settings
        </h1>

        <div className="mt-8 rounded-xl border border-yellow-300 bg-yellow-50 p-6">
          <p className="font-semibold text-yellow-900">
            No journal is available to configure
          </p>

          <p className="mt-2 text-sm text-yellow-800">
            Your account is not assigned administrative
            access to any journal.
          </p>
        </div>
      </main>
    );
  }

  const selectedJournalId =
    journalIdParam &&
    journals.some((journal) => journal.id === journalIdParam)
      ? journalIdParam
      : journals[0].id;

  const journal = await prisma.journal.findUniqueOrThrow({
    where: {
      id: selectedJournalId,
    },
    include: {
      settings: true,
    },
  });

  const settings = journal.settings;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Journal Administration
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          Journal Settings
        </h1>

        <p className="mt-3 max-w-2xl text-slate-600">
          Configure this journal&apos;s identity, publication
          charges, and editorial workflow defaults.
        </p>
      </header>

      {journals.length > 1 && (
        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-5 shadow-sm"
        >
          <div className="min-w-64">
            <label
              htmlFor="journalId"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Journal
            </label>

            <select
              id="journalId"
              name="journalId"
              defaultValue={selectedJournalId}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            >
              {journals.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.shortName || option.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Switch journal
          </button>
        </form>
      )}

      {saved && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
        >
          Journal settings were saved successfully.
        </div>
      )}

      <form
        action={updateJournalSettings}
        className="space-y-8"
      >
        <input
          type="hidden"
          name="journalId"
          value={journal.id}
        />

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Identity &amp; Contact
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Public identity used in citations, indexing
            feeds, and DOI registration.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Journal name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={journal.name}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="shortName"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Short name / abbreviation
              </label>

              <input
                id="shortName"
                name="shortName"
                type="text"
                required
                defaultValue={journal.shortName}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="issnPrint"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Print ISSN
              </label>

              <input
                id="issnPrint"
                name="issnPrint"
                type="text"
                placeholder="0000-0000"
                defaultValue={journal.issnPrint ?? ""}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="issnOnline"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Online ISSN
              </label>

              <input
                id="issnOnline"
                name="issnOnline"
                type="text"
                placeholder="0000-0000"
                defaultValue={journal.issnOnline ?? ""}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="contactEmail"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Contact email
              </label>

              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={journal.contactEmail ?? ""}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="websiteUrl"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Website URL
              </label>

              <input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                placeholder="https://"
                defaultValue={journal.websiteUrl ?? ""}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="logo"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Logo URL
              </label>

              <input
                id="logo"
                name="logo"
                type="url"
                placeholder="https://"
                defaultValue={journal.logo ?? ""}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <label className="mt-5 flex items-center gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={journal.isActive}
              className="h-4 w-4 rounded border-slate-300"
            />
            Journal is active and publicly visible
          </label>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Fees &amp; Pricing
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Drives the amount charged when an APC invoice,
            subscription, or article purchase is created.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-4">
            <div>
              <label
                htmlFor="currency"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Currency
              </label>

              <select
                id="currency"
                name="currency"
                defaultValue={journal.currency}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="apcAmount"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Article processing charge
              </label>

              <input
                id="apcAmount"
                name="apcAmount"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={formatDecimal(
                  journal.apcAmount,
                )}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="subscriptionAmount"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Reader subscription
              </label>

              <input
                id="subscriptionAmount"
                name="subscriptionAmount"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={formatDecimal(
                  journal.subscriptionAmount,
                )}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="articlePrice"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Single article price
              </label>

              <input
                id="articlePrice"
                name="articlePrice"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={formatDecimal(
                  journal.articlePrice,
                )}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Editorial Workflow
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Defaults applied to new submissions and review
            rounds.
          </p>

          <label className="mt-5 flex items-center gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="submissionOpen"
              defaultChecked={
                settings?.submissionOpen ?? true
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Currently accepting new manuscript submissions
          </label>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="reviewType"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Default review type
              </label>

              <select
                id="reviewType"
                name="reviewType"
                defaultValue={
                  settings?.reviewType ?? "DOUBLE_BLIND"
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="DOUBLE_BLIND">
                  Double blind
                </option>

                <option value="SINGLE_BLIND">
                  Single blind
                </option>

                <option value="OPEN">
                  Open review
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="plagiarismThreshold"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Plagiarism threshold (%)
              </label>

              <input
                id="plagiarismThreshold"
                name="plagiarismThreshold"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 20"
                defaultValue={
                  settings?.plagiarismThreshold ?? ""
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="defaultLanguage"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Default language
              </label>

              <input
                id="defaultLanguage"
                name="defaultLanguage"
                type="text"
                required
                defaultValue={
                  settings?.defaultLanguage ?? "English"
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Site Presentation
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Branding and legal text shown across the public
            site.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="homepageBanner"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Homepage banner URL
              </label>

              <input
                id="homepageBanner"
                name="homepageBanner"
                type="url"
                placeholder="https://"
                defaultValue={
                  settings?.homepageBanner ?? ""
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="license"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Publication license
              </label>

              <input
                id="license"
                name="license"
                type="text"
                placeholder="e.g. CC BY 4.0"
                defaultValue={settings?.license ?? ""}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="contactAddress"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Contact / postal address
              </label>

              <textarea
                id="contactAddress"
                name="contactAddress"
                rows={2}
                defaultValue={
                  settings?.contactAddress ?? ""
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="copyrightPolicy"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Copyright policy
              </label>

              <textarea
                id="copyrightPolicy"
                name="copyrightPolicy"
                rows={3}
                defaultValue={
                  settings?.copyrightPolicy ?? ""
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="footerText"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Footer text
              </label>

              <textarea
                id="footerText"
                name="footerText"
                rows={2}
                defaultValue={settings?.footerText ?? ""}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Save settings
          </button>

          <Link
            href="/admin"
            className="rounded-lg border px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to admin dashboard
          </Link>
        </div>
      </form>
    </main>
  );
}
