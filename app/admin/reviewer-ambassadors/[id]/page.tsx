import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/ambassador/levels";

import {
  AdjustEarningsForm,
  AmbassadorStatusForm,
  RegenerateCodeForm,
  IssueCertificateForm,
} from "./AmbassadorForms";

type Props = {
  params: Promise<{ id: string }>;
};

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

export default async function AdminAmbassadorDetailPage({ params }: Props) {
  await requireAnyRole(ADMIN_ROLES);

  const { id } = await params;

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true, email: true, affiliation: true, country: true },
      },
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!ambassador) {
    notFound();
  }

  const [referredSubmissions, referredUsers] = await Promise.all([
    prisma.submission.findMany({
      where: { referrerReviewerId: ambassador.userId },
      select: { id: true, title: true, status: true, submittedAt: true },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),

    prisma.user.count({
      where: { referredByReviewerId: ambassador.userId },
    }),
  ]);

  const currency = ambassador.wallet?.currency ?? "USD";

  return (
    <div className="p-6">
      <Link
        href="/admin/reviewer-ambassadors"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to Reviewer Ambassadors
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{ambassador.user.name}</h1>
          <p className="text-slate-600">{ambassador.user.email}</p>
          <p className="mt-2 font-mono text-sm">{ambassador.referralCode}</p>
        </div>

        <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
          {LEVEL_LABELS[ambassador.level]}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Total Referrals
          </p>
          <p className="mt-2 text-2xl font-bold">{referredUsers}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Published Referrals
          </p>
          <p className="mt-2 text-2xl font-bold">
            {ambassador.publishedReferralCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Wallet Balance
          </p>
          <p className="mt-2 text-2xl font-bold">
            {ambassador.wallet
              ? formatMoney(ambassador.wallet.currentBalance.toString(), currency)
              : "—"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Status
          </p>
          <p className="mt-2 text-2xl font-bold">{ambassador.status}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Referred Manuscripts</h2>

          <div className="mt-4 space-y-3">
            {referredSubmissions.length === 0 && (
              <p className="text-slate-500">No referred manuscripts yet.</p>
            )}

            {referredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-lg border bg-slate-50 p-3 text-sm"
              >
                <p className="font-semibold">{submission.title}</p>
                <p className="text-slate-500">{submission.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Recent Wallet Transactions</h2>

          <div className="mt-4 space-y-3">
            {(ambassador.wallet?.transactions.length ?? 0) === 0 && (
              <p className="text-slate-500">No transactions yet.</p>
            )}

            {ambassador.wallet?.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border bg-slate-50 p-3 text-sm"
              >
                <span>{transaction.description}</span>
                <span
                  className={
                    transaction.direction === "CREDIT"
                      ? "font-semibold text-emerald-700"
                      : "font-semibold text-red-700"
                  }
                >
                  {transaction.direction === "CREDIT" ? "+" : "-"}
                  {formatMoney(transaction.amount.toString(), transaction.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Adjust Earnings</h2>

          <AdjustEarningsForm ambassadorId={ambassador.id} currency={currency} />
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Ambassador Status</h2>

          <AmbassadorStatusForm
            ambassador={{
              id: ambassador.id,
              status: ambassador.status,
              suspendedReason: ambassador.suspendedReason,
            }}
          />
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Referral Code</h2>

          <p className="mt-2 text-sm text-slate-600">
            Regenerating replaces this reviewer&apos;s code permanently. The
            old code will stop working; existing referral attributions are
            unaffected.
          </p>

          <RegenerateCodeForm ambassadorId={ambassador.id} />
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Award a Certificate</h2>

        <p className="mt-2 text-sm text-slate-600">
          Recognitions such as Outstanding Reviewer, Top Reviewer, or Top
          Ambassador are awarded manually by an administrator.
        </p>

        <IssueCertificateForm ambassadorId={ambassador.id} />
      </div>
    </div>
  );
}
