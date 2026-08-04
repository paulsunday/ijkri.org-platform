import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";

import { updateProfileSettings } from "./actions";

export default async function AmbassadorProfileSettingsPage() {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { slug: true, isPublicProfileEnabled: true, contactEnabled: true },
  });

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-6">
          <Link
            href="/reviewer/referrals"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Back to Referral Centre
          </Link>

          <div>
            <h1 className="text-3xl font-bold">Public Profile Settings</h1>
            <p className="mt-2 text-slate-600">
              Your ambassador profile is private by default. Enable it to get a
              shareable public page with your referral link and stats.
            </p>
          </div>

          {!ambassador ? (
            <div className="rounded-xl border bg-white p-8 shadow-sm text-slate-600">
              Your ambassador profile has not been set up yet.
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              {ambassador.isPublicProfileEnabled && ambassador.slug && (
                <div className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    Your public profile is live:
                  </p>
                  <Link
                    href={`/ambassador/${ambassador.slug}`}
                    className="mt-1 block break-all text-emerald-800 underline"
                  >
                    /ambassador/{ambassador.slug}
                  </Link>
                </div>
              )}

              <form action={updateProfileSettings} className="space-y-4">
                <label className="flex items-start gap-3 rounded-lg border p-4">
                  <input
                    type="checkbox"
                    name="isPublicProfileEnabled"
                    value="true"
                    defaultChecked={ambassador.isPublicProfileEnabled}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold">Enable public profile</span>
                    <span className="block text-sm text-slate-600">
                      Publishes your name, institution, country, level, and
                      published-referral count. Never shows confidential review
                      content.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-4">
                  <input
                    type="checkbox"
                    name="contactEnabled"
                    value="true"
                    defaultChecked={ambassador.contactEnabled}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold">
                      Allow visitors to contact me
                    </span>
                    <span className="block text-sm text-slate-600">
                      Shows a contact button on your public profile.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                >
                  Save Settings
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
