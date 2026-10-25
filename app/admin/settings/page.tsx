import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { SettingsForm } from "./SettingsForm";

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

  const { journalId: journalIdParam } = await searchParams;

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

      <SettingsForm
        journal={{
          id: journal.id,
          name: journal.name,
          shortName: journal.shortName,
          issnPrint: journal.issnPrint,
          issnOnline: journal.issnOnline,
          contactEmail: journal.contactEmail,
          websiteUrl: journal.websiteUrl,
          logo: journal.logo,
          isActive: journal.isActive,
          currency: journal.currency,
          apcAmount: formatDecimal(journal.apcAmount),
          subscriptionAmount: formatDecimal(
            journal.subscriptionAmount,
          ),
          articlePrice: formatDecimal(journal.articlePrice),
        }}
        settings={
          settings
            ? {
                submissionOpen: settings.submissionOpen,
                reviewType: settings.reviewType,
                plagiarismThreshold: settings.plagiarismThreshold,
                defaultLanguage: settings.defaultLanguage,
                homepageBanner: settings.homepageBanner,
                license: settings.license,
                contactAddress: settings.contactAddress,
                copyrightPolicy: settings.copyrightPolicy,
                footerText: settings.footerText,
                cfpEnabled: settings.cfpEnabled,
                cfpTitle: settings.cfpTitle,
                cfpMessage: settings.cfpMessage,
                cfpButtonText: settings.cfpButtonText,
                cfpButtonUrl: settings.cfpButtonUrl,
                cfpDeadline: settings.cfpDeadline
                  ? settings.cfpDeadline
                      .toISOString()
                      .slice(0, 10)
                  : "",
              }
            : null
        }
      />
    </main>
  );
}
