import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";

import { requestWithdrawal } from "./actions";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

function formatMoney(value: number | string, currency: string) {
  const numericValue = Number(value);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${currency} ${numericValue.toFixed(2)}`;
  }
}

function formatTransactionType(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function ReviewerWalletPage({ searchParams }: Props) {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    include: {
      wallet: true,
      payoutAccount: true,
    },
  });

  if (!ambassador || !ambassador.wallet) {
    return (
      <section className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
          <ReviewerNav />

          <main className="min-w-0 flex-1 rounded-xl border bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">Wallet</h1>

            <p className="mt-4 text-slate-600">
              Your ambassador wallet has not been set up yet. Please contact
              the journal administrator.
            </p>
          </main>
        </div>
      </section>
    );
  }

  const wallet = ambassador.wallet;
  const currency = wallet.currency;

  const [transactions, totalTransactions, openWithdrawal] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),

    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),

    prisma.withdrawalRequest.findFirst({
      where: {
        ambassadorId: ambassador.id,
        status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
      },
      select: { id: true, amount: true, status: true, requestedAt: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE));

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Wallet</h1>
            <p className="mt-2 text-slate-600">
              Track your review and referral earnings.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current Balance
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatMoney(wallet.currentBalance.toString(), currency)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pending Balance
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatMoney(wallet.pendingBalance.toString(), currency)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lifetime Earnings
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatMoney(wallet.lifetimeEarnings.toString(), currency)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Withdrawn
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {formatMoney(wallet.totalWithdrawn.toString(), currency)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Request a Withdrawal</h2>

            {!ambassador.payoutAccount ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
                Add and verify a bank account before requesting a withdrawal.
                <Link
                  href="/reviewer/wallet/bank-account"
                  className="ml-2 font-semibold underline"
                >
                  Add bank account
                </Link>
              </div>
            ) : openWithdrawal ? (
              <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-4 text-blue-900">
                You have a withdrawal request of{" "}
                {formatMoney(openWithdrawal.amount.toString(), currency)}{" "}
                currently {openWithdrawal.status.toLowerCase()}.
              </div>
            ) : (
              <form action={requestWithdrawal} className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="amount" className="mb-1 block text-sm font-medium">
                    Amount ({currency})
                  </label>

                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    max={wallet.currentBalance.toString()}
                    required
                    className="rounded-lg border p-2"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-5 py-2 font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Request Withdrawal
                </button>

                <Link
                  href="/reviewer/wallet/bank-account"
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  Manage bank account
                </Link>
              </form>
            )}

            {ambassador.payoutAccount && (
              <p className="mt-4 text-sm text-slate-600">
                Payout account: {ambassador.payoutAccount.bankName} ····{" "}
                {ambassador.payoutAccount.accountNumber.slice(-4)}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Transaction History</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Balance After</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No transactions yet.
                      </td>
                    </tr>
                  )}

                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-slate-500">
                        {transaction.createdAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        {formatTransactionType(transaction.type)}
                      </td>
                      <td className="py-3 pr-4">{transaction.description}</td>
                      <td
                        className={`py-3 pr-4 font-semibold ${
                          transaction.direction === "CREDIT"
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {transaction.direction === "CREDIT" ? "+" : "-"}
                        {formatMoney(transaction.amount.toString(), transaction.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        {formatMoney(transaction.balanceAfter.toString(), transaction.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between text-sm">
                {page > 1 ? (
                  <Link
                    href={`/reviewer/wallet?page=${page - 1}`}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span />
                )}

                <span className="text-slate-500">
                  Page {page} of {totalPages}
                </span>

                {page < totalPages ? (
                  <Link
                    href={`/reviewer/wallet?page=${page + 1}`}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Next →
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
