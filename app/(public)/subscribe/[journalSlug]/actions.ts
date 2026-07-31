"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { initializePaystackPayment } from "@/lib/payments/initialize-payment";
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

function generatePaymentReference(journalShortName: string) {
    const safeShortName = journalShortName.replace(
        /[^a-zA-Z0-9.-]/g,
        "-",
    );

    const uniquePart = randomUUID().replaceAll("-", "");

    return `SUB-${safeShortName}-${uniquePart}`;
}

export async function initializeSubscriptionPayment(
    formData: FormData,
) {
    const user = await getCurrentUser();

    const journalSlug = String(
        formData.get("journalSlug") ?? "",
    ).trim();

    if (!journalSlug) {
        throw new Error("Journal is required.");
    }

    if (!user) {
        redirect(
            `/login?callbackUrl=${encodeURIComponent(
                `/subscribe/${journalSlug}`,
            )}`,
        );
    }

    if (!user.isActive) {
        throw new Error(
            "Your account is inactive. Contact the journal administrator.",
        );
    }

    const journal = await prisma.journal.findUnique({
        where: {
            slug: journalSlug,
        },
        select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
            subscriptionAmount: true,
            currency: true,
        },
    });

    if (!journal) {
        throw new Error("Journal not found.");
    }

    if (!journal.isActive) {
        throw new Error(
            "This journal is not currently accepting subscriptions.",
        );
    }

    const amount = journal.subscriptionAmount.toNumber();

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
            "This journal has not configured a subscription price.",
        );
    }

    /*
     * Reuse a recently initialised Paystack checkout session
     * instead of creating several payment attempts when a
     * reader clicks the button repeatedly.
     */
    const recentPaymentThreshold = new Date(
        Date.now() - 30 * 60 * 1000,
    );

    const existingPayment = await prisma.payment.findFirst({
        where: {
            journalId: journal.id,
            userId: user.id,
            purpose: "SUBSCRIPTION",
            provider: "PAYSTACK",
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
     * Cancel older incomplete payment attempts before creating
     * a fresh Paystack checkout session.
     */
    await prisma.payment.updateMany({
        where: {
            journalId: journal.id,
            userId: user.id,
            purpose: "SUBSCRIPTION",
            provider: "PAYSTACK",
            status: {
                in: ["PENDING", "PROCESSING"],
            },
        },
        data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            providerStatus: "superseded",
            failureReason:
                "Replaced by a newer payment attempt.",
        },
    });

    const subscription = await prisma.subscription.create({
        data: {
            journalId: journal.id,
            userId: user.id,
            status: "PENDING",
            amount: journal.subscriptionAmount,
            currency: journal.currency,
            durationMonths: 1,
            planName: "Reader Subscription",
        },
    });

    const internalReference = generatePaymentReference(
        journal.shortName,
    );

    const payment = await prisma.payment.create({
        data: {
            journalId: journal.id,
            userId: user.id,
            subscriptionId: subscription.id,

            purpose: "SUBSCRIPTION",
            provider: "PAYSTACK",
            status: "PENDING",

            amount: journal.subscriptionAmount,
            currency: journal.currency,

            customerEmail: user.email,
            internalReference,
            initiatedAt: new Date(),
        },
    });

    let authorizationUrl: string;

    try {
        const applicationUrl = getApplicationUrl();

        const callbackUrl =
            `${applicationUrl}/api/paystack/callback`;

        const paystackResponse =
            await initializePaystackPayment({
                email: user.email,
                amount,
                currency: journal.currency,
                reference: internalReference,
                callbackUrl,
                subscriptionId: subscription.id,
                userId: user.id,
                purpose: "SUBSCRIPTION",
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

        const updatedPayment =
            await prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    status: "PROCESSING",
                    providerStatus: "initialized",
                    providerReference:
                        paystackResponse.data.reference,
                    authorizationUrl:
                        paystackResponse.data
                            .authorization_url,
                    providerResponse: paystackResponse,
                },
            });

        if (!updatedPayment.authorizationUrl) {
            throw new Error(
                "The Paystack checkout URL was not saved.",
            );
        }

        authorizationUrl =
            updatedPayment.authorizationUrl;
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
                providerStatus:
                    "initialization_failed",
                failureReason,
                failedAt: new Date(),
            },
        });

        throw new Error(
            `Unable to initialise payment: ${failureReason}`,
        );
    }

    redirect(authorizationUrl);
}
