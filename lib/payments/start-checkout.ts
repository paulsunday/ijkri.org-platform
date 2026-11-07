import "server-only";

import { randomUUID } from "crypto";

import type { Prisma } from "@/lib/generated/prisma";
import { logger } from "@/lib/logger";
import { autoReconcilePaystackPayments } from "@/lib/payments/auto-reconcile";
import {
    parseCheckoutCurrency,
    resolveCheckoutPrice,
    type CheckoutCurrency,
} from "@/lib/payments/checkout-currency";
import { initializePaystackPayment } from "@/lib/payments/initialize-payment";
import { prisma } from "@/lib/prisma";

/*
 * Shared Paystack checkout for one paid item (an article purchase or an
 * event registration). Returns the URL to send the payer to: Paystack,
 * or the item page with a message. Never throws for expected failures.
 */

type PaidItem =
    | { purpose: "ARTICLE_PURCHASE"; articlePurchaseId: string }
    | { purpose: "EVENT_REGISTRATION"; eventRegistrationId: string };

const REFERENCE_PREFIX: Record<PaidItem["purpose"], string> = {
    ARTICLE_PURCHASE: "ART",
    EVENT_REGISTRATION: "EVT",
};

function linkWhere(item: PaidItem): Prisma.PaymentWhereInput {
    return item.purpose === "ARTICLE_PURCHASE"
        ? { articlePurchaseId: item.articlePurchaseId }
        : { eventRegistrationId: item.eventRegistrationId };
}

function getApplicationUrl() {
    const url =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        process.env.NEXTAUTH_URL;

    if (!url) {
        throw new Error("Application URL is not configured.");
    }

    return url.replace(/\/$/, "");
}

export function withPaymentMessage(
    path: string,
    status: "error" | "success",
    message: string,
) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}payment=${status}&message=${encodeURIComponent(message)}`;
}

export async function startItemCheckout({
    user,
    journal,
    item,
    baseAmount,
    currencyValue,
    returnPath,
    isAlreadyPaid,
}: {
    user: { id: string; email: string };
    journal: {
        id: string;
        currency: CheckoutCurrency;
        ngnExchangeRate: Prisma.Decimal | null;
    };
    item: PaidItem;
    baseAmount: Prisma.Decimal;
    currencyValue: FormDataEntryValue | null;
    /** Item page, used for messages. */
    returnPath: string;
    /** Re-checks access after reconciling. */
    isAlreadyPaid: () => Promise<boolean>;
}): Promise<string> {
    if (!baseAmount.isFinite() || baseAmount.lessThanOrEqualTo(0)) {
        return withPaymentMessage(returnPath, "error", "This item doesn't have a price yet.");
    }

    // Already paid on an earlier checkout? Unlock instead of charging again.
    const { completed } = await autoReconcilePaystackPayments({
        where: { userId: user.id, ...linkWhere(item) },
        sinceDays: 30,
        limit: 5,
    });

    if (completed.length > 0 || (await isAlreadyPaid())) {
        return withPaymentMessage(returnPath, "success", "Your payment is confirmed.");
    }

    let price: ReturnType<typeof resolveCheckoutPrice>;

    try {
        price = resolveCheckoutPrice({
            baseAmount,
            baseCurrency: journal.currency,
            chosenCurrency: parseCheckoutCurrency(currencyValue),
            ngnExchangeRate: journal.ngnExchangeRate,
        });
    } catch (error) {
        return withPaymentMessage(
            returnPath,
            "error",
            error instanceof Error ? error.message : "Payment is unavailable.",
        );
    }

    // Reuse a checkout started in the last 30 minutes.
    const existing = await prisma.payment.findFirst({
        where: {
            ...linkWhere(item),
            userId: user.id,
            provider: "PAYSTACK",
            currency: price.currency,
            status: { in: ["PENDING", "PROCESSING"] },
            authorizationUrl: { not: null },
            initiatedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
        orderBy: { initiatedAt: "desc" },
    });

    if (existing?.authorizationUrl) {
        return existing.authorizationUrl;
    }

    await prisma.payment.updateMany({
        where: {
            ...linkWhere(item),
            userId: user.id,
            provider: "PAYSTACK",
            status: { in: ["PENDING", "PROCESSING"] },
        },
        data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            providerStatus: "superseded",
            failureReason: "Replaced by a newer payment attempt.",
        },
    });

    const internalReference = `${REFERENCE_PREFIX[item.purpose]}-${randomUUID().replaceAll("-", "")}`;

    const payment = await prisma.payment.create({
        data: {
            journalId: journal.id,
            userId: user.id,
            ...(item.purpose === "ARTICLE_PURCHASE"
                ? { articlePurchaseId: item.articlePurchaseId }
                : { eventRegistrationId: item.eventRegistrationId }),
            purpose: item.purpose,
            provider: "PAYSTACK",
            status: "PENDING",
            amount: price.amount,
            currency: price.currency,
            exchangeRate: price.exchangeRate,
            customerEmail: user.email,
            internalReference,
            initiatedAt: new Date(),
        },
    });

    try {
        const response = await initializePaystackPayment({
            email: user.email,
            amount: price.amount.toNumber(),
            currency: price.currency,
            reference: internalReference,
            callbackUrl: `${getApplicationUrl()}/api/paystack/callback`,
            userId: user.id,
            purpose: item.purpose,
            ...(item.purpose === "ARTICLE_PURCHASE"
                ? { articlePurchaseId: item.articlePurchaseId }
                : { eventRegistrationId: item.eventRegistrationId }),
        });

        if (!response.status || !response.data.authorization_url) {
            throw new Error(response.message || "Paystack did not return a checkout URL.");
        }

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: "PROCESSING",
                providerStatus: "initialized",
                providerReference: response.data.reference,
                authorizationUrl: response.data.authorization_url,
                providerResponse: response,
            },
        });

        return response.data.authorization_url;
    } catch (error) {
        const failureReason =
            error instanceof Error ? error.message : "Payment initialisation failed.";

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: "FAILED",
                providerStatus: "initialization_failed",
                failureReason,
                failedAt: new Date(),
            },
        });

        logger.error("Checkout could not start", error, {
            event: "CHECKOUT_INIT_FAILED",
            purpose: item.purpose,
            paymentId: payment.id,
        });

        return withPaymentMessage(
            returnPath,
            "error",
            "We couldn't start the payment. Please try again in a moment.",
        );
    }
}
