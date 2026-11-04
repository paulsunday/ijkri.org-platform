"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import {
    parseCheckoutCurrency,
    resolveCheckoutPrice,
} from "@/lib/payments/checkout-currency";
import { initializePaystackPayment } from "@/lib/payments/initialize-payment";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

function getApplicationUrl() {
    const applicationUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        process.env.NEXTAUTH_URL;

    if (!applicationUrl) {
        throw new Error(
            "Application URL is not configured. Add NEXT_PUBLIC_APP_URL to your environment variables.",
        );
    }

    return applicationUrl.replace(/\/$/, "");
}

/** Sends the student back to the toolkit page with a readable error. */
function redirectWithPaymentError(message: string): never {
    redirect(
        `/toolkit?payment=error&message=${encodeURIComponent(message)}`,
    );
}

function generatePaymentReference() {
    const uniquePart = randomUUID().replaceAll("-", "");

    return `TLK-${uniquePart}`;
}

export async function initializeToolkitAccess(formData: FormData) {
    const user = await requireCurrentUser();

    const journal = await prisma.journal.findFirst({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: "asc",
        },
        select: {
            id: true,
            isActive: true,
            toolkitPrice: true,
            currency: true,
            ngnExchangeRate: true,
        },
    });

    if (!journal) {
        throw new Error(
            "The Research Topic Formulation Workbench is not currently available.",
        );
    }

    const amount = journal.toolkitPrice.toNumber();

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
            "This journal has not configured a toolkit access price.",
        );
    }

    let price: ReturnType<typeof resolveCheckoutPrice>;

    try {
        price = resolveCheckoutPrice({
            baseAmount: journal.toolkitPrice,
            baseCurrency: journal.currency,
            chosenCurrency: parseCheckoutCurrency(formData.get("currency")),
            ngnExchangeRate: journal.ngnExchangeRate,
        });
    } catch (error) {
        redirectWithPaymentError(
            error instanceof Error ? error.message : "Payment is unavailable.",
        );
    }

    let toolkitAccess = await prisma.toolkitAccess.findUnique({
        where: {
            userId_journalId: {
                userId: user.id,
                journalId: journal.id,
            },
        },
    });

    if (toolkitAccess?.grantedAt && !toolkitAccess.revokedAt) {
        redirect("/toolkit");
    }

    if (!toolkitAccess) {
        toolkitAccess = await prisma.toolkitAccess.create({
            data: {
                journalId: journal.id,
                userId: user.id,
                amount: journal.toolkitPrice,
                currency: journal.currency,
            },
        });
    }

    /*
     * Reuse a recently initialised Paystack checkout session instead
     * of creating several payment attempts when a student clicks the
     * unlock button repeatedly.
     */
    const recentPaymentThreshold = new Date(Date.now() - 30 * 60 * 1000);

    const existingPayment = await prisma.payment.findFirst({
        where: {
            toolkitAccessId: toolkitAccess.id,
            userId: user.id,
            provider: "PAYSTACK",
            currency: price.currency,
            status: {
                in: ["PENDING", "PROCESSING"],
            },
            authorizationUrl: {
                not: null,
            },
            initiatedAt: {
                gte: recentPaymentThreshold,
            },
        },
        orderBy: {
            initiatedAt: "desc",
        },
    });

    if (existingPayment?.authorizationUrl) {
        redirect(existingPayment.authorizationUrl);
    }

    /*
     * Cancel older incomplete payment attempts before creating a
     * fresh Paystack checkout session.
     */
    await prisma.payment.updateMany({
        where: {
            toolkitAccessId: toolkitAccess.id,
            userId: user.id,
            provider: "PAYSTACK",
            status: {
                in: ["PENDING", "PROCESSING"],
            },
        },
        data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            providerStatus: "superseded",
            failureReason: "Replaced by a newer payment attempt.",
        },
    });

    const internalReference = generatePaymentReference();

    const payment = await prisma.payment.create({
        data: {
            journalId: journal.id,
            userId: user.id,
            toolkitAccessId: toolkitAccess.id,

            purpose: "RESEARCH_TOOLKIT",
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

    let authorizationUrl: string;

    try {
        const applicationUrl = getApplicationUrl();

        const callbackUrl = `${applicationUrl}/api/paystack/callback`;

        const paystackResponse = await initializePaystackPayment({
            email: user.email,
            amount: price.amount.toNumber(),
            currency: price.currency,
            reference: internalReference,
            callbackUrl,
            toolkitAccessId: toolkitAccess.id,
            userId: user.id,
            purpose: "RESEARCH_TOOLKIT",
        });

        if (
            !paystackResponse.status ||
            !paystackResponse.data.authorization_url
        ) {
            throw new Error(
                paystackResponse.message ||
                "Paystack did not return a checkout URL.",
            );
        }

        const updatedPayment = await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                status: "PROCESSING",
                providerStatus: "initialized",
                providerReference: paystackResponse.data.reference,
                authorizationUrl: paystackResponse.data.authorization_url,
                providerResponse: paystackResponse,
            },
        });

        if (!updatedPayment.authorizationUrl) {
            throw new Error("The Paystack checkout URL was not saved.");
        }

        authorizationUrl = updatedPayment.authorizationUrl;
    } catch (error) {
        const failureReason =
            error instanceof Error
                ? error.message
                : "An unknown payment initialization error occurred.";

        await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                status: "FAILED",
                providerStatus: "initialization_failed",
                failureReason,
                failedAt: new Date(),
            },
        });

        logger.error("Toolkit payment could not start", error, {
            event: "TOOLKIT_PAYMENT_INIT_FAILED",
            paymentId: payment.id,
        });

        redirectWithPaymentError(
            /currency/i.test(failureReason)
                ? "That currency isn't available for payment yet. Please pay in Naira."
                : "We couldn't start the payment. Please try again in a moment.",
        );
    }

    redirect(authorizationUrl);
}
