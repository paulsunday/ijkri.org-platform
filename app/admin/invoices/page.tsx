import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { RecordManualPaymentForm, WaiveInvoiceForm } from "./InvoiceForms";

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function statusBadge(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800";

    case "WAIVED":
      return "bg-blue-100 text-blue-800";

    case "PARTIALLY_WAIVED":
      return "bg-purple-100 text-purple-800";

    case "OVERDUE":
      return "bg-red-100 text-red-800";

    case "VOID":
      return "bg-gray-200 text-gray-700";

    case "PENDING":
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export default async function AdminInvoicesPage() {
  await requireAnyRole(ADMIN_ROLES);

  const invoices = await prisma.invoice.findMany({
    include: {
      journal: {
        select: {
          name: true,
        },
      },

      user: {
        select: {
          name: true,
          email: true,
        },
      },

      submission: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },

      waivedBy: {
        select: {
          name: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingCount = invoices.filter(
    (invoice) => invoice.status === "PENDING" || invoice.status === "OVERDUE",
  ).length;

  const paidCount = invoices.filter(
    (invoice) => invoice.status === "PAID",
  ).length;

  const waivedCount = invoices.filter(
    (invoice) =>
      invoice.status === "WAIVED" || invoice.status === "PARTIALLY_WAIVED",
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

        <h1 className="mt-4 text-4xl font-bold">APC Invoices</h1>

        <p className="mt-3 text-gray-600">
          Every Article Processing Charge invoice, including ones no author
          has attempted to pay yet. Waive an invoice or record an approved
          manual/offline payment here.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Invoices</p>

          <p className="mt-2 text-3xl font-bold">{invoices.length}</p>
        </article>

        <article className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">Awaiting Payment</p>

          <p className="mt-2 text-3xl font-bold text-yellow-900">
            {pendingCount}
          </p>
        </article>

        <article className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">Paid</p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {paidCount}
          </p>
        </article>

        <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm text-blue-700">Waived</p>

          <p className="mt-2 text-3xl font-bold text-blue-900">
            {waivedCount}
          </p>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Invoice Directory</h2>

        {invoices.length === 0 ? (
          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-6">
            <p className="font-semibold text-yellow-900">No invoices found</p>

            <p className="mt-2 text-sm text-yellow-800">
              Invoices appear here automatically when an editor accepts a
              manuscript.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {invoices.map((invoice) => {
              const canWaive =
                invoice.status !== "PAID" &&
                invoice.status !== "WAIVED" &&
                invoice.status !== "VOID";

              const canRecordManualPayment =
                invoice.status === "PENDING" ||
                invoice.status === "OVERDUE";

              return (
                <article key={invoice.id} className="rounded-xl border p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">
                        {invoice.journal.name}
                      </p>

                      <h3 className="mt-1 text-lg font-bold">
                        {invoice.invoiceNumber}
                      </h3>

                      <p className="mt-1 text-gray-600">
                        {invoice.submission?.title ??
                          "Article processing charge"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {invoice.user.name} — {invoice.user.email}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${statusBadge(
                        invoice.status,
                      )}`}
                    >
                      {formatStatus(invoice.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-gray-500">Amount</p>

                      <p className="font-medium">
                        {invoice.currency} {invoice.amount.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Due Date</p>

                      <p className="font-medium">
                        {formatDate(invoice.dueAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Paid</p>

                      <p className="font-medium">
                        {formatDate(invoice.paidAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Waived
                      </p>

                      <p className="font-medium">
                        {invoice.waivedAt
                          ? `${formatDate(invoice.waivedAt)} by ${invoice.waivedBy?.name ?? "—"
                          }`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {invoice.waivedReason && (
                    <p className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                      <strong>Waiver reason:</strong> {invoice.waivedReason}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {invoice.submission && (
                      <Link
                        href={`/admin/submissions/${invoice.submission.id}`}
                        className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        View Submission
                      </Link>
                    )}
                  </div>

                  {(canWaive || canRecordManualPayment) && (
                    <div className="mt-6 grid gap-4 border-t pt-6 md:grid-cols-2">
                      {canRecordManualPayment && (
                        <RecordManualPaymentForm invoiceId={invoice.id} />
                      )}

                      {canWaive && (
                        <WaiveInvoiceForm invoiceId={invoice.id} />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
