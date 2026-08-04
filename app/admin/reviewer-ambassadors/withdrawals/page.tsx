import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { approveWithdrawal, rejectWithdrawal } from "./actions";

function formatMoney(value: string | number, currency: string) {
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

export default async function AdminWithdrawalsPage() {
  await requireAnyRole(ADMIN_ROLES);

  const withdrawals = await prisma.withdrawalRequest.findMany({
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      ambassador: { select: { user: { select: { name: true, email: true } } } },
      payoutAccount: {
        select: { bankName: true, accountNumber: true, accountName: true },
      },
    },
  });

  const pending = withdrawals.filter((withdrawal) => withdrawal.status === "PENDING");
  const others = withdrawals.filter((withdrawal) => withdrawal.status !== "PENDING");

  return (
    <div className="p-6">
      <Link
        href="/admin/reviewer-ambassadors"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to Reviewer Ambassadors
      </Link>

      <h1 className="mt-4 text-3xl font-bold">Withdrawal Requests</h1>

      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Note: reviewer wallets are denominated in {withdrawals[0]?.currency ?? "USD"},
        but payouts settle in Nigerian Naira via Paystack. Confirm the correct
        payout amount before approving.
      </p>

      <div className="mt-8">
        <h2 className="text-xl font-bold">Pending</h2>

        <div className="mt-4 space-y-4">
          {pending.length === 0 && (
            <p className="text-slate-500">No pending withdrawal requests.</p>
          )}

          {pending.map((withdrawal) => (
            <div
              key={withdrawal.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {withdrawal.ambassador.user.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {withdrawal.ambassador.user.email}
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {formatMoney(withdrawal.amount.toString(), withdrawal.currency)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {withdrawal.payoutAccount.bankName} ····{" "}
                    {withdrawal.payoutAccount.accountNumber.slice(-4)} (
                    {withdrawal.payoutAccount.accountName})
                  </p>
                  <p className="text-xs text-slate-400">
                    Requested {withdrawal.requestedAt.toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <form action={approveWithdrawal}>
                    <input type="hidden" name="withdrawalId" value={withdrawal.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Approve & Pay
                    </button>
                  </form>

                  <form action={rejectWithdrawal} className="flex flex-col gap-2">
                    <input type="hidden" name="withdrawalId" value={withdrawal.id} />
                    <input
                      name="reviewNotes"
                      placeholder="Rejection reason"
                      required
                      className="rounded-lg border p-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold">History</h2>

        <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600">
                <th className="px-4 py-3">Reviewer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>

            <tbody>
              {others.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No resolved withdrawals yet.
                  </td>
                </tr>
              )}

              {others.map((withdrawal) => (
                <tr key={withdrawal.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{withdrawal.ambassador.user.name}</td>
                  <td className="px-4 py-3">
                    {formatMoney(withdrawal.amount.toString(), withdrawal.currency)}
                  </td>
                  <td className="px-4 py-3">{withdrawal.status}</td>
                  <td className="px-4 py-3">
                    {withdrawal.updatedAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
