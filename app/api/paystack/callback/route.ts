import { NextRequest, NextResponse } from "next/server";

import { completePayment } from "@/lib/payments/complete-payment";
import { verifyPaystackPayment } from "@/lib/payments/verify-payment";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApplicationUrl(request: NextRequest) {
    const configuredUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        process.env.NEXTAUTH_URL;

    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, "");
    }

    return request.nextUrl.origin;
}

function buildInvoiceUrl({
    request,
    invoiceId,
    paymentStatus,
    message,
}: {
    request: NextRequest;
    invoiceId: string;
    paymentStatus:
    | "success"
    | "pending"
    | "failed"
    | "error";
    message?: string;
}) {
    const applicationUrl =
        getApplicationUrl(request);

    const url = new URL(
        `/author/invoices/${invoiceId}`,
        applicationUrl,
    );

    url.searchParams.set(
        "payment",
        paymentStatus,
    );

    if (message) {
        url.searchParams.set(
            "message",
            message,
        );
    }

    return url;
}

function serializeProviderResponse(
    value: unknown,
) {
    return JSON.parse(
        JSON.stringify(value),
    );
}

export async function GET(
    request: NextRequest,
) {
    /*
     * Paystack normally returns "reference".
     * "trxref" is retained as a fallback.
     */
    const reference =
        request.nextUrl.searchParams.get(
            "reference",
        ) ??
        request.nextUrl.searchParams.get(
            "trxref",
        );

    if (!reference?.trim()) {
        return NextResponse.json(
            {
                error:
                    "Payment reference is missing.",
            },
            {
                status: 400,
            },
        );
    }

    /*
     * The reference supplied by Paystack may match either
     * our internal transaction reference or the provider
     * reference stored after initialisation.
     */
    const payment =
        await prisma.payment.findFirst({
            where: {
                provider: "PAYSTACK",

                OR: [
                    {
                        internalReference:
                            reference,
                    },
                    {
                        providerReference:
                            reference,
                    },
                ],
            },

            include: {
                invoice: {
                    select: {
                        id: true,
                        userId: true,
                        journalId: true,
                        amount: true,
                        currency: true,
                        status: true,
                    },
                },

                user: {
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                    },
                },
            },
        });

    if (!payment || !payment.invoice) {
        return NextResponse.json(
            {
                error:
                    "No matching invoice payment was found.",
            },
            {
                status: 404,
            },
        );
    }

    /*
     * Fast idempotency response.
     *
     * completePayment() also performs an atomic idempotency
     * check, so simultaneous callback and webhook requests
     * remain safe.
     */
    if (
        payment.status === "PAID" &&
        payment.invoice.status === "PAID"
    ) {
        return NextResponse.redirect(
            buildInvoiceUrl({
                request,
                invoiceId:
                    payment.invoice.id,
                paymentStatus: "success",
                message:
                    "Payment was already verified.",
            }),
        );
    }

    if (!payment.user.isActive) {
        return NextResponse.redirect(
            buildInvoiceUrl({
                request,
                invoiceId:
                    payment.invoice.id,
                paymentStatus: "error",
                message:
                    "This account is inactive. Contact support for assistance.",
            }),
        );
    }

    try {
        const verification =
            await verifyPaystackPayment(
                reference,
            );

        if (
            !verification.status ||
            !verification.data
        ) {
            throw new Error(
                verification.message ||
                "Paystack could not verify the transaction.",
            );
        }

        const transaction =
            verification.data;

        const providerResponse =
            serializeProviderResponse(
                verification,
            );

        const verifiedReference =
            transaction.reference?.trim();

        if (!verifiedReference) {
            throw new Error(
                "Paystack did not return a valid transaction reference.",
            );
        }

        const referenceMatches =
            verifiedReference ===
            payment.internalReference ||
            verifiedReference ===
            payment.providerReference;

        if (!referenceMatches) {
            await prisma.payment.update({
                where: {
                    id: payment.id,
                },

                data: {
                    providerStatus:
                        transaction.status,
                    failureReason:
                        "The verified Paystack reference did not match the payment record.",
                    providerResponse,
                },
            });

            return NextResponse.redirect(
                buildInvoiceUrl({
                    request,
                    invoiceId:
                        payment.invoice.id,
                    paymentStatus: "error",
                    message:
                        "Payment reference validation failed.",
                }),
            );
        }

        const expectedAmountInMinorUnits =
            Math.round(
                payment.amount.toNumber() *
                100,
            );

        if (
            transaction.amount !==
            expectedAmountInMinorUnits
        ) {
            await prisma.payment.update({
                where: {
                    id: payment.id,
                },

                data: {
                    providerStatus:
                        transaction.status,
                    paidAmount:
                        transaction.amount /
                        100,
                    failureReason:
                        "The amount confirmed by Paystack did not match the expected payment amount.",
                    providerResponse,
                },
            });

            return NextResponse.redirect(
                buildInvoiceUrl({
                    request,
                    invoiceId:
                        payment.invoice.id,
                    paymentStatus: "error",
                    message:
                        "The verified payment amount did not match the invoice amount.",
                }),
            );
        }

        if (
            transaction.currency !==
            payment.currency
        ) {
            await prisma.payment.update({
                where: {
                    id: payment.id,
                },

                data: {
                    providerStatus:
                        transaction.status,
                    failureReason:
                        "The currency confirmed by Paystack did not match the payment currency.",
                    providerResponse,
                },
            });

            return NextResponse.redirect(
                buildInvoiceUrl({
                    request,
                    invoiceId:
                        payment.invoice.id,
                    paymentStatus: "error",
                    message:
                        "The verified payment currency did not match the invoice currency.",
                }),
            );
        }

        const verifiedCustomerEmail =
            transaction.customer?.email
                ?.trim()
                .toLowerCase();

        const expectedCustomerEmail =
            (
                payment.customerEmail ??
                payment.user.email
            )
                .trim()
                .toLowerCase();

        if (
            verifiedCustomerEmail &&
            verifiedCustomerEmail !==
            expectedCustomerEmail
        ) {
            await prisma.payment.update({
                where: {
                    id: payment.id,
                },

                data: {
                    providerStatus:
                        transaction.status,
                    failureReason:
                        "The customer email confirmed by Paystack did not match the payment owner.",
                    providerResponse,
                },
            });

            return NextResponse.redirect(
                buildInvoiceUrl({
                    request,
                    invoiceId:
                        payment.invoice.id,
                    paymentStatus: "error",
                    message:
                        "Payment customer validation failed.",
                }),
            );
        }

        /*
         * Only a transaction explicitly reported as
         * "success" may be passed to completePayment().
         */
        if (
            transaction.status !==
            "success"
        ) {
            const isFailed =
                transaction.status ===
                "failed";

            await prisma.payment.update({
                where: {
                    id: payment.id,
                },

                data: {
                    status: isFailed
                        ? "FAILED"
                        : "PROCESSING",

                    providerStatus:
                        transaction.status,

                    providerReference:
                        verifiedReference,

                    providerChannel:
                        transaction.channel,

                    providerFees:
                        transaction.fees !==
                            null &&
                            transaction.fees !==
                            undefined
                            ? transaction.fees /
                            100
                            : null,

                    paidAmount:
                        transaction.amount /
                        100,

                    providerResponse,

                    failureReason: isFailed
                        ? transaction.gateway_response ||
                        "Paystack reported that the payment failed."
                        : null,

                    failedAt: isFailed
                        ? new Date()
                        : null,
                },
            });

            return NextResponse.redirect(
                buildInvoiceUrl({
                    request,
                    invoiceId:
                        payment.invoice.id,
                    paymentStatus: isFailed
                        ? "failed"
                        : "pending",
                    message: isFailed
                        ? "Payment was not successful."
                        : "Payment is still being processed.",
                }),
            );
        }

        const paidAt =
            transaction.paid_at
                ? new Date(
                    transaction.paid_at,
                )
                : new Date();

        if (
            Number.isNaN(
                paidAt.getTime(),
            )
        ) {
            throw new Error(
                "Paystack returned an invalid payment date.",
            );
        }

        /*
         * This is now the only call responsible for:
         *
         * - marking the payment PAID
         * - marking the invoice PAID
         * - generating the receipt number
         * - creating the notification
         * - creating the activity log
         * - activating related access
         */
        await completePayment({
            paymentId: payment.id,

            providerReference:
                verifiedReference,

            providerStatus:
                transaction.status,

            providerChannel:
                transaction.channel ?? null,

            providerFees:
                transaction.fees !==
                    null &&
                    transaction.fees !==
                    undefined
                    ? transaction.fees /
                    100
                    : null,

            paidAmount:
                transaction.amount / 100,

            paidAt,

            customerEmail:
                transaction.customer
                    ?.email ??
                payment.customerEmail ??
                payment.user.email,

            providerResponse,
        });

        return NextResponse.redirect(
            buildInvoiceUrl({
                request,
                invoiceId:
                    payment.invoice.id,
                paymentStatus: "success",
                message:
                    "Your payment was verified successfully.",
            }),
        );
    } catch (error) {
        const failureReason =
            error instanceof Error
                ? error.message
                : "An unexpected payment verification error occurred.";

        console.error(
            "Paystack callback error:",
            {
                paymentId: payment.id,
                invoiceId:
                    payment.invoice.id,
                reference,
                error,
            },
        );

        /*
         * Do not overwrite a successful payment if a late
         * callback encounters an error after the webhook has
         * already completed the payment.
         */
        await prisma.payment.updateMany({
            where: {
                id: payment.id,
                status: {
                    not: "PAID",
                },
            },

            data: {
                providerStatus:
                    "verification_error",
                failureReason,
            },
        });

        return NextResponse.redirect(
            buildInvoiceUrl({
                request,
                invoiceId:
                    payment.invoice.id,
                paymentStatus: "error",
                message:
                    "We could not verify the payment. Please try again or contact support.",
            }),
        );
    }
}