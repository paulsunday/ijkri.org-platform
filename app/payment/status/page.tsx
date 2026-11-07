import Link from "next/link";
import type { Metadata } from "next";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { autoReconcilePaystackPayments } from "@/lib/payments/auto-reconcile";
import { formatCheckoutMoney } from "@/lib/payments/checkout-currency";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Payment Status",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
    searchParams: Promise<{ reference?: string }>;
};

const PURPOSE_LABEL: Record<string, string> = {
    APC: "Article processing charge",
    SUBSCRIPTION: "Journal subscription",
    ARTICLE_PURCHASE: "Article purchase",
    RESEARCH_TOOLKIT: "Research Topic Formulation Workbench",
};

async function loadPayment(reference: string, userId: string) {
    return prisma.payment.findFirst({
        where: {
            userId,
            OR: [{ internalReference: reference }, { providerReference: reference }],
        },
        select: {
            id: true,
            status: true,
            purpose: true,
            amount: true,
            paidAmount: true,
            currency: true,
            receiptNumber: true,
            internalReference: true,
            paidAt: true,
            invoiceId: true,
            subscription: { select: { journal: { select: { slug: true } } } },
            articlePurchase: { select: { article: { select: { slug: true } } } },
        },
    });
}

type LoadedPayment = NonNullable<Awaited<ReturnType<typeof loadPayment>>>;

function continueLink(payment: LoadedPayment): { href: string; label: string } {
    switch (payment.purpose) {
        case "RESEARCH_TOOLKIT":
            return { href: "/toolkit", label: "Open the workbench" };
        case "SUBSCRIPTION":
            return payment.subscription
                ? { href: `/subscribe/${payment.subscription.journal.slug}`, label: "View subscription" }
                : { href: "/", label: "Go to homepage" };
        case "ARTICLE_PURCHASE":
            return payment.articlePurchase
                ? { href: `/articles/${payment.articlePurchase.article.slug}`, label: "Read the article" }
                : { href: "/", label: "Go to homepage" };
        default:
            return payment.invoiceId
                ? { href: `/author/invoices/${payment.invoiceId}`, label: "View invoice" }
                : { href: "/", label: "Go to homepage" };
    }
}

export default async function PaymentStatusPage({ searchParams }: PageProps) {
    const user = await requireCurrentUser();
    const { reference = "" } = await searchParams;

    let payment = reference ? await loadPayment(reference.trim(), user.id) : null;

    // Not confirmed yet? Ask Paystack now instead of making them wait.
    if (payment && payment.status !== "PAID") {
        await autoReconcilePaystackPayments({
            where: { id: payment.id },
            sinceDays: 60,
            limit: 1,
        });

        payment = await loadPayment(reference.trim(), user.id);
    }

    if (!payment) {
        return (
            <main className="mx-auto max-w-xl px-6 py-20 text-center">
                <h1 className="text-2xl font-bold">Payment not found</h1>
                <p className="mt-3 text-slate-600">
                    We couldn&apos;t find this payment on your account. If you
                    were charged, contact the journal with your Paystack
                    receipt.
                </p>
                <Link href="/" className="mt-6 inline-block underline">
                    Go to homepage
                </Link>
            </main>
        );
    }

    const paid = payment.status === "PAID";
    const failed = payment.status === "FAILED" || payment.status === "CANCELLED";
    const next = continueLink(payment);
    const amount = formatCheckoutMoney(payment.paidAmount ?? payment.amount, payment.currency);

    return (
        <main className="mx-auto max-w-xl px-6 py-16">
            <div
                className={`rounded-2xl border p-8 text-center ${
                    paid
                        ? "border-green-200 bg-green-50"
                        : failed
                          ? "border-red-200 bg-red-50"
                          : "border-amber-200 bg-amber-50"
                }`}
            >
                <p className="text-5xl" aria-hidden="true">
                    {paid ? "✅" : failed ? "⚠️" : "⏳"}
                </p>

                <h1 className="mt-4 text-2xl font-bold">
                    {paid
                        ? "Payment successful"
                        : failed
                          ? "Payment not completed"
                          : "Confirming your payment…"}
                </h1>

                <p className="mt-2 text-slate-700">
                    {paid
                        ? `Thank you! Your ${PURPOSE_LABEL[payment.purpose] ?? "payment"} is now active.`
                        : failed
                          ? "Paystack did not confirm this payment. If you were charged, refresh this page in a minute — it checks with Paystack again."
                          : "Paystack hasn't confirmed this payment yet. This usually takes a few seconds — refresh this page."}
                </p>
            </div>

            <dl className="mt-8 space-y-3 rounded-2xl border border-slate-200 p-6 text-sm">
                <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">For</dt>
                    <dd className="text-right font-medium">
                        {PURPOSE_LABEL[payment.purpose] ?? payment.purpose}
                    </dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Amount</dt>
                    <dd className="font-medium">{amount}</dd>
                </div>
                {payment.receiptNumber ? (
                    <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Receipt number</dt>
                        <dd className="font-mono">{payment.receiptNumber}</dd>
                    </div>
                ) : null}
                <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Reference</dt>
                    <dd className="break-all text-right font-mono text-xs">
                        {payment.internalReference}
                    </dd>
                </div>
                {payment.paidAt ? (
                    <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Paid on</dt>
                        <dd>
                            {new Intl.DateTimeFormat("en-GB", {
                                dateStyle: "medium",
                                timeStyle: "short",
                            }).format(payment.paidAt)}
                        </dd>
                    </div>
                ) : null}
            </dl>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
                {paid ? (
                    <>
                        <Link
                            href={next.href}
                            className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
                        >
                            {next.label} →
                        </Link>
                        <a
                            href={`/api/payments/${payment.id}/receipt`}
                            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold hover:border-slate-950"
                        >
                            Download receipt
                        </a>
                    </>
                ) : (
                    <>
                        <a
                            href={`/payment/status?reference=${encodeURIComponent(payment.internalReference)}`}
                            className="rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
                        >
                            Check again
                        </a>
                        <Link
                            href={next.href}
                            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold hover:border-slate-950"
                        >
                            Back
                        </Link>
                    </>
                )}
            </div>
        </main>
    );
}
