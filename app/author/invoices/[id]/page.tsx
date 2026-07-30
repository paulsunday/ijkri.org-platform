import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { initializeInvoicePayment } from "../actions";

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: Date | null) {
    if (!value) return "Not available";

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(value);
}

function formatMoney(amount: number | { toNumber(): number }) {
    const value =
        typeof amount === "number"
            ? amount
            : amount.toNumber();

    return value.toFixed(2);
}

function statusBadge(status: string) {
    switch (status) {
        case "PAID":
            return "bg-green-100 text-green-800";

        case "OVERDUE":
            return "bg-red-100 text-red-800";

        case "WAIVED":
            return "bg-blue-100 text-blue-800";

        case "PARTIALLY_WAIVED":
            return "bg-purple-100 text-purple-800";

        default:
            return "bg-yellow-100 text-yellow-800";
    }
}

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function InvoiceDetailsPage({
    params,
}: PageProps) {
    const user = await requireAnyRole(["AUTHOR"]);

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
        where: {
            id,
            userId: user.id,
        },

        include: {
            submission: {
                select: {
                    id: true,
                    title: true,
                },
            },

            journal: {
                select: {
                    id: true,
                    name: true,
                },
            },

            payments: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });

    if (!invoice) {
        notFound();
    }

    const latestPayment = invoice.payments[0] ?? null;

    return (
        <main className="mx-auto max-w-5xl px-6 py-12">
            <Link
                href="/author/invoices"
                className="text-blue-700 hover:underline"
            >
                ← Back to Invoices
            </Link>

            <div className="mt-6 rounded-xl border bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">
                            APC Invoice
                        </h1>

                        <p className="mt-2 text-gray-600">
                            {invoice.invoiceNumber}
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

                <div className="mt-10 grid gap-6 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">
                            Journal
                        </p>

                        <p className="font-medium">
                            {invoice.journal.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Manuscript
                        </p>

                        <p className="font-medium">
                            {invoice.submission?.title ??
                                "Article Processing Charge"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Amount
                        </p>

                        <p className="text-2xl font-bold">
                            {invoice.currency}{" "}
                            {formatMoney(invoice.amount)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Due Date
                        </p>

                        <p className="font-medium">
                            {formatDate(invoice.dueAt)}
                        </p>
                    </div>
                </div>

                <hr className="my-8" />

                <h2 className="text-xl font-semibold">
                    Latest Payment
                </h2>

                {latestPayment ? (
                    <div className="mt-4 rounded-lg border p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Reference
                                </p>

                                <p>
                                    {latestPayment.providerReference ??
                                        latestPayment.internalReference}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">
                                    Status
                                </p>

                                <p>{latestPayment.status}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">
                                    Amount
                                </p>

                                <p>
                                    {latestPayment.currency}{" "}
                                    {formatMoney(latestPayment.amount)}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">
                                    Date
                                </p>

                                <p>
                                    {formatDate(
                                        latestPayment.paidAt ??
                                        latestPayment.createdAt,
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-5">
                        No payment has been made.
                    </div>
                )}

                <div className="mt-10 flex flex-wrap gap-4">
                    {invoice.status !== "PAID" &&
                        invoice.status !== "WAIVED" &&
                        invoice.status !== "PARTIALLY_WAIVED" &&
                        invoice.status !== "VOID" && (
                            <form action={initializeInvoicePayment}>
                                <input
                                    type="hidden"
                                    name="invoiceId"
                                    value={invoice.id}
                                />

                                <button
                                    type="submit"
                                    className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
                                >
                                    Pay Now
                                </button>
                            </form>
                        )}

                    <button
                        disabled
                        className="rounded-lg bg-slate-200 px-6 py-3 font-semibold text-slate-500"
                    >
                        Download Invoice
                    </button>

                    <button
                        disabled
                        className="rounded-lg bg-slate-200 px-6 py-3 font-semibold text-slate-500"
                    >
                        Download Receipt
                    </button>
                </div>
            </div>
        </main>
    );
}