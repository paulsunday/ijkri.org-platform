import { randomUUID } from "crypto";

import { Prisma } from "@/lib/generated/prisma";

import { notifyStaffActionNeeded } from "@/lib/notifications/notify-staff";
import { sendChatNotification } from "@/lib/notifications/notify-webhook";
import { prisma } from "@/lib/prisma";

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");
}

export interface CompletePaymentInput {
    paymentId: string;

    providerReference: string;

    providerStatus: string;

    providerChannel?: string | null;

    providerFees?: Prisma.Decimal | number | string | null;

    paidAmount: Prisma.Decimal | number | string;

    paidAt?: Date;

    customerEmail?: string | null;

    providerResponse?: Prisma.InputJsonValue;
}

export interface CompletePaymentResult {
    success: boolean;

    paymentId: string;

    invoiceId?: string;

    receiptNumber?: string;

    alreadyProcessed: boolean;
}

function generateReceiptNumber() {
    const datePart = new Date()
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "");

    const uniquePart = randomUUID()
        .replaceAll("-", "")
        .slice(0, 10)
        .toUpperCase();

    return `RCT-${datePart}-${uniquePart}`;
}

function decimal(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return null;
    }

    return new Prisma.Decimal(value);
}

export async function completePayment(
    input: CompletePaymentInput,
): Promise<CompletePaymentResult> {
    const payment =
        await prisma.payment.findUnique({
            where: {
                id: input.paymentId,
            },

            include: {
                invoice: true,
                user: true,
                journal: true,
            },
        });

    if (!payment) {
        throw new Error(
            "Payment could not be found.",
        );
    }

    /*
     * Idempotency.
     *
     * A payment may be processed by:
     *
     * - callback
     * - webhook
     * - webhook retry
     *
     * Never process a successful payment twice.
     */
    if (payment.status === "PAID") {
        return {
            success: true,
            paymentId: payment.id,
            invoiceId:
                payment.invoice?.id,
            receiptNumber:
                payment.receiptNumber ??
                undefined,
            alreadyProcessed: true,
        };
    }

    if (
        payment.status ===
        "REFUNDED"
    ) {
        throw new Error(
            "This payment has already been refunded.",
        );
    }

    if (
        payment.status ===
        "CANCELLED"
    ) {
        throw new Error(
            "This payment has been cancelled.",
        );
    }

    const receiptNumber =
        payment.receiptNumber ??
        generateReceiptNumber();

    const paidAt =
        input.paidAt ??
        new Date();

    if (!input.providerReference.trim()) {
        throw new Error(
            "The payment provider reference is required.",
        );
    }

    if (!input.providerStatus.trim()) {
        throw new Error(
            "The payment provider status is required.",
        );
    }

    const paidAmount = new Prisma.Decimal(
        input.paidAmount,
    );

    const providerFees =
        input.providerFees === null ||
            input.providerFees === undefined
            ? null
            : new Prisma.Decimal(
                input.providerFees,
            );

    if (
        !paidAmount.isFinite() ||
        paidAmount.isNegative()
    ) {
        throw new Error(
            "The verified payment amount is invalid.",
        );
    }

    if (
        providerFees &&
        (!providerFees.isFinite() ||
            providerFees.isNegative())
    ) {
        throw new Error(
            "The payment provider fee is invalid.",
        );
    }

    /*
     * Never accept an underpayment.
     *
     * The Payment.amount field is the amount that was
     * expected when the transaction was initiated.
     */
    if (paidAmount.lessThan(payment.amount)) {
        throw new Error(
            `The amount paid (${payment.currency} ${paidAmount.toFixed(
                2,
            )}) is less than the required amount (${payment.currency} ${payment.amount.toFixed(
                2,
            )}).`,
        );
    }

    if (
        payment.providerReference &&
        payment.providerReference !==
        input.providerReference
    ) {
        throw new Error(
            "The provider reference does not match the reference stored for this payment.",
        );
    }

    if (payment.invoice) {
        if (
            payment.invoice.userId !==
            payment.userId
        ) {
            throw new Error(
                "The invoice owner does not match the payment owner.",
            );
        }

        if (
            payment.invoice.journalId !==
            payment.journalId
        ) {
            throw new Error(
                "The invoice journal does not match the payment journal.",
            );
        }

        if (
            payment.invoice.status ===
            "WAIVED"
        ) {
            throw new Error(
                "This invoice has already been waived and cannot be paid.",
            );
        }

        if (
            payment.invoice.status ===
            "VOID"
        ) {
            throw new Error(
                "This invoice has been voided and cannot be paid.",
            );
        }

        if (
            payment.invoice.status ===
            "PARTIALLY_WAIVED"
        ) {
            throw new Error(
                "This partially waived invoice requires administrative review before payment can be completed.",
            );
        }
    }

    const result =
        await prisma.$transaction(
            async (tx) => {
                /*
                 * Prevent one provider reference from being
                 * attached to two separate payments.
                 */
                const referenceOwner =
                    await tx.payment.findFirst({
                        where: {
                            providerReference:
                                input.providerReference,
                            id: {
                                not: payment.id,
                            },
                        },
                        select: {
                            id: true,
                        },
                    });

                if (referenceOwner) {
                    throw new Error(
                        "This provider reference has already been assigned to another payment.",
                    );
                }

                /*
                 * Atomic idempotency guard.
                 *
                 * Callback and webhook requests may arrive at
                 * almost the same time. Only one request is
                 * allowed to change the payment to PAID.
                 */
                const paymentUpdate =
                    await tx.payment.updateMany({
                        where: {
                            id: payment.id,
                            status: {
                                in: [
                                    "PENDING",
                                    "PROCESSING",
                                    "FAILED",
                                ],
                            },
                        },
                        data: {
                            status: "PAID",
                            providerReference:
                                input.providerReference,
                            providerStatus:
                                input.providerStatus,
                            providerChannel:
                                input.providerChannel ??
                                payment.providerChannel,
                            providerFees,
                            paidAmount,
                            customerEmail:
                                input.customerEmail ??
                                payment.customerEmail ??
                                payment.user.email,
                            verifiedAt: paidAt,
                            paidAt,
                            receiptNumber,
                            failureReason: null,
                            failedAt: null,
                            cancelledAt: null,

                            ...(input.providerResponse !==
                                undefined
                                ? {
                                    providerResponse:
                                        input.providerResponse,
                                }
                                : {}),
                        },
                    });

                /*
                 * Another callback or webhook completed the
                 * transaction while this request was running.
                 */
                if (
                    paymentUpdate.count === 0
                ) {
                    const currentPayment =
                        await tx.payment.findUnique({
                            where: {
                                id: payment.id,
                            },
                            select: {
                                id: true,
                                status: true,
                                invoiceId: true,
                                receiptNumber: true,
                            },
                        });

                    if (
                        currentPayment?.status ===
                        "PAID"
                    ) {
                        return {
                            success: true,
                            paymentId:
                                currentPayment.id,
                            invoiceId:
                                currentPayment.invoiceId ??
                                undefined,
                            receiptNumber:
                                currentPayment.receiptNumber ??
                                undefined,
                            alreadyProcessed: true,
                        } satisfies CompletePaymentResult;
                    }

                    throw new Error(
                        "The payment could not be completed because its status changed during processing.",
                    );
                }

                if (payment.invoiceId) {
                    const invoice =
                        await tx.invoice.findUnique({
                            where: {
                                id: payment.invoiceId,
                            },
                            select: {
                                id: true,
                                status: true,
                                invoiceNumber: true,
                            },
                        });

                    if (!invoice) {
                        throw new Error(
                            "The invoice linked to this payment could not be found.",
                        );
                    }

                    if (
                        invoice.status ===
                        "WAIVED" ||
                        invoice.status === "VOID" ||
                        invoice.status ===
                        "PARTIALLY_WAIVED"
                    ) {
                        throw new Error(
                            `Invoice ${invoice.invoiceNumber} cannot be marked as paid because its status is ${invoice.status
                                .replaceAll(
                                    "_",
                                    " ",
                                )
                                .toLowerCase()}.`,
                        );
                    }

                    if (
                        invoice.status !== "PAID"
                    ) {
                        const invoiceUpdate =
                            await tx.invoice.updateMany(
                                {
                                    where: {
                                        id: invoice.id,
                                        status: {
                                            in: [
                                                "PENDING",
                                                "OVERDUE",
                                            ],
                                        },
                                    },
                                    data: {
                                        status: "PAID",
                                        paidAt,
                                    },
                                },
                            );

                        if (
                            invoiceUpdate.count !== 1
                        ) {
                            const currentInvoice =
                                await tx.invoice.findUnique(
                                    {
                                        where: {
                                            id: invoice.id,
                                        },
                                        select: {
                                            status: true,
                                        },
                                    },
                                );

                            if (
                                currentInvoice?.status !==
                                "PAID"
                            ) {
                                throw new Error(
                                    "The invoice status changed before the payment could be completed.",
                                );
                            }
                        }
                    }
                }

                /*
                 * Activate a reader subscription when the
                 * payment purpose is SUBSCRIPTION.
                 */
                if (
                    payment.purpose ===
                    "SUBSCRIPTION" &&
                    payment.subscriptionId
                ) {
                    const subscription =
                        await tx.subscription.findUnique(
                            {
                                where: {
                                    id: payment.subscriptionId,
                                },
                                select: {
                                    id: true,
                                    status: true,
                                    durationMonths: true,
                                    startsAt: true,
                                    expiresAt: true,
                                },
                            },
                        );

                    if (!subscription) {
                        throw new Error(
                            "The subscription linked to this payment could not be found.",
                        );
                    }

                    const subscriptionStart =
                        subscription.startsAt &&
                            subscription.startsAt >
                            paidAt
                            ? subscription.startsAt
                            : paidAt;

                    const subscriptionExpiry =
                        new Date(
                            subscriptionStart,
                        );

                    subscriptionExpiry.setMonth(
                        subscriptionExpiry.getMonth() +
                        Math.max(
                            subscription.durationMonths,
                            1,
                        ),
                    );

                    await tx.subscription.update({
                        where: {
                            id: subscription.id,
                        },
                        data: {
                            status: "ACTIVE",
                            startsAt:
                                subscriptionStart,
                            expiresAt:
                                subscriptionExpiry,
                            cancelledAt: null,
                        },
                    });
                }

                /*
                 * Grant access to a purchased article.
                 */
                if (
                    payment.purpose ===
                    "ARTICLE_PURCHASE" &&
                    payment.articlePurchaseId
                ) {
                    const articlePurchase =
                        await tx.articlePurchase.findUnique(
                            {
                                where: {
                                    id: payment.articlePurchaseId,
                                },
                                select: {
                                    id: true,
                                },
                            },
                        );

                    if (!articlePurchase) {
                        throw new Error(
                            "The article purchase linked to this payment could not be found.",
                        );
                    }

                    await tx.articlePurchase.update({
                        where: {
                            id: articlePurchase.id,
                        },
                        data: {
                            accessGrantedAt:
                                paidAt,
                            accessRevokedAt: null,
                        },
                    });
                }

                const paymentDescription =
                    payment.invoice
                        ? `Invoice ${payment.invoice.invoiceNumber}`
                        : payment.purpose ===
                            "SUBSCRIPTION"
                            ? "your journal subscription"
                            : payment.purpose ===
                                "ARTICLE_PURCHASE"
                                ? "your article purchase"
                                : "your payment";

                await tx.notification.create({
                    data: {
                        userId: payment.userId,
                        type: "PAYMENT",
                        title:
                            "Payment Confirmed",
                        message:
                            `${paymentDescription} has been paid successfully. ` +
                            `Amount: ${payment.currency} ${paidAmount.toFixed(
                                2,
                            )}. Receipt: ${receiptNumber}.`,
                        link: payment.invoiceId
                            ? `/author/invoices/${payment.invoiceId}`
                            : "/author/payments",
                    },
                });

                await notifyStaffActionNeeded(tx, {
                    journalId: payment.journalId,
                    type: "PAYMENT",
                    title: "Payment received",
                    message: `${payment.user.name} paid ${payment.currency} ${paidAmount.toFixed(2)}${payment.invoice ? ` (Invoice ${payment.invoice.invoiceNumber})` : ""}.`,
                    link: payment.invoiceId
                        ? `/admin/invoices/${payment.invoiceId}`
                        : `/admin/payments/${payment.id}`,
                });

                await tx.activityLog.create({
                    data: {
                        userId: payment.userId,
                        action: "UPDATE",
                        entity: "Payment",
                        entityId: payment.id,
                        metadata: {
                            event:
                                "PAYMENT_COMPLETED",
                            paymentId:
                                payment.id,
                            invoiceId:
                                payment.invoiceId,
                            subscriptionId:
                                payment.subscriptionId,
                            articlePurchaseId:
                                payment.articlePurchaseId,
                            purpose:
                                payment.purpose,
                            provider:
                                payment.provider,
                            providerReference:
                                input.providerReference,
                            providerStatus:
                                input.providerStatus,
                            providerChannel:
                                input.providerChannel ??
                                null,
                            amount:
                                payment.amount.toFixed(
                                    2,
                                ),
                            paidAmount:
                                paidAmount.toFixed(
                                    2,
                                ),
                            providerFees:
                                providerFees?.toFixed(
                                    2,
                                ) ?? null,
                            currency:
                                payment.currency,
                            receiptNumber,
                            paidAt:
                                paidAt.toISOString(),
                        },
                    },
                });

                return {
                    success: true,
                    paymentId: payment.id,
                    invoiceId:
                        payment.invoiceId ??
                        undefined,
                    receiptNumber,
                    alreadyProcessed: false,
                } satisfies CompletePaymentResult;
            },
            {
                isolationLevel:
                    Prisma.TransactionIsolationLevel
                        .Serializable,
                maxWait: 5_000,
                timeout: 15_000,
            },
        );

    /*
     * Notify chat outside the transaction, and only on the request
     * that actually completed the payment (never on a retry/duplicate
     * webhook delivery that found it already PAID). In-app
     * notifications to the author and staff are created inside the
     * transaction above.
     */
    if (result.success && !result.alreadyProcessed) {
        const amountLabel = `${payment.currency} ${paidAmount.toFixed(2)}`;
        const invoiceLabel = payment.invoice
            ? ` (Invoice ${payment.invoice.invoiceNumber})`
            : "";

        await sendChatNotification({
            title: "Payment received",
            message: `${payment.user.name} paid ${amountLabel}${invoiceLabel}.`,
            link: payment.invoice
                ? `${getAppUrl()}/admin/invoices/${payment.invoice.id}`
                : `${getAppUrl()}/admin/payments/${payment.id}`,
        });
    }

    return result;
}