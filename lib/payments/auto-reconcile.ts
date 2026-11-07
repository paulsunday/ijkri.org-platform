import "server-only";

import type { Prisma } from "@/lib/generated/prisma";
import { logger } from "@/lib/logger";
import { completePayment } from "@/lib/payments/complete-payment";
import {
    paystackAmountCovers,
    verifyPaystackPayment,
} from "@/lib/payments/verify-payment";
import { prisma } from "@/lib/prisma";

/*
 * Automatic reconciliation: asks Paystack about unfinished payments and
 * completes the ones Paystack says were paid. Covers missed webhooks,
 * callbacks that never ran (closed tab), and students who paid on an
 * older checkout. Safe to run repeatedly — completePayment() is
 * idempotent.
 */

const UNFINISHED_STATUSES = [
    "PENDING",
    "PROCESSING",
    "FAILED",
    "CANCELLED",
] as const;

export type AutoReconcileResult = {
    checked: number;
    completed: string[];
};

export async function autoReconcilePaystackPayments({
    where = {},
    sinceDays = 7,
    limit = 25,
}: {
    /** Extra filter, e.g. { userId } or { internalReference }. */
    where?: Prisma.PaymentWhereInput;
    sinceDays?: number;
    limit?: number;
} = {}): Promise<AutoReconcileResult> {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const candidates = await prisma.payment.findMany({
        where: {
            ...where,
            provider: "PAYSTACK",
            status: { in: [...UNFINISHED_STATUSES] },
            initiatedAt: { gte: since },
            // Only attempts that actually reached Paystack checkout.
            authorizationUrl: { not: null },
        },
        orderBy: { initiatedAt: "desc" },
        take: limit,
        select: {
            id: true,
            amount: true,
            currency: true,
            internalReference: true,
            providerReference: true,
            customerEmail: true,
            user: { select: { email: true } },
        },
    });

    const completed: string[] = [];

    for (const payment of candidates) {
        const reference = payment.providerReference ?? payment.internalReference;

        try {
            const verification = await verifyPaystackPayment(reference);
            const data = verification.data;

            if (
                !verification.status ||
                !data ||
                data.status !== "success" ||
                data.currency !== payment.currency ||
                !paystackAmountCovers(
                    data,
                    Math.round(payment.amount.toNumber() * 100),
                )
            ) {
                continue;
            }

            await completePayment({
                paymentId: payment.id,
                providerReference: data.reference,
                providerStatus: data.status,
                providerChannel: data.channel ?? null,
                providerFees: typeof data.fees === "number" ? data.fees / 100 : null,
                paidAmount: data.amount / 100,
                paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
                customerEmail:
                    data.customer?.email ?? payment.customerEmail ?? payment.user.email,
                providerResponse: JSON.parse(JSON.stringify(verification)),
            });

            completed.push(payment.id);

            logger.info("Payment auto-reconciled", {
                event: "PAYMENT_AUTO_RECONCILED",
                paymentId: payment.id,
            });
        } catch (error) {
            // Unknown reference, network error, etc. — try again next time.
            logger.warn("Auto-reconcile skipped a payment", {
                event: "PAYMENT_AUTO_RECONCILE_SKIPPED",
                paymentId: payment.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return { checked: candidates.length, completed };
}
