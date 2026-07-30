"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
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

function generatePaymentReference(invoiceNumber: string) {
    const safeInvoiceNumber = invoiceNumber.replace(
        /[^a-zA-Z0-9.-]/g,
        "-",
    );

    const uniquePart = randomUUID().replaceAll("-", "");

    return `APC-${safeInvoiceNumber}-${uniquePart}`;
}

export async function initializeInvoicePayment(
    formData: FormData,
) {
    const user = await requireAnyRole(["AUTHOR"]);

    const invoiceId = String(
        formData.get("invoiceId") ?? "",
    ).trim();

    if (!invoiceId) {
        throw new Error("Invoice ID is required.");
    }

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: invoiceId,
            userId: user.id,
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    isActive: true,
                },
            },
            journal: {
                select: {
                    id: true,
                    name: true,
                },
            },
            submission: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    });

    if (!invoice) {
        throw new Error(
            "Invoice not found or you do not have permission to pay it.",
        );
    }

    if (!invoice.user.isActive) {
        throw new Error(
            "Your account is inactive. Contact the journal administrator.",
        );
    }

    if (invoice.status === "PAID") {
        redirect(`/author/invoices/${invoice.id}`);
    }

    if (
        invoice.status === "WAIVED" ||
        invoice.status === "VOID"
    ) {
        throw new Error(
            "This invoice is no longer payable.",
        );
    }

    if (invoice.status === "PARTIALLY_WAIVED") {
        throw new Error(
            "This invoice has been partially waived. Contact the journal administrator before making payment.",
        );
    }

    const amount = invoice.amount.toNumber();

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
            "The invoice amount is invalid.",
        );
    }

    /*
     * Reuse a recently initialised Paystack checkout session
     * instead of creating several payment attempts when an
     * author clicks the button repeatedly.
     */
    const recentPaymentThreshold = new Date(
        Date.now() - 30 * 60 * 1000,
    );

    const existingPayment = await prisma.payment.findFirst({
        where: {
            invoiceId: invoice.id,
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
     * Cancel older incomplete payment attempts before creating
     * a fresh Paystack checkout session.
     */
    await prisma.payment.updateMany({
        where: {
            invoiceId: invoice.id,
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
            failureReason:
                "Replaced by a newer payment attempt.",
        },
    });

    const internalReference = generatePaymentReference(
        invoice.invoiceNumber,
    );

    const payment = await prisma.payment.create({
        data: {
            journalId: invoice.journalId,
            userId: user.id,
            invoiceId: invoice.id,

            purpose: "APC",
            provider: "PAYSTACK",
            status: "PENDING",

            amount: invoice.amount,
            currency: invoice.currency,

            customerEmail: invoice.user.email,
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
                email: invoice.user.email,
                amount,
                currency: invoice.currency,
                reference: internalReference,
                callbackUrl,
                invoiceId: invoice.id,
                userId: user.id,
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
                    providerResponse:
                        paystackResponse,
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