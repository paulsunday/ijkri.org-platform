import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { PaymentStatus } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

import { FinanceAuditCard } from "./finance-audit-card";
import { PaymentActions } from "./payment-actions";
import { PaymentIntegrityCard } from "./payment-integrity-card";
import { PaymentStatusBadge } from "./payment-status-badge";
import { PaymentTimeline } from "./payment-timeline";
import { ProviderResponseCard } from "./provider-response-card";
import { ReceiptDownloadButton } from "./receipt-download-button";
import { RefundDialog } from "./refund-dialog";
import { RefundHistoryCard } from "./refund-history-card";
import { WebhookEventsCard } from "./webhook-events-card";

export const dynamic = "force-dynamic";

const FINANCE_ROLES = new Set([
    "SUPER_ADMIN",
    "ADMIN",
    "PUBLISHER",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
]);

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function money(
    value: number | null | undefined,
    currency = "USD",
) {
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
    }).format(Number(value ?? 0));
}

function formatDate(value: Date | null | undefined) {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export default async function PaymentDetailsPage({
    params,
}: PageProps) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const roles =
        (session.user as {
            roles?: {
                role: string;
                journalId: string;
            }[];
        }).roles ?? [];

    const permitted = roles.some((r) =>
        FINANCE_ROLES.has(r.role),
    );

    if (!permitted) {
        redirect("/unauthorized");
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
        where: {
            id,
        },

        include: {
            journal: true,

            user: true,

            invoice: {
                include: {
                    submission: {
                        include: {
                            journal: true,

                            article: {
                                include: {
                                    issue: {
                                        include: {
                                            volume: true,
                                        },
                                    },

                                    authors: {
                                        orderBy: {
                                            sortOrder: "asc",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },

            subscription: true,

            articlePurchase: {
                include: {
                    article: {
                        include: {
                            journal: true,

                            authors: {
                                orderBy: {
                                    sortOrder: "asc",
                                },
                            },
                        },
                    },
                },
            },

            refunds: {
                orderBy: {
                    createdAt: "desc",
                },
            },

            webhookLogs: {
                orderBy: {
                    receivedAt: "desc",
                },
            },
        },
    });

    if (!payment) {
        notFound();
    }

    const amount =
        payment.paidAmount?.toNumber() ??
        payment.amount.toNumber();

    const refunded =
        payment.refundedAmount?.toNumber() ?? 0;

    const outstanding = Math.max(
        0,
        Math.round((amount - refunded) * 100) / 100,
    );
    const submission = payment.invoice?.submission;
    const article = payment.articlePurchase?.article ?? submission?.article;

    return (
        <main className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Finance / Payment Details
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight">
                        Payment Details
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Receipt{" "}
                        <span className="break-all font-semibold">
                            {payment.receiptNumber ?? "Not Issued"}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/admin/payments"
                        className="rounded-lg border px-4 py-2 hover:bg-slate-100"
                    >
                        Back
                    </Link>

                    <ReceiptDownloadButton
                        paymentId={payment.id}
                        receiptNumber={payment.receiptNumber}
                        className="min-w-48"
                    />

                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-2">
                    <h2 className="mb-5 text-xl font-semibold">
                        Payment Summary
                    </h2>

                    <div className="grid gap-5 md:grid-cols-2">

                        <div>
                            <p className="text-sm text-slate-500">
                                Internal Reference
                            </p>

                            <p className="mt-1 font-medium break-all">
                                {payment.internalReference}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Provider Reference
                            </p>

                            <p className="mt-1 font-medium break-all">
                                {payment.providerReference ?? "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Payment Provider
                            </p>

                            <p className="mt-1 font-medium">
                                {payment.provider}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Payment Channel
                            </p>

                            <p className="mt-1 font-medium">
                                {payment.providerChannel ?? "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Purpose
                            </p>

                            <p className="mt-1 font-medium">
                                {payment.purpose.replaceAll("_", " ")}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Status
                            </p>

                            <div className="mt-2">
                                <PaymentStatusBadge
                                    status={payment.status}
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Amount
                            </p>

                            <p className="mt-1 text-lg font-semibold">
                                {money(amount, payment.currency)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Refunded
                            </p>

                            <p className="mt-1 font-semibold">
                                {money(refunded, payment.currency)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Outstanding
                            </p>

                            <p className="mt-1 font-semibold">
                                {money(outstanding, payment.currency)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Currency
                            </p>

                            <p className="mt-1 font-medium">
                                {payment.currency}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Initiated
                            </p>

                            <p className="mt-1">
                                {formatDate(payment.initiatedAt)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Paid
                            </p>

                            <p className="mt-1">
                                {formatDate(payment.paidAt)}
                            </p>
                        </div>

                    </div>
                </section>

                <aside className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="mb-5 text-xl font-semibold">
                        Customer
                    </h2>

                    <div className="space-y-4">

                        <div>
                            <p className="text-sm text-slate-500">
                                Name
                            </p>

                            <p className="font-medium">
                                {payment.user.name}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Email
                            </p>

                            <p>{payment.user.email}</p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Customer Email
                            </p>

                            <p>{payment.customerEmail ?? "—"}</p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Journal
                            </p>

                            <p>{payment.journal.name}</p>
                        </div>

                    </div>
                </aside>
            </div>
            {(payment.invoice || submission) && (
                <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-semibold">
                        APC Invoice & Submission
                    </h2>

                    <div className="grid gap-6 md:grid-cols-2">

                        <div>
                            <p className="text-sm text-slate-500">
                                Invoice Number
                            </p>

                            <p className="mt-1 font-medium">
                                {payment.invoice?.invoiceNumber ?? "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Invoice Status
                            </p>

                            <p className="mt-1 font-medium">
                                {payment.invoice?.status ?? "—"}
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <p className="text-sm text-slate-500">
                                Submission Title
                            </p>

                            <p className="mt-1 font-medium">
                                {submission?.title ?? "—"}
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <p className="text-sm text-slate-500">
                                Abstract
                            </p>

                            <p className="mt-1 whitespace-pre-line text-slate-700">
                                {submission?.abstract ?? "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Manuscript Type
                            </p>

                            <p className="mt-1">
                                {submission?.manuscriptType ?? "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Submission Status
                            </p>

                            <p className="mt-1">
                                {submission?.status ?? "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Submitted
                            </p>

                            <p className="mt-1">
                                {formatDate(submission?.submittedAt)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Current Review Round
                            </p>

                            <p className="mt-1">
                                {submission?.currentReviewRound ?? "—"}
                            </p>
                        </div>

                    </div>
                </section>
            )}

            {payment.subscription && (
                <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-semibold">
                        Subscription Details
                    </h2>

                    <div className="grid gap-6 md:grid-cols-2">

                        <div>
                            <p className="text-sm text-slate-500">
                                Plan
                            </p>

                            <p className="mt-1 font-medium">
                                {payment.subscription.planName}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Status
                            </p>

                            <p className="mt-1">
                                {payment.subscription.status}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Starts
                            </p>

                            <p className="mt-1">
                                {formatDate(payment.subscription.startsAt)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Expires
                            </p>

                            <p className="mt-1">
                                {formatDate(payment.subscription.expiresAt)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Duration
                            </p>

                            <p className="mt-1">
                                {payment.subscription.durationMonths} month(s)
                            </p>
                        </div>

                    </div>
                </section>
            )}

            {payment.articlePurchase && article && (
                <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-semibold">
                        Article Purchase
                    </h2>

                    <div className="space-y-5">

                        <div>
                            <p className="text-sm text-slate-500">
                                Article
                            </p>

                            <p className="mt-1 text-lg font-medium">
                                {article.title}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                DOI
                            </p>

                            <p className="mt-1">
                                {article.doi ?? "Not Assigned"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Access Type
                            </p>

                            <p className="mt-1">
                                {article.accessType.replaceAll("_", " ")}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Access Granted
                            </p>

                            <p className="mt-1">
                                {formatDate(payment.articlePurchase.accessGrantedAt)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Authors
                            </p>

                            <ul className="mt-2 space-y-2">
                                {article.authors.map((author) => (
                                    <li key={author.id}>
                                        <strong>{author.fullName}</strong>

                                        {author.affiliation && (
                                            <span className="text-slate-500">
                                                {" "}
                                                — {author.affiliation}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>
                </section>
            )}
            <section className="mt-8 grid gap-8 lg:grid-cols-2">

                <RefundHistoryCard
                    refunds={payment.refunds}
                />

                <WebhookEventsCard
                    logs={payment.webhookLogs}
                />
            </section>

            <ProviderResponseCard
                provider={payment.provider}
                providerStatus={
                    payment.providerStatus
                }
                providerReference={
                    payment.providerReference
                }
                providerChannel={
                    payment.providerChannel
                }
                providerResponse={
                    payment.providerResponse
                }
            />

            <PaymentTimeline
                createdAt={payment.createdAt}
                initiatedAt={payment.initiatedAt}
                paidAt={payment.paidAt}
                latestRefund={
                    payment.refunds[0]
                        ? {
                            createdAt:
                                payment.refunds[0].createdAt,
                            status:
                                payment.refunds[0].status,
                        }
                        : null
                }
            />

            <section className="mt-8 grid gap-8 lg:grid-cols-2">

                <FinanceAuditCard
                    createdAt={payment.createdAt}
                    updatedAt={payment.updatedAt}
                    paymentId={payment.id}
                    journalId={payment.journalId}
                    userId={payment.userId}
                />

                <div className="rounded-xl border bg-white p-6 shadow-sm">

                    <h2 className="mb-6 text-xl font-semibold">
                        Quick Actions
                    </h2>

                    <div className="grid gap-4">
                        <RefundDialog
                            paymentId={payment.id}
                            currency={payment.currency}
                            refundableAmount={outstanding}
                            disabled={
                                payment.status !== PaymentStatus.PAID &&
                                payment.status !==
                                PaymentStatus.PARTIALLY_REFUNDED
                            }
                        />

                        <PaymentActions
                            paymentId={payment.id}
                            status={payment.status}
                            provider={payment.provider}
                            providerReference={
                                payment.providerReference
                            }
                        />

                        <Link
                            href="/admin/users"
                            className="rounded-lg border px-4 py-3 hover:bg-slate-100"
                        >
                            View Customer
                        </Link>

                        {submission && (
                            <Link
                                href={`/admin/submissions/${submission.id}`}
                                className="rounded-lg border px-4 py-3 hover:bg-slate-100"
                            >
                                View Submission
                            </Link>
                        )}

                        {article && (
                            <Link
                                href={`/articles/${article.slug}`}
                                target="_blank"
                                className="rounded-lg border px-4 py-3 hover:bg-slate-100"
                            >
                                View Published Article
                            </Link>
                        )}

                        <ReceiptDownloadButton
                            paymentId={payment.id}
                            receiptNumber={payment.receiptNumber}
                        />

                    </div>

                </div>

            </section>
            <PaymentIntegrityCard
                paymentStatus={payment.status}
                purpose={payment.purpose}
                webhookCount={payment.webhookLogs.length}
                refundCount={payment.refunds.length}
                outstanding={outstanding}
            />

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">

                <Link
                    href="/admin/payments"
                    className="rounded-lg border px-5 py-2 hover:bg-slate-100"
                >
                    ← Back to Payments
                </Link>

                <div className="text-sm text-slate-500">
                    Last updated {formatDate(payment.updatedAt)}
                </div>

            </footer>

        </main>
    );
}