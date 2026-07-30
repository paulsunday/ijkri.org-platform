import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
    PaymentPurpose,
    PaymentStatus,
    Prisma,
} from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const FINANCE_ROLES = new Set([
    "SUPER_ADMIN",
    "ADMIN",
    "PUBLISHER",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
]);

type SearchParams = Record<string, string | string[] | undefined>;

type AdminPaymentsPageProps = {
    searchParams: Promise<SearchParams>;
};

type SessionRole = {
    role: string;
    journalId: string;
};

function getSingleValue(
    value: string | string[] | undefined,
): string {
    if (Array.isArray(value)) {
        return value[0] ?? "";
    }

    return value ?? "";
}

function parsePositiveInteger(
    value: string,
    fallback: number,
): number {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
}

function parsePaymentStatus(
    value: string,
): PaymentStatus | undefined {
    return Object.values(PaymentStatus).includes(
        value as PaymentStatus,
    )
        ? (value as PaymentStatus)
        : undefined;
}

function parsePaymentPurpose(
    value: string,
): PaymentPurpose | undefined {
    return Object.values(PaymentPurpose).includes(
        value as PaymentPurpose,
    )
        ? (value as PaymentPurpose)
        : undefined;
}

function parseDateStart(value: string): Date | undefined {
    if (!value) {
        return undefined;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value: string): Date | undefined {
    if (!value) {
        return undefined;
    }

    const date = new Date(`${value}T23:59:59.999Z`);

    return Number.isNaN(date.getTime()) ? undefined : date;
}

function getStartOfToday(): Date {
    const now = new Date();

    return new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
        ),
    );
}

function getStartOfWeek(): Date {
    const today = getStartOfToday();
    const day = today.getUTCDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;

    today.setUTCDate(today.getUTCDate() - daysSinceMonday);

    return today;
}

function getStartOfMonth(): Date {
    const now = new Date();

    return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
}

function formatMoney(
    amount: Prisma.Decimal | number | null | undefined,
    currency = "USD",
): string {
    const numericAmount =
        amount instanceof Prisma.Decimal
            ? amount.toNumber()
            : Number(amount ?? 0);

    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericAmount);
}

function formatDate(date: Date | null | undefined): string {
    if (!date) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
    }).format(date);
}

function formatStatus(status: string): string {
    return status
        .toLowerCase()
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(" ");
}

function getStatusClass(status: PaymentStatus): string {
    switch (status) {
        case PaymentStatus.PAID:
            return "bg-emerald-100 text-emerald-800";
        case PaymentStatus.PENDING:
            return "bg-amber-100 text-amber-800";
        case PaymentStatus.PROCESSING:
            return "bg-blue-100 text-blue-800";
        case PaymentStatus.FAILED:
            return "bg-red-100 text-red-800";
        case PaymentStatus.CANCELLED:
            return "bg-slate-200 text-slate-700";
        case PaymentStatus.REFUNDED:
            return "bg-purple-100 text-purple-800";
        case PaymentStatus.PARTIALLY_REFUNDED:
            return "bg-fuchsia-100 text-fuchsia-800";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

function buildPageUrl(
    currentParams: {
        search: string;
        status: string;
        purpose: string;
        journalId: string;
        startDate: string;
        endDate: string;
    },
    page: number,
): string {
    const params = new URLSearchParams();

    if (currentParams.search) {
        params.set("search", currentParams.search);
    }

    if (currentParams.status) {
        params.set("status", currentParams.status);
    }

    if (currentParams.purpose) {
        params.set("purpose", currentParams.purpose);
    }

    if (currentParams.journalId) {
        params.set("journalId", currentParams.journalId);
    }

    if (currentParams.startDate) {
        params.set("startDate", currentParams.startDate);
    }

    if (currentParams.endDate) {
        params.set("endDate", currentParams.endDate);
    }

    params.set("page", String(page));

    return `/admin/payments?${params.toString()}`;
}

export default async function AdminPaymentsPage({
    searchParams,
}: AdminPaymentsPageProps) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login?callbackUrl=/admin/payments");
    }

    const sessionUser = session.user as typeof session.user & {
        id?: string;
        roles?: SessionRole[];
    };

    const userRoles = Array.isArray(sessionUser.roles)
        ? sessionUser.roles
        : [];

    const hasFinanceAccess = userRoles.some((assignment) =>
        FINANCE_ROLES.has(assignment.role),
    );

    if (!hasFinanceAccess) {
        redirect("/unauthorized");
    }

    const resolvedSearchParams = await searchParams;

    const search = getSingleValue(
        resolvedSearchParams.search,
    ).trim();

    const statusValue = getSingleValue(
        resolvedSearchParams.status,
    );

    const purposeValue = getSingleValue(
        resolvedSearchParams.purpose,
    );

    const journalId = getSingleValue(
        resolvedSearchParams.journalId,
    );

    const startDateValue = getSingleValue(
        resolvedSearchParams.startDate,
    );

    const endDateValue = getSingleValue(
        resolvedSearchParams.endDate,
    );

    const page = parsePositiveInteger(
        getSingleValue(resolvedSearchParams.page),
        1,
    );

    const selectedStatus = parsePaymentStatus(statusValue);
    const selectedPurpose = parsePaymentPurpose(purposeValue);
    const startDate = parseDateStart(startDateValue);
    const endDate = parseDateEnd(endDateValue);

    const isGlobalAdministrator = userRoles.some(
        (assignment) =>
            assignment.role === "SUPER_ADMIN" ||
            assignment.role === "ADMIN",
    );

    const permittedJournalIds = Array.from(
        new Set(
            userRoles
                .filter((assignment) =>
                    FINANCE_ROLES.has(assignment.role),
                )
                .map((assignment) => assignment.journalId),
        ),
    );

    const selectedJournalIsPermitted =
        isGlobalAdministrator ||
        !journalId ||
        permittedJournalIds.includes(journalId);

    if (!selectedJournalIsPermitted) {
        redirect("/admin/payments");
    }

    const accessWhere: Prisma.PaymentWhereInput =
        isGlobalAdministrator
            ? {}
            : {
                journalId: {
                    in: permittedJournalIds,
                },
            };

    const filterWhere: Prisma.PaymentWhereInput = {
        ...accessWhere,

        ...(selectedStatus
            ? {
                status: selectedStatus,
            }
            : {}),

        ...(selectedPurpose
            ? {
                purpose: selectedPurpose,
            }
            : {}),

        ...(journalId
            ? {
                journalId,
            }
            : {}),

        ...(startDate || endDate
            ? {
                createdAt: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                },
            }
            : {}),

        ...(search
            ? {
                OR: [
                    {
                        internalReference: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        providerReference: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        receiptNumber: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        customerEmail: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        user: {
                            is: {
                                OR: [
                                    {
                                        name: {
                                            contains: search,
                                            mode: "insensitive",
                                        },
                                    },
                                    {
                                        email: {
                                            contains: search,
                                            mode: "insensitive",
                                        },
                                    },
                                ],
                            },
                        },
                    },
                    {
                        invoice: {
                            is: {
                                invoiceNumber: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                ],
            }
            : {}),
    };

    const todayStart = getStartOfToday();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    const [
        journals,
        totalPayments,
        payments,
        totalRevenueAggregate,
        todayRevenueAggregate,
        weekRevenueAggregate,
        monthRevenueAggregate,
        pendingPayments,
        failedPayments,
        refundedPaymentsAggregate,
        activeSubscriptions,
        articlePurchases,
        outstandingInvoices,
        averagePaymentAggregate,
        largestPayment,
    ] = await Promise.all([
        prisma.journal.findMany({
            where: isGlobalAdministrator
                ? {
                    isActive: true,
                }
                : {
                    id: {
                        in: permittedJournalIds,
                    },
                    isActive: true,
                },
            orderBy: {
                name: "asc",
            },
            select: {
                id: true,
                name: true,
                shortName: true,
            },
        }),

        prisma.payment.count({
            where: filterWhere,
        }),

        prisma.payment.findMany({
            where: filterWhere,
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
                id: true,
                purpose: true,
                provider: true,
                status: true,
                amount: true,
                paidAmount: true,
                currency: true,
                internalReference: true,
                providerReference: true,
                receiptNumber: true,
                providerChannel: true,
                customerEmail: true,
                initiatedAt: true,
                paidAt: true,
                createdAt: true,

                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                    },
                },

                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        status: true,
                    },
                },

                refunds: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        }),

        prisma.payment.aggregate({
            where: {
                ...accessWhere,
                status: PaymentStatus.PAID,
            },
            _sum: {
                paidAmount: true,
            },
        }),

        prisma.payment.aggregate({
            where: {
                ...accessWhere,
                status: PaymentStatus.PAID,
                paidAt: {
                    gte: todayStart,
                },
            },
            _sum: {
                paidAmount: true,
            },
        }),

        prisma.payment.aggregate({
            where: {
                ...accessWhere,
                status: PaymentStatus.PAID,
                paidAt: {
                    gte: weekStart,
                },
            },
            _sum: {
                paidAmount: true,
            },
        }),

        prisma.payment.aggregate({
            where: {
                ...accessWhere,
                status: PaymentStatus.PAID,
                paidAt: {
                    gte: monthStart,
                },
            },
            _sum: {
                paidAmount: true,
            },
        }),

        prisma.payment.count({
            where: {
                ...accessWhere,
                status: {
                    in: [
                        PaymentStatus.PENDING,
                        PaymentStatus.PROCESSING,
                    ],
                },
            },
        }),

        prisma.payment.count({
            where: {
                ...accessWhere,
                status: PaymentStatus.FAILED,
            },
        }),

        prisma.payment.aggregate({
            where: {
                ...accessWhere,
                status: {
                    in: [
                        PaymentStatus.REFUNDED,
                        PaymentStatus.PARTIALLY_REFUNDED,
                    ],
                },
            },
            _sum: {
                refundedAmount: true,
            },
        }),

        prisma.subscription.count({
            where: {
                status: "ACTIVE",
                ...(isGlobalAdministrator
                    ? {}
                    : {
                        journalId: {
                            in: permittedJournalIds,
                        },
                    }),
            },
        }),

        prisma.articlePurchase.count({
            where: {
                accessGrantedAt: {
                    not: null,
                },
                ...(isGlobalAdministrator
                    ? {}
                    : {
                        journalId: {
                            in: permittedJournalIds,
                        },
                    }),
            },
        }),

        prisma.invoice.count({
            where: {
                status: {
                    in: ["PENDING", "OVERDUE", "PARTIALLY_WAIVED"],
                },
                ...(isGlobalAdministrator
                    ? {}
                    : {
                        journalId: {
                            in: permittedJournalIds,
                        },
                    }),
            },
        }),

        prisma.payment.aggregate({
            where: {
                ...accessWhere,
                status: PaymentStatus.PAID,
            },
            _avg: {
                paidAmount: true,
            },
        }),

        prisma.payment.findFirst({
            where: {
                ...accessWhere,
                status: PaymentStatus.PAID,
                paidAmount: {
                    not: null,
                },
            },
            orderBy: {
                paidAmount: "desc",
            },
            select: {
                paidAmount: true,
                currency: true,
            },
        }),
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(totalPayments / PAGE_SIZE),
    );

    const safePage = Math.min(page, totalPages);

    if (safePage !== page && totalPayments > 0) {
        redirect(
            buildPageUrl(
                {
                    search,
                    status: statusValue,
                    purpose: purposeValue,
                    journalId,
                    startDate: startDateValue,
                    endDate: endDateValue,
                },
                safePage,
            ),
        );
    }

    const currentParams = {
        search,
        status: statusValue,
        purpose: purposeValue,
        journalId,
        startDate: startDateValue,
        endDate: endDateValue,
    };

    const summaryCards = [
        {
            label: "Total revenue",
            value: formatMoney(
                totalRevenueAggregate._sum.paidAmount,
            ),
            description: "All successfully completed payments",
        },
        {
            label: "Revenue today",
            value: formatMoney(
                todayRevenueAggregate._sum.paidAmount,
            ),
            description: "Paid transactions since 00:00 UTC",
        },
        {
            label: "Revenue this week",
            value: formatMoney(
                weekRevenueAggregate._sum.paidAmount,
            ),
            description: "Paid transactions since Monday",
        },
        {
            label: "Revenue this month",
            value: formatMoney(
                monthRevenueAggregate._sum.paidAmount,
            ),
            description: "Paid transactions this calendar month",
        },
        {
            label: "Pending payments",
            value: pendingPayments.toLocaleString("en-GB"),
            description: "Pending or being processed",
        },
        {
            label: "Failed payments",
            value: failedPayments.toLocaleString("en-GB"),
            description: "Transactions requiring attention",
        },
        {
            label: "Refunded amount",
            value: formatMoney(
                refundedPaymentsAggregate._sum.refundedAmount,
            ),
            description: "Full and partial refunds",
        },
        {
            label: "Active subscriptions",
            value: activeSubscriptions.toLocaleString("en-GB"),
            description: "Current paid reader subscriptions",
        },
        {
            label: "Article purchases",
            value: articlePurchases.toLocaleString("en-GB"),
            description: "Purchases with access granted",
        },
        {
            label: "Outstanding APC invoices",
            value: outstandingInvoices.toLocaleString("en-GB"),
            description: "Pending, overdue or partly waived",
        },
        {
            label: "Average payment",
            value: formatMoney(
                averagePaymentAggregate._avg.paidAmount,
            ),
            description: "Average successful transaction",
        },
        {
            label: "Largest payment",
            value: formatMoney(
                largestPayment?.paidAmount,
                largestPayment?.currency ?? "USD",
            ),
            description: "Highest successful transaction",
        },
    ];

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
                <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                            Finance administration
                        </p>

                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                            Payments dashboard
                        </h1>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            Review payment activity, revenue, invoices,
                            subscriptions, article purchases and refunds.
                        </p>
                    </div>
                </header>

                <section
                    aria-label="Payment summary"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    {summaryCards.map((card) => (
                        <article
                            key={card.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <p className="text-sm font-medium text-slate-600">
                                {card.label}
                            </p>

                            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                                {card.value}
                            </p>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                {card.description}
                            </p>
                        </article>
                    ))}
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-5">
                        <div className="mb-5">
                            <h2 className="text-lg font-bold text-slate-950">
                                Payment records
                            </h2>

                            <p className="mt-1 text-sm text-slate-600">
                                Search and filter all transactions available to
                                your administrative account.
                            </p>
                        </div>

                        <form
                            method="get"
                            className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"
                        >
                            <div className="xl:col-span-2">
                                <label
                                    htmlFor="search"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Search
                                </label>

                                <input
                                    id="search"
                                    name="search"
                                    type="search"
                                    defaultValue={search}
                                    placeholder="Reference, receipt, invoice, name or email"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="status"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Status
                                </label>

                                <select
                                    id="status"
                                    name="status"
                                    defaultValue={statusValue}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">All statuses</option>

                                    {Object.values(PaymentStatus).map((status) => (
                                        <option key={status} value={status}>
                                            {formatStatus(status)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="purpose"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Purpose
                                </label>

                                <select
                                    id="purpose"
                                    name="purpose"
                                    defaultValue={purposeValue}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">All purposes</option>

                                    {Object.values(PaymentPurpose).map(
                                        (purpose) => (
                                            <option key={purpose} value={purpose}>
                                                {formatStatus(purpose)}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="journalId"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Journal
                                </label>

                                <select
                                    id="journalId"
                                    name="journalId"
                                    defaultValue={journalId}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">All journals</option>

                                    {journals.map((journal) => (
                                        <option
                                            key={journal.id}
                                            value={journal.id}
                                        >
                                            {journal.shortName || journal.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                                >
                                    Apply
                                </button>

                                <Link
                                    href="/admin/payments"
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                    Reset
                                </Link>
                            </div>

                            <div>
                                <label
                                    htmlFor="startDate"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    From
                                </label>

                                <input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    defaultValue={startDateValue}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="endDate"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    To
                                </label>

                                <input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    defaultValue={endDateValue}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </form>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Payment
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Customer
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Journal
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Purpose
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Amount
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Date
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 bg-white">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-5 py-14 text-center"
                                        >
                                            <p className="text-base font-semibold text-slate-800">
                                                No payment records found
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Adjust the filters or clear the search
                                                criteria.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => {
                                        const displayAmount =
                                            payment.paidAmount ?? payment.amount;

                                        return (
                                            <tr
                                                key={payment.id}
                                                className="transition hover:bg-slate-50"
                                            >
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {payment.receiptNumber ||
                                                            payment.invoice?.invoiceNumber ||
                                                            payment.internalReference}
                                                    </p>

                                                    <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                                                        {payment.providerReference ||
                                                            payment.internalReference}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {payment.user.name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {payment.customerEmail ||
                                                            payment.user.email}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="max-w-[200px] truncate text-sm text-slate-800">
                                                        {payment.journal.shortName ||
                                                            payment.journal.name}
                                                    </p>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                                                    {formatStatus(payment.purpose)}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-950">
                                                    {formatMoney(
                                                        displayAmount,
                                                        payment.currency,
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                                            payment.status,
                                                        )}`}
                                                    >
                                                        {formatStatus(payment.status)}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                    {formatDate(
                                                        payment.paidAt ??
                                                        payment.initiatedAt ??
                                                        payment.createdAt,
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                                    <Link
                                                        href={`/admin/payments/${payment.id}`}
                                                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                                                    >
                                                        View details
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <footer className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-600">
                            Showing{" "}
                            <span className="font-semibold text-slate-900">
                                {totalPayments === 0
                                    ? 0
                                    : (page - 1) * PAGE_SIZE + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-slate-900">
                                {Math.min(page * PAGE_SIZE, totalPayments)}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-slate-900">
                                {totalPayments.toLocaleString("en-GB")}
                            </span>{" "}
                            payments
                        </p>

                        <nav
                            aria-label="Payment pagination"
                            className="flex items-center gap-2"
                        >
                            {page > 1 ? (
                                <Link
                                    href={buildPageUrl(
                                        currentParams,
                                        page - 1,
                                    )}
                                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                    Previous
                                </Link>
                            ) : (
                                <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-400">
                                    Previous
                                </span>
                            )}

                            <span className="px-2 text-sm font-medium text-slate-700">
                                Page {page} of {totalPages}
                            </span>

                            {page < totalPages ? (
                                <Link
                                    href={buildPageUrl(
                                        currentParams,
                                        page + 1,
                                    )}
                                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                    Next
                                </Link>
                            ) : (
                                <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-400">
                                    Next
                                </span>
                            )}
                        </nav>
                    </footer>
                </section>
            </div>
        </main>
    );
}