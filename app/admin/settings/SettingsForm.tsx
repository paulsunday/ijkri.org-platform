"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateJournalSettings } from "./actions";
import {
  IDLE_FORM_ACTION_STATE,
  type FormActionState,
} from "@/lib/forms/run-form-action";

function ActionBanner({ state }: { state: FormActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`rounded-xl border p-4 text-sm font-medium ${
        state.success
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

type JournalForSettings = {
  id: string;
  name: string;
  shortName: string;
  issnPrint: string | null;
  issnOnline: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  logo: string | null;
  isActive: boolean;
  currency: string;
  apcAmount: string;
  subscriptionAmount: string;
  articlePrice: string;
};

type SettingsForSettings = {
  submissionOpen: boolean;
  reviewType: string;
  plagiarismThreshold: number | null;
  defaultLanguage: string;
  homepageBanner: string | null;
  license: string | null;
  contactAddress: string | null;
  copyrightPolicy: string | null;
  footerText: string | null;
  cfpEnabled: boolean;
  cfpTitle: string | null;
  cfpMessage: string | null;
  cfpButtonText: string | null;
  cfpButtonUrl: string | null;
  cfpDeadline: string;
} | null;

export function SettingsForm({
  journal,
  settings,
}: {
  journal: JournalForSettings;
  settings: SettingsForSettings;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateJournalSettings,
    IDLE_FORM_ACTION_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="journalId" value={journal.id} />

      <ActionBanner state={state} />

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Identity &amp; Contact</h2>

        <p className="mt-1 text-sm text-slate-500">
          Public identity used in citations, indexing feeds, and DOI
          registration.
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
              disabled={pending}
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
              disabled={pending}
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
              disabled={pending}
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
              disabled={pending}
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
              disabled={pending}
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
              disabled={pending}
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
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <label className="mt-5 flex items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={journal.isActive}
            disabled={pending}
            className="h-4 w-4 rounded border-slate-300"
          />
          Journal is active and publicly visible
        </label>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Fees &amp; Pricing</h2>

        <p className="mt-1 text-sm text-slate-500">
          Drives the amount charged when an APC invoice, subscription, or
          article purchase is created.
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
              disabled={pending}
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
              defaultValue={journal.apcAmount}
              disabled={pending}
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
              defaultValue={journal.subscriptionAmount}
              disabled={pending}
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
              defaultValue={journal.articlePrice}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Editorial Workflow</h2>

        <p className="mt-1 text-sm text-slate-500">
          Defaults applied to new submissions and review rounds.
        </p>

        <label className="mt-5 flex items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="submissionOpen"
            defaultChecked={settings?.submissionOpen ?? true}
            disabled={pending}
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
              defaultValue={settings?.reviewType ?? "DOUBLE_BLIND"}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            >
              <option value="DOUBLE_BLIND">Double blind</option>

              <option value="SINGLE_BLIND">Single blind</option>

              <option value="OPEN">Open review</option>
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
              defaultValue={settings?.plagiarismThreshold ?? ""}
              disabled={pending}
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
              defaultValue={settings?.defaultLanguage ?? "English"}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Site Presentation</h2>

        <p className="mt-1 text-sm text-slate-500">
          Branding and legal text shown across the public site.
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
              defaultValue={settings?.homepageBanner ?? ""}
              disabled={pending}
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
              disabled={pending}
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
              defaultValue={settings?.contactAddress ?? ""}
              disabled={pending}
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
              defaultValue={settings?.copyrightPolicy ?? ""}
              disabled={pending}
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
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Call for Papers Advert</h2>

        <p className="mt-1 text-sm text-slate-500">
          Shown as a pop-up to visitors on the homepage and across the
          site. Editing and saving will show it again even to visitors
          who previously dismissed it.
        </p>

        <label className="mt-5 flex items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="cfpEnabled"
            defaultChecked={settings?.cfpEnabled ?? false}
            disabled={pending}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show the call for papers pop-up
        </label>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="cfpTitle"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Headline
            </label>

            <input
              id="cfpTitle"
              name="cfpTitle"
              type="text"
              placeholder="e.g. Submit your research for our upcoming issue"
              defaultValue={settings?.cfpTitle ?? ""}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="cfpMessage"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Message
            </label>

            <textarea
              id="cfpMessage"
              name="cfpMessage"
              rows={3}
              placeholder="Briefly describe the call for papers and who should submit."
              defaultValue={settings?.cfpMessage ?? ""}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="cfpButtonText"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Button text
            </label>

            <input
              id="cfpButtonText"
              name="cfpButtonText"
              type="text"
              placeholder="e.g. Submit Manuscript"
              defaultValue={settings?.cfpButtonText ?? ""}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="cfpButtonUrl"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Button link
            </label>

            <input
              id="cfpButtonUrl"
              name="cfpButtonUrl"
              type="text"
              placeholder="/call-for-papers or https://"
              defaultValue={settings?.cfpButtonUrl ?? ""}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="cfpDeadline"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Submission deadline (optional)
            </label>

            <input
              id="cfpDeadline"
              name="cfpDeadline"
              type="date"
              defaultValue={settings?.cfpDeadline ?? ""}
              disabled={pending}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>

        <Link
          href="/admin"
          className="rounded-lg border px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to admin dashboard
        </Link>
      </div>
    </form>
  );
}
