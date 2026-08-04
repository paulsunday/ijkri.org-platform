import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";
import { listNigerianBanks } from "@/lib/payments/list-banks";

import { saveOrUpdatePayoutAccount } from "./actions";

export default async function BankAccountPage() {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    include: { payoutAccount: true },
  });

  if (!ambassador) {
    return (
      <section className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
          <ReviewerNav />

          <main className="min-w-0 flex-1 rounded-xl border bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">Bank Account</h1>

            <p className="mt-4 text-slate-600">
              Your ambassador profile has not been set up yet.
            </p>
          </main>
        </div>
      </section>
    );
  }

  let banks: Awaited<ReturnType<typeof listNigerianBanks>> = [];
  let banksError: string | null = null;

  try {
    banks = await listNigerianBanks();
  } catch {
    banksError = "Could not load the list of banks. Please try again shortly.";
  }

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-6">
          <Link
            href="/reviewer/wallet"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Back to Wallet
          </Link>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">Bank Account</h1>

            {ambassador.payoutAccount && (
              <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
                Current account: {ambassador.payoutAccount.bankName} ····{" "}
                {ambassador.payoutAccount.accountNumber.slice(-4)} (
                {ambassador.payoutAccount.accountName})
              </div>
            )}

            {banksError ? (
              <p className="mt-6 text-red-700">{banksError}</p>
            ) : (
              <form
                action={saveOrUpdatePayoutAccount}
                className="mt-6 space-y-4"
              >
                <div>
                  <label htmlFor="bankCode" className="mb-1 block font-medium">
                    Bank
                  </label>

                  <select
                    id="bankCode"
                    name="bankCode"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border p-3"
                  >
                    <option value="" disabled>
                      Select your bank
                    </option>

                    {banks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="accountNumber"
                    className="mb-1 block font-medium"
                  >
                    Account number
                  </label>

                  <input
                    id="accountNumber"
                    name="accountNumber"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{10}"
                    maxLength={10}
                    required
                    className="w-full rounded-lg border p-3"
                    placeholder="10-digit NUBAN account number"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                >
                  Verify and Save
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
