import {
    createHash,
    createHmac,
    timingSafeEqual,
} from "crypto";

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { Prisma } from "@/lib/generated/prisma";
import { completePayment } from "@/lib/payments/complete-payment";
import { verifyPaystackPayment } from "@/lib/payments/verify-payment";
import { handleTransferWebhookEvent } from "@/lib/payments/handle-transfer-webhook";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaystackWebhookCustomer = {
    email?: string | null;
};

type PaystackWebhookData = {
    id?: number | string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    channel?: string | null;
    fees?: number | null;
    paid_at?: string | null;
    gateway_response?: string | null;
    customer?: PaystackWebhookCustomer | null;
    transfer_code?: string;
    reason?: string;
};

type PaystackWebhookEvent = {
    event?: string;
    data?: PaystackWebhookData;
};

function jsonResponse(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
    });
}

function getPaystackSecretKey() {
    const secretKey =
        process.env.PAYSTACK_SECRET_KEY?.trim();

    if (!secretKey) {
        throw new Error(
            "PAYSTACK_SECRET_KEY is not configured.",
        );
    }

    return secretKey;
}

function isValidPaystackSignature({
    rawBody,
    receivedSignature,
    secretKey,
}: {
    rawBody: string;
    receivedSignature: string;
    secretKey: string;
}) {
    const expectedSignature = createHmac(
        "sha512",
        secretKey,
    )
        .update(rawBody, "utf8")
        .digest("hex");

    const receivedBuffer = Buffer.from(
        receivedSignature,
        "utf8",
    );

    const expectedBuffer = Buffer.from(
        expectedSignature,
        "utf8",
    );

    if (
        receivedBuffer.length !==
        expectedBuffer.length
    ) {
        return false;
    }

    return timingSafeEqual(
        receivedBuffer,
        expectedBuffer,
    );
}

function createProviderEventId({
    eventType,
    providerReference,
    transactionId,
    rawBody,
}: {
    eventType: string;
    providerReference?: string;
    transactionId?: string;
    rawBody: string;
}) {
    /*
     * Paystack does not always supply a dedicated webhook
     * event ID. This deterministic hash makes repeated
     * deliveries of the same event idempotent.
     */
    return createHash("sha256")
        .update(
            [
                "PAYSTACK",
                eventType,
                providerReference ?? "",
                transactionId ?? "",
                rawBody,
            ].join(":"),
            "utf8",
        )
        .digest("hex");
}

function serializeJson(
    value: unknown,
): Prisma.InputJsonValue {
    return JSON.parse(
        JSON.stringify(value),
    ) as Prisma.InputJsonValue;
}

function parseWebhookEvent(
    rawBody: string,
): PaystackWebhookEvent {
    let parsed: unknown;

    try {
        parsed = JSON.parse(rawBody);
    } catch {
        throw new Error(
            "The webhook body is not valid JSON.",
        );
    }

    if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
    ) {
        throw new Error(
            "The webhook payload is invalid.",
        );
    }

    return parsed as PaystackWebhookEvent;
}

function parsePaidAt(
    value: string | null | undefined,
) {
    if (!value) {
        return new Date();
    }

    const paidAt = new Date(value);

    if (Number.isNaN(paidAt.getTime())) {
        throw new Error(
            "Paystack returned an invalid payment date.",
        );
    }

    return paidAt;
}

export async function POST(
    request: NextRequest,
) {
    const rawBody = await request.text();

    const receivedSignature =
        request.headers
            .get("x-paystack-signature")
            ?.trim() ?? "";

    let event: PaystackWebhookEvent;

    try {
        event = parseWebhookEvent(rawBody);
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Invalid webhook payload.";

        return jsonResponse(
            {
                received: false,
                error: message,
            },
            400,
        );
    }

    const eventType =
        event.event?.trim() ||
        "unknown";

    const providerReference =
        event.data?.reference?.trim();

    const transactionId =
        event.data?.id !== undefined
            ? String(event.data.id)
            : undefined;

    const providerEventId =
        createProviderEventId({
            eventType,
            providerReference,
            transactionId,
            rawBody,
        });

    const payload = serializeJson(event);

    let signatureValid = false;

    try {
        signatureValid =
            isValidPaystackSignature({
                rawBody,
                receivedSignature,
                secretKey:
                    getPaystackSecretKey(),
            });
    } catch (error) {
        console.error(
            "Paystack webhook configuration error:",
            error,
        );

        return jsonResponse(
            {
                received: false,
                error:
                    "Payment webhook configuration error.",
            },
            500,
        );
    }

    /*
     * Record every structurally valid webhook, including
     * invalid-signature attempts, for security auditing.
     */
    const existingLog =
        await prisma.paymentWebhookLog.findUnique(
            {
                where: {
                    providerEventId,
                },

                select: {
                    id: true,
                    paymentId: true,
                    processed: true,
                    signatureValid: true,
                    processingAttempts: true,
                },
            },
        );

    if (existingLog?.processed) {
        return jsonResponse({
            received: true,
            processed: true,
            duplicate: true,
        });
    }

    const webhookLog = existingLog
        ? await prisma.paymentWebhookLog.update(
            {
                where: {
                    id: existingLog.id,
                },

                data: {
                    signatureValid,
                    payload,
                    processingAttempts: {
                        increment: 1,
                    },
                    lastAttemptAt:
                        new Date(),
                    errorMessage: null,
                },

                select: {
                    id: true,
                    paymentId: true,
                    processed: true,
                },
            },
        )
        : await prisma.paymentWebhookLog.create(
            {
                data: {
                    provider:
                        "PAYSTACK",
                    providerEventId,
                    eventType,
                    signatureValid,
                    processed: false,
                    processingAttempts: 1,
                    payload,
                    lastAttemptAt:
                        new Date(),
                },

                select: {
                    id: true,
                    paymentId: true,
                    processed: true,
                },
            },
        );

    if (!signatureValid) {
        await prisma.paymentWebhookLog.update({
            where: {
                id: webhookLog.id,
            },

            data: {
                errorMessage:
                    "The Paystack webhook signature was invalid.",
            },
        });

        return jsonResponse(
            {
                received: false,
                error:
                    "Invalid webhook signature.",
            },
            401,
        );
    }

    /*
     * Ambassador withdrawal payouts. Handled on the same
     * idempotent PaymentWebhookLog row (via withdrawalRequestId
     * instead of paymentId) before falling through to the
     * charge.success handling below, which is otherwise
     * completely unmodified.
     */
    if (
        eventType === "transfer.success" ||
        eventType === "transfer.failed" ||
        eventType === "transfer.reversed"
    ) {
        try {
            await handleTransferWebhookEvent(event, webhookLog.id);
        } catch (error) {
            console.error("Paystack transfer webhook processing error:", error);

            await prisma.paymentWebhookLog.update({
                where: { id: webhookLog.id },
                data: {
                    errorMessage:
                        error instanceof Error
                            ? error.message
                            : "Transfer webhook processing failed.",
                },
            });

            return jsonResponse(
                { received: false, error: "Transfer webhook processing failed." },
                500,
            );
        }

        await prisma.paymentWebhookLog.update({
            where: { id: webhookLog.id },
            data: {
                processed: true,
                processedAt: new Date(),
                errorMessage: null,
            },
        });

        return jsonResponse({
            received: true,
            processed: true,
            eventType,
        });
    }

    /*
     * Events unrelated to successful charges are retained
     * in the log and acknowledged without modifying a
     * payment.
     */
    if (eventType !== "charge.success") {
        await prisma.paymentWebhookLog.update({
            where: {
                id: webhookLog.id,
            },

            data: {
                processed: true,
                processedAt: new Date(),
                errorMessage: null,
            },
        });

        return jsonResponse({
            received: true,
            processed: true,
            ignored: true,
            eventType,
        });
    }

    if (!providerReference) {
        await prisma.paymentWebhookLog.update({
            where: {
                id: webhookLog.id,
            },

            data: {
                errorMessage:
                    "The charge.success event did not contain a transaction reference.",
            },
        });

        return jsonResponse(
            {
                received: false,
                error:
                    "Transaction reference is missing.",
            },
            400,
        );
    }

    const payment =
        await prisma.payment.findFirst({
            where: {
                provider: "PAYSTACK",

                OR: [
                    {
                        internalReference:
                            providerReference,
                    },
                    {
                        providerReference,
                    },
                ],
            },

            select: {
                id: true,
                userId: true,
                invoiceId: true,
                status: true,
                amount: true,
                currency: true,
                internalReference: true,
                providerReference: true,
                customerEmail: true,

                user: {
                    select: {
                        email: true,
                    },
                },
            },
        });

    if (!payment) {
        await prisma.paymentWebhookLog.update({
            where: {
                id: webhookLog.id,
            },

            data: {
                errorMessage:
                    "No matching Paystack payment record was found.",
            },
        });

        /*
         * A non-2xx response tells Paystack that processing
         * failed and allows the webhook to be retried.
         */
        return jsonResponse(
            {
                received: false,
                error:
                    "Matching payment was not found.",
            },
            404,
        );
    }

    await prisma.paymentWebhookLog.update({
        where: {
            id: webhookLog.id,
        },

        data: {
            paymentId: payment.id,
        },
    });

    try {
        /*
         * Never trust the webhook payload alone. Verify the
         * transaction directly with Paystack before marking
         * any payment or invoice as paid.
         */
        const verification =
            await verifyPaystackPayment(
                providerReference,
            );

        if (
            !verification.status ||
            !verification.data
        ) {
            throw new Error(
                verification.message ||
                "Paystack could not verify the webhook transaction.",
            );
        }

        const transaction =
            verification.data;

        if (
            transaction.status !==
            "success"
        ) {
            throw new Error(
                `Paystack returned transaction status "${transaction.status}".`,
            );
        }

        const verifiedReference =
            transaction.reference?.trim();

        if (!verifiedReference) {
            throw new Error(
                "Paystack verification did not return a transaction reference.",
            );
        }

        const referenceMatches =
            verifiedReference ===
            payment.internalReference ||
            verifiedReference ===
            payment.providerReference;

        if (!referenceMatches) {
            throw new Error(
                "The verified transaction reference did not match the payment record.",
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
            throw new Error(
                "The verified transaction amount did not match the expected payment amount.",
            );
        }

        if (
            transaction.currency !==
            payment.currency
        ) {
            throw new Error(
                "The verified transaction currency did not match the payment currency.",
            );
        }

        const verifiedEmail =
            transaction.customer?.email
                ?.trim()
                .toLowerCase();

        const expectedEmail =
            (
                payment.customerEmail ??
                payment.user.email
            )
                .trim()
                .toLowerCase();

        if (
            verifiedEmail &&
            verifiedEmail !==
            expectedEmail
        ) {
            throw new Error(
                "The verified customer email did not match the payment owner.",
            );
        }

        const providerResponse =
            serializeJson(verification);

        const result =
            await completePayment({
                paymentId: payment.id,

                providerReference:
                    verifiedReference,

                providerStatus:
                    transaction.status,

                providerChannel:
                    transaction.channel ??
                    null,

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

                paidAt: parsePaidAt(
                    transaction.paid_at,
                ),

                customerEmail:
                    transaction.customer
                        ?.email ??
                    payment.customerEmail ??
                    payment.user.email,

                providerResponse,
            });

        await prisma.paymentWebhookLog.update({
            where: {
                id: webhookLog.id,
            },

            data: {
                paymentId: payment.id,
                processed: true,
                processedAt: new Date(),
                errorMessage: null,
            },
        });

        return jsonResponse({
            received: true,
            processed: true,
            paymentId:
                result.paymentId,
            alreadyProcessed:
                result.alreadyProcessed,
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "An unexpected webhook-processing error occurred.";

        console.error(
            "Paystack webhook processing error:",
            {
                webhookLogId:
                    webhookLog.id,
                paymentId:
                    payment.id,
                providerReference,
                error,
            },
        );

        await prisma.paymentWebhookLog.update({
            where: {
                id: webhookLog.id,
            },

            data: {
                processed: false,
                errorMessage,
                lastAttemptAt:
                    new Date(),
            },
        });

        /*
         * Returning 500 allows Paystack to retry later.
         * completePayment() is idempotent, so retries are
         * safe even if the callback has already succeeded.
         */
        return jsonResponse(
            {
                received: false,
                error:
                    "Webhook processing failed.",
            },
            500,
        );
    }
}