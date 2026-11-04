"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
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

function generatePaymentReference() {
    const uniquePart = randomUUID().replaceAll("-", "");

    return `TLK-${uniquePart}`;
}

export async function initializeToolkitAccess() {
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

            amount: journal.toolkitPrice,
            currency: journal.currency,

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
            amount,
            currency: journal.currency,
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

        throw new Error(
            `Unable to initialise payment: ${failureReason}`,
        );
    }

    redirect(authorizationUrl);
}
