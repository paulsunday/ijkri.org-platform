import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

function formatDate(value: Date | null) {
    if (!value) {
        return "No due date";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);
}

function getStatusBadge(status: string) {
    switch (status) {
        case "PAID":
            return "bg-green-100 text-green-800";

        case "WAIVED":
            return "bg-blue-100 text-blue-800";

        case "PARTIALLY_WAIVED":
            return "bg-purple-100 text-purple-800";

        case "OVERDUE":
            return "bg-red-100 text-red-800";

        case "CANCELLED":
            return "bg-gray-200 text-gray-700";

        case "PENDING":
        default:
            return "bg-yellow-100 text-yellow-800";
    }
}

export default async function AuthorInvoicesPage() {
    const user = await requireAnyRole(["AUTHOR"]);

    const invoices = await prisma.invoice.findMany({
        where: {
            userId: user.id,
        },

        include: {
            submission: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },

        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <main className="mx-auto max-w-7xl px-6 py-12">
            <header>
                <h1 className="text-3xl font-bold">
                    APC Invoices
                </h1>

                <p className="mt-2 text-gray-600">
                    View and pay your article processing charge
                    invoices.
                </p>
            </header>

            {invoices.length === 0 ? (
                <section className="mt-10 rounded-xl border bg-white p-10 text-center shadow-sm">
                    <h2 className="text-xl font-semibold">
                        No invoices
                    </h2>

                    <p className="mt-3 text-gray-600">
                        No APC invoices have been issued to your
                        account.
                    </p>

                    <Link
                        href="/author/dashboard"
                        className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
                    >
                        Return to Dashboard
                    </Link>
                </section>
            ) : (
                <section className="mt-8 overflow-x-auto rounded-xl border bg-white shadow-sm">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold">
                                    Invoice
                                </th>

                                <th className="px-6 py-4 text-left text-sm font-semibold">
                                    Manuscript
                                </th>

                                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold">
                                    Amount
                                </th>

                                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold">
                                    Status
                                </th>

                                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold">
                                    Due Date
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-semibold">
                                    Action
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {invoices.map((invoice) => (
                                <tr
                                    key={invoice.id}
                                    className="border-t hover:bg-slate-50"
                                >
                                    <td className="whitespace-nowrap px-6 py-5 font-medium">
                                        {invoice.invoiceNumber}
                                    </td>

                                    <td className="max-w-md px-6 py-5">
                                        {invoice.submission?.title ??
                                            "Article processing charge"}
                                    </td>

                                    <td className="whitespace-nowrap px-6 py-5 font-medium">
                                        {invoice.currency}{" "}
                                        {invoice.amount.toFixed(2)}
                                    </td>

                                    <td className="whitespace-nowrap px-6 py-5">
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadge(
                                                invoice.status,
                                            )}`}
                                        >
                                            {formatStatus(invoice.status)}
                                        </span>
                                    </td>

                                    <td className="whitespace-nowrap px-6 py-5">
                                        {formatDate(invoice.dueAt)}
                                    </td>

                                    <td className="whitespace-nowrap px-6 py-5 text-right">
                                        <Link
                                            href={`/author/invoices/${invoice.id}`}
                                            className="inline-block rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800"
                                        >
                                            View Invoice
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
        </main>
    );
}