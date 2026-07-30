"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
    ActivityType,
    PaymentProvider,
    PaymentStatus,
    Prisma,
    RefundStatus,
} from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

const FINANCE_ROLES = new Set([
    "SUPER_ADMIN",
    "ADMIN",
    "PUBLISHER",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
]);

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export type PaymentActionState = {
    success: boolean;
    message: string;
    fieldErrors?: {
        amount?: string;
        reason?: string;
        paymentId?: string;
    };
};

type SessionRole = {
    role: string;
    journalId: string;
};

type PaystackRefundResponse = {
    status: boolean;
    message: string;
    data?: {
        id?: number;
        integration?: number;
        domain?: string;
        transaction?: number;
        dispute?: number | null;
        amount?: number;
        deducted_amount?: number;
        currency?: string;
        channel?: string | null;
        fully_deducted?: boolean;
        refunded_by?: string;
        refunded_at?: string | null;
        expected_at?: string | null;
        settlement?: number | null;
        customer_note?: string;
        merchant_note?: string;
        status?: string;
        created_at?: string;
        updated_at?: string;
    };
};

type PaystackTransactionResponse = {
    status: boolean;
    message: string;
    data?: {
        id: number;
        status: string;
        reference: string;
        amount: number;
        currency: string;
        channel?: string;
        fees?: number;
        paid_at?: string | null;
        created_at?: string;
        customer?: {
            email?: string;
        };
    };
};

function getPaystackSecretKey() {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
        throw new Error(
            "PAYSTACK_SECRET_KEY is not configured.",
        );
    }

    return secretKey;
}

function normaliseRoles(
    roles: unknown,
): SessionRole[] {
    if (!Array.isArray(roles)) {
        return [];
    }

    return roles.flatMap((role): SessionRole[] => {
        if (
            typeof role !== "object" ||
            role === null
        ) {
            return [];
        }

        const candidate = role as {
            role?: unknown;
            journalId?: unknown;
        };

        if (
            typeof candidate.role !== "string" ||
            typeof candidate.journalId !== "string"
        ) {
            return [];
        }

        return [
            {
                role: candidate.role,
                journalId: candidate.journalId,
            },
        ];
    });
}

async function requireFinanceUser() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const roles = normaliseRoles(
        session.user.roles,
    );

    const permitted = roles.some((role) =>
        FINANCE_ROLES.has(role.role),
    );

    if (!permitted) {
        redirect("/unauthorized");
    }

    return {
        userId: session.user.id,
        roles,
    };
}

function userCanManageJournal(
    roles: SessionRole[],
    journalId: string,
) {
    return roles.some(
        (role) =>
            FINANCE_ROLES.has(role.role) &&
            role.journalId === journalId,
    );
}

function parsePositiveAmount(
    value: FormDataEntryValue | null,
) {
    const rawValue = String(value ?? "").trim();

    if (!rawValue) {
        return {
            amount: null,
            error: "Enter the refund amount.",
        };
    }

    const amount = Number(rawValue);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return {
            amount: null,
            error:
                "The refund amount must be greater than zero.",
        };
    }

    const roundedAmount =
        Math.round(amount * 100) / 100;

    if (roundedAmount !== amount) {
        return {
            amount: null,
            error:
                "The refund amount cannot have more than two decimal places.",
        };
    }

    return {
        amount,
        error: null,
    };
}

function generateRefundReference() {
    const timestamp = Date.now().toString(36);
    const randomPart = randomUUID()
        .replaceAll("-", "")
        .slice(0, 10);

    return `REF-${timestamp}-${randomPart}`.toUpperCase();
}

function serialiseJson(
    value: unknown,
): Prisma.InputJsonValue {
    return JSON.parse(
        JSON.stringify(value),
    ) as Prisma.InputJsonValue;
}

async function createPaystackRefund(input: {
    transactionReference: string;
    amount: number;
    currency: string;
    reason: string;
    internalReference: string;
}) {
    const secretKey = getPaystackSecretKey();

    const response = await fetch(
        `${PAYSTACK_BASE_URL}/refund`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                transaction:
                    input.transactionReference,
                amount: Math.round(
                    input.amount * 100,
                ),
                currency: input.currency,
                customer_note: input.reason,
                merchant_note:
                    `${input.reason} | Internal refund reference: ${input.internalReference}`,
            }),
            cache: "no-store",
        },
    );

    let body: PaystackRefundResponse;

    try {
        body =
            (await response.json()) as PaystackRefundResponse;
    } catch {
        throw new Error(
            `Paystack returned an unreadable refund response with HTTP status ${response.status}.`,
        );
    }

    if (
        !response.ok ||
        !body.status ||
        !body.data
    ) {
        throw new Error(
            body.message ||
            `Paystack refund request failed with HTTP status ${response.status}.`,
        );
    }

    return body;
}

async function verifyPaystackTransaction(
    reference: string,
) {
    const secretKey = getPaystackSecretKey();

    const response = await fetch(
        `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(
            reference,
        )}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        },
    );

    let body: PaystackTransactionResponse;

    try {
        body =
            (await response.json()) as PaystackTransactionResponse;
    } catch {
        throw new Error(
            `Paystack returned an unreadable verification response with HTTP status ${response.status}.`,
        );
    }

    if (
        !response.ok ||
        !body.status ||
        !body.data
    ) {
        throw new Error(
            body.message ||
            `Paystack verification failed with HTTP status ${response.status}.`,
        );
    }

    return body;
}

export async function createRefundAction(
    _previousState: PaymentActionState,
    formData: FormData,
): Promise<PaymentActionState> {
    const financeUser =
        await requireFinanceUser();

    const paymentId = String(
        formData.get("paymentId") ?? "",
    ).trim();

    const reason = String(
        formData.get("reason") ?? "",
    ).trim();

    const amountResult =
        parsePositiveAmount(
            formData.get("amount"),
        );

    const fieldErrors: NonNullable<
        PaymentActionState["fieldErrors"]
    > = {};

    if (!paymentId) {
        fieldErrors.paymentId =
            "Payment ID is missing.";
    }

    if (amountResult.error) {
        fieldErrors.amount =
            amountResult.error;
    }

    if (reason.length < 10) {
        fieldErrors.reason =
            "Enter a clear refund reason of at least 10 characters.";
    }

    if (reason.length > 500) {
        fieldErrors.reason =
            "The refund reason cannot exceed 500 characters.";
    }

    if (Object.keys(fieldErrors).length > 0) {
        return {
            success: false,
            message:
                "Correct the highlighted refund details.",
            fieldErrors,
        };
    }

    const refundAmount =
        amountResult.amount as number;

    const payment =
        await prisma.payment.findUnique({
            where: {
                id: paymentId,
            },
            include: {
                refunds: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                    },
                },
            },
        });

    if (!payment) {
        return {
            success: false,
            message:
                "The selected payment could not be found.",
        };
    }

    if (
        !userCanManageJournal(
            financeUser.roles,
            payment.journalId,
        )
    ) {
        return {
            success: false,
            message:
                "You do not have permission to manage payments for this journal.",
        };
    }

    if (
        payment.provider !==
        PaymentProvider.PAYSTACK
    ) {
        return {
            success: false,
            message:
                "This action currently supports Paystack payments only.",
        };
    }

    if (
        payment.status !== PaymentStatus.PAID &&
        payment.status !==
        PaymentStatus.PARTIALLY_REFUNDED
    ) {
        return {
            success: false,
            message:
                "Only paid or partially refunded payments can be refunded.",
        };
    }

    const transactionReference =
        payment.providerReference ??
        payment.internalReference;

    if (!transactionReference) {
        return {
            success: false,
            message:
                "The payment does not have a transaction reference.",
        };
    }

    const paidAmount =
        payment.paidAmount?.toNumber() ??
        payment.amount.toNumber();

    const existingRefundTotal =
        payment.refunds
            .filter(
                (refund) =>
                    refund.status ===
                    RefundStatus.PROCESSING ||
                    refund.status ===
                    RefundStatus.SUCCESSFUL,
            )
            .reduce(
                (total, refund) =>
                    total +
                    refund.amount.toNumber(),
                0,
            );

    const refundableBalance =
        Math.round(
            (paidAmount -
                existingRefundTotal) *
            100,
        ) / 100;

    if (refundableBalance <= 0) {
        return {
            success: false,
            message:
                "This payment has no refundable balance remaining.",
        };
    }

    if (refundAmount > refundableBalance) {
        return {
            success: false,
            message:
                `The maximum refundable amount is ${payment.currency} ${refundableBalance.toFixed(
                    2,
                )}.`,
            fieldErrors: {
                amount:
                    "The requested amount exceeds the refundable balance.",
            },
        };
    }

    const internalReference =
        generateRefundReference();

    const refund =
        await prisma.refund.create({
            data: {
                paymentId: payment.id,
                processedById:
                    financeUser.userId,
                amount: new Prisma.Decimal(
                    refundAmount,
                ),
                currency: payment.currency,
                status: RefundStatus.PENDING,
                internalReference,
                reason,
            },
        });

    try {
        await prisma.refund.update({
            where: {
                id: refund.id,
            },
            data: {
                status:
                    RefundStatus.PROCESSING,
            },
        });

        const providerResponse =
            await createPaystackRefund({
                transactionReference,
                amount: refundAmount,
                currency: payment.currency,
                reason,
                internalReference,
            });

        const providerRefund =
            providerResponse.data;

        const providerReference =
            providerRefund?.id
                ? String(providerRefund.id)
                : null;

        const providerStatus =
            providerRefund?.status
                ?.trim()
                .toLowerCase();

        const providerCompleted =
            providerStatus === "processed" ||
            providerStatus === "completed" ||
            providerStatus === "success";

        const newRefundedAmount =
            Math.round(
                (existingRefundTotal +
                    refundAmount) *
                100,
            ) / 100;

        const fullyRefunded =
            newRefundedAmount >= paidAmount;

        await prisma.$transaction(
            async (transaction) => {
                await transaction.refund.update({
                    where: {
                        id: refund.id,
                    },
                    data: {
                        providerReference,
                        providerResponse:
                            serialiseJson(
                                providerResponse,
                            ),
                        status: providerCompleted
                            ? RefundStatus.SUCCESSFUL
                            : RefundStatus.PROCESSING,
                        processedAt:
                            providerCompleted
                                ? new Date()
                                : null,
                    },
                });

                await transaction.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: fullyRefunded
                            ? PaymentStatus.REFUNDED
                            : PaymentStatus.PARTIALLY_REFUNDED,
                        refundedAmount:
                            new Prisma.Decimal(
                                newRefundedAmount,
                            ),
                        refundedAt: fullyRefunded
                            ? new Date()
                            : payment.refundedAt,
                    },
                });

                await transaction.activityLog.create({
                    data: {
                        userId:
                            financeUser.userId,
                        action:
                            ActivityType.CREATE,
                        entity: "Refund",
                        entityId: refund.id,
                        metadata: serialiseJson({
                            paymentId: payment.id,
                            refundId: refund.id,
                            internalReference,
                            providerReference,
                            amount: refundAmount,
                            currency:
                                payment.currency,
                            reason,
                            providerStatus:
                                providerRefund?.status ??
                                null,
                        }),
                    },
                });

                await transaction.notification.create({
                    data: {
                        userId: payment.userId,
                        type: "PAYMENT",
                        title:
                            providerCompleted
                                ? "Payment refund processed"
                                : "Payment refund initiated",
                        message:
                            providerCompleted
                                ? `A refund of ${payment.currency} ${refundAmount.toFixed(
                                    2,
                                )} has been processed for payment ${payment.internalReference}.`
                                : `A refund of ${payment.currency} ${refundAmount.toFixed(
                                    2,
                                )} has been initiated for payment ${payment.internalReference}.`,
                        link: `/payments/${payment.id}`,
                    },
                });
            },
        );

        revalidatePath(
            `/admin/payments/${payment.id}`,
        );
        revalidatePath("/admin/payments");

        return {
            success: true,
            message: providerCompleted
                ? "The refund was processed successfully."
                : "The refund was accepted by Paystack and is being processed.",
        };
    } catch (error) {
        const failureReason =
            error instanceof Error
                ? error.message
                : "An unknown refund error occurred.";

        await prisma.$transaction([
            prisma.refund.update({
                where: {
                    id: refund.id,
                },
                data: {
                    status: RefundStatus.FAILED,
                    failureReason,
                    failedAt: new Date(),
                },
            }),

            prisma.activityLog.create({
                data: {
                    userId: financeUser.userId,
                    action: ActivityType.UPDATE,
                    entity: "Refund",
                    entityId: refund.id,
                    metadata: serialiseJson({
                        paymentId: payment.id,
                        internalReference,
                        amount: refundAmount,
                        currency: payment.currency,
                        result: "FAILED",
                        failureReason,
                    }),
                },
            }),
        ]);

        revalidatePath(
            `/admin/payments/${payment.id}`,
        );

        return {
            success: false,
            message:
                `The refund could not be completed: ${failureReason}`,
        };
    }
}
export async function reconcilePaymentAction(
    formData: FormData,
): Promise<void> {
    const financeUser =
        await requireFinanceUser();

    const paymentId = String(
        formData.get("paymentId") ?? "",
    ).trim();

    if (!paymentId) {
        throw new Error(
            "Payment ID is missing.",
        );
    }

    const payment =
        await prisma.payment.findUnique({
            where: {
                id: paymentId,
            },
            include: {
                invoice: true,
                subscription: true,
                articlePurchase: true,
            },
        });

    if (!payment) {
        throw new Error(
            "Payment could not be found.",
        );
    }

    if (
        !userCanManageJournal(
            financeUser.roles,
            payment.journalId,
        )
    ) {
        throw new Error(
            "You do not have permission to reconcile this payment.",
        );
    }

    if (
        payment.provider !==
        PaymentProvider.PAYSTACK
    ) {
        throw new Error(
            "Only Paystack payments can currently be reconciled.",
        );
    }

    const transactionReference =
        payment.providerReference ??
        payment.internalReference;

    if (!transactionReference) {
        throw new Error(
            "The payment has no provider or internal transaction reference.",
        );
    }

    const providerResponse =
        await verifyPaystackTransaction(
            transactionReference,
        );

    const providerData =
        providerResponse.data;

    if (!providerData) {
        throw new Error(
            "Paystack returned no transaction data.",
        );
    }

    if (
        providerData.reference !==
        transactionReference &&
        providerData.reference !==
        payment.providerReference &&
        providerData.reference !==
        payment.internalReference
    ) {
        throw new Error(
            "The Paystack transaction reference does not match this payment.",
        );
    }

    const expectedAmountInKobo =
        Math.round(
            payment.amount.toNumber() * 100,
        );

    if (
        providerData.amount !==
        expectedAmountInKobo
    ) {
        throw new Error(
            "The amount returned by Paystack does not match the payment amount.",
        );
    }

    if (
        providerData.currency !==
        payment.currency
    ) {
        throw new Error(
            "The currency returned by Paystack does not match the payment currency.",
        );
    }

    const normalizedStatus =
        providerData.status
            .trim()
            .toLowerCase();

    const now = new Date();

    if (normalizedStatus === "success") {
        const paidAmount =
            providerData.amount / 100;

        const providerFees =
            typeof providerData.fees ===
                "number"
                ? providerData.fees / 100
                : null;

        const paidAt =
            providerData.paid_at
                ? new Date(
                    providerData.paid_at,
                )
                : now;

        await prisma.$transaction(
            async (transaction) => {
                await transaction.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status:
                            PaymentStatus.PAID,
                        providerReference:
                            providerData.reference,
                        providerStatus:
                            providerData.status,
                        providerChannel:
                            providerData.channel ??
                            payment.providerChannel,
                        providerFees:
                            providerFees === null
                                ? payment.providerFees
                                : new Prisma.Decimal(
                                    providerFees,
                                ),
                        paidAmount:
                            new Prisma.Decimal(
                                paidAmount,
                            ),
                        customerEmail:
                            providerData.customer
                                ?.email ??
                            payment.customerEmail,
                        providerResponse:
                            serialiseJson(
                                providerResponse,
                            ),
                        verifiedAt: now,
                        paidAt,
                        failedAt: null,
                        cancelledAt: null,
                        failureReason: null,
                    },
                });

                if (payment.invoiceId) {
                    await transaction.invoice.update({
                        where: {
                            id: payment.invoiceId,
                        },
                        data: {
                            status: "PAID",
                            paidAt,
                            voidedAt: null,
                        },
                    });
                }

                if (
                    payment.subscriptionId &&
                    payment.subscription
                ) {
                    const startsAt =
                        payment.subscription
                            .startsAt ?? paidAt;

                    const expiresAt =
                        payment.subscription
                            .expiresAt ??
                        new Date(
                            new Date(
                                startsAt,
                            ).setMonth(
                                startsAt.getMonth() +
                                payment.subscription
                                    .durationMonths,
                            ),
                        );

                    await transaction.subscription.update(
                        {
                            where: {
                                id: payment.subscriptionId,
                            },
                            data: {
                                status: "ACTIVE",
                                startsAt,
                                expiresAt,
                                cancelledAt: null,
                            },
                        },
                    );
                }

                if (payment.articlePurchaseId) {
                    await transaction.articlePurchase.update(
                        {
                            where: {
                                id: payment.articlePurchaseId,
                            },
                            data: {
                                accessGrantedAt: paidAt,
                                accessRevokedAt: null,
                            },
                        },
                    );
                }

                await transaction.activityLog.create({
                    data: {
                        userId:
                            financeUser.userId,
                        action:
                            ActivityType.UPDATE,
                        entity: "Payment",
                        entityId: payment.id,
                        metadata: serialiseJson({
                            event:
                                "PAYMENT_RECONCILED",
                            paymentId: payment.id,
                            internalReference:
                                payment.internalReference,
                            providerReference:
                                providerData.reference,
                            previousStatus:
                                payment.status,
                            newStatus:
                                PaymentStatus.PAID,
                            providerStatus:
                                providerData.status,
                            amount: paidAmount,
                            currency:
                                payment.currency,
                        }),
                    },
                });

                if (
                    payment.status !==
                    PaymentStatus.PAID
                ) {
                    await transaction.notification.create(
                        {
                            data: {
                                userId:
                                    payment.userId,
                                type: "PAYMENT",
                                title:
                                    "Payment confirmed",
                                message:
                                    `Your payment of ${payment.currency} ${paidAmount.toFixed(
                                        2,
                                    )} has been verified successfully.`,
                                link: `/payments/${payment.id}`,
                            },
                        },
                    );
                }
            },
        );
    } else if (
        normalizedStatus === "failed" ||
        normalizedStatus ===
        "abandoned" ||
        normalizedStatus ===
        "reversed"
    ) {
        await prisma.$transaction([
            prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    status:
                        PaymentStatus.FAILED,
                    providerReference:
                        providerData.reference,
                    providerStatus:
                        providerData.status,
                    providerChannel:
                        providerData.channel ??
                        payment.providerChannel,
                    providerResponse:
                        serialiseJson(
                            providerResponse,
                        ),
                    verifiedAt: now,
                    failedAt: now,
                    failureReason:
                        providerResponse.message ||
                        `Paystack transaction status: ${providerData.status}`,
                },
            }),

            prisma.activityLog.create({
                data: {
                    userId:
                        financeUser.userId,
                    action:
                        ActivityType.UPDATE,
                    entity: "Payment",
                    entityId: payment.id,
                    metadata: serialiseJson({
                        event:
                            "PAYMENT_RECONCILED",
                        paymentId: payment.id,
                        internalReference:
                            payment.internalReference,
                        providerReference:
                            providerData.reference,
                        previousStatus:
                            payment.status,
                        newStatus:
                            PaymentStatus.FAILED,
                        providerStatus:
                            providerData.status,
                    }),
                },
            }),
        ]);
    } else {
        await prisma.$transaction([
            prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    status:
                        PaymentStatus.PROCESSING,
                    providerReference:
                        providerData.reference,
                    providerStatus:
                        providerData.status,
                    providerChannel:
                        providerData.channel ??
                        payment.providerChannel,
                    providerResponse:
                        serialiseJson(
                            providerResponse,
                        ),
                    verifiedAt: now,
                },
            }),

            prisma.activityLog.create({
                data: {
                    userId:
                        financeUser.userId,
                    action:
                        ActivityType.UPDATE,
                    entity: "Payment",
                    entityId: payment.id,
                    metadata: serialiseJson({
                        event:
                            "PAYMENT_RECONCILED",
                        paymentId: payment.id,
                        internalReference:
                            payment.internalReference,
                        providerReference:
                            providerData.reference,
                        previousStatus:
                            payment.status,
                        newStatus:
                            PaymentStatus.PROCESSING,
                        providerStatus:
                            providerData.status,
                    }),
                },
            }),
        ]);
    }

    revalidatePath(
        `/admin/payments/${payment.id}`,
    );
    revalidatePath("/admin/payments");
}

export async function cancelPaymentAction(
    formData: FormData,
): Promise<void> {
    const financeUser =
        await requireFinanceUser();

    const paymentId = String(
        formData.get("paymentId") ?? "",
    ).trim();

    const reason = String(
        formData.get("reason") ?? "",
    ).trim();

    if (!paymentId) {
        throw new Error(
            "Payment ID is missing.",
        );
    }

    if (reason.length < 10) {
        throw new Error(
            "Enter a cancellation reason of at least 10 characters.",
        );
    }

    if (reason.length > 500) {
        throw new Error(
            "The cancellation reason cannot exceed 500 characters.",
        );
    }

    const payment =
        await prisma.payment.findUnique({
            where: {
                id: paymentId,
            },
        });

    if (!payment) {
        throw new Error(
            "Payment could not be found.",
        );
    }

    if (
        !userCanManageJournal(
            financeUser.roles,
            payment.journalId,
        )
    ) {
        throw new Error(
            "You do not have permission to cancel this payment.",
        );
    }

    if (
        payment.status !==
        PaymentStatus.PENDING &&
        payment.status !==
        PaymentStatus.PROCESSING
    ) {
        throw new Error(
            "Only pending or processing payments can be cancelled.",
        );
    }

    const cancelledAt = new Date();

    await prisma.$transaction([
        prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                status:
                    PaymentStatus.CANCELLED,
                cancelledAt,
                failureReason: reason,
            },
        }),

        prisma.activityLog.create({
            data: {
                userId:
                    financeUser.userId,
                action:
                    ActivityType.UPDATE,
                entity: "Payment",
                entityId: payment.id,
                metadata: serialiseJson({
                    event:
                        "PAYMENT_CANCELLED",
                    paymentId: payment.id,
                    internalReference:
                        payment.internalReference,
                    previousStatus:
                        payment.status,
                    newStatus:
                        PaymentStatus.CANCELLED,
                    reason,
                }),
            },
        }),

        prisma.notification.create({
            data: {
                userId: payment.userId,
                type: "PAYMENT",
                title:
                    "Payment cancelled",
                message:
                    `Payment ${payment.internalReference} was cancelled. Reason: ${reason}`,
                link: `/payments/${payment.id}`,
            },
        }),
    ]);

    revalidatePath(
        `/admin/payments/${payment.id}`,
    );
    revalidatePath("/admin/payments");
}

export async function reconcileRefundAction(
    formData: FormData,
): Promise<void> {
    const financeUser =
        await requireFinanceUser();

    const refundId = String(
        formData.get("refundId") ?? "",
    ).trim();

    if (!refundId) {
        throw new Error(
            "Refund ID is missing.",
        );
    }

    const refund =
        await prisma.refund.findUnique({
            where: {
                id: refundId,
            },
            include: {
                payment: {
                    include: {
                        refunds: {
                            select: {
                                id: true,
                                amount: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

    if (!refund) {
        throw new Error(
            "Refund could not be found.",
        );
    }

    if (
        !userCanManageJournal(
            financeUser.roles,
            refund.payment.journalId,
        )
    ) {
        throw new Error(
            "You do not have permission to reconcile this refund.",
        );
    }

    if (
        refund.status ===
        RefundStatus.SUCCESSFUL
    ) {
        revalidatePath(
            `/admin/payments/${refund.paymentId}`,
        );

        return;
    }

    const payment =
        refund.payment;

    const transactionReference =
        payment.providerReference ??
        payment.internalReference;

    if (!transactionReference) {
        throw new Error(
            "The original payment has no transaction reference.",
        );
    }

    /*
     * Paystack does not provide a direct single-refund verification
     * endpoint equivalent to transaction verification. We verify the
     * original transaction and preserve the refund as PROCESSING unless
     * a successful refund webhook or provider response has confirmed it.
     */
    const transactionResponse =
        await verifyPaystackTransaction(
            transactionReference,
        );

    const originalTransactionStatus =
        transactionResponse.data?.status
            ?.trim()
            .toLowerCase();

    if (
        originalTransactionStatus !==
        "success"
    ) {
        throw new Error(
            "The original Paystack transaction is not marked as successful.",
        );
    }

    await prisma.$transaction([
        prisma.refund.update({
            where: {
                id: refund.id,
            },
            data: {
                status:
                    RefundStatus.PROCESSING,
                failureReason: null,
                failedAt: null,
            },
        }),

        prisma.activityLog.create({
            data: {
                userId:
                    financeUser.userId,
                action:
                    ActivityType.UPDATE,
                entity: "Refund",
                entityId: refund.id,
                metadata: serialiseJson({
                    event:
                        "REFUND_RECONCILIATION_REQUESTED",
                    refundId: refund.id,
                    paymentId:
                        refund.paymentId,
                    internalReference:
                        refund.internalReference,
                    providerReference:
                        refund.providerReference,
                    originalPaymentStatus:
                        transactionResponse.data
                            ?.status,
                }),
            },
        }),
    ]);

    revalidatePath(
        `/admin/payments/${refund.paymentId}`,
    );
    revalidatePath("/admin/payments");
}

export async function markRefundSuccessfulAction(
    formData: FormData,
): Promise<void> {
    const financeUser =
        await requireFinanceUser();

    const refundId = String(
        formData.get("refundId") ?? "",
    ).trim();

    if (!refundId) {
        throw new Error(
            "Refund ID is missing.",
        );
    }

    const refund =
        await prisma.refund.findUnique({
            where: {
                id: refundId,
            },
            include: {
                payment: {
                    include: {
                        refunds: {
                            select: {
                                id: true,
                                amount: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

    if (!refund) {
        throw new Error(
            "Refund could not be found.",
        );
    }

    if (
        !userCanManageJournal(
            financeUser.roles,
            refund.payment.journalId,
        )
    ) {
        throw new Error(
            "You do not have permission to update this refund.",
        );
    }

    if (
        refund.status !==
        RefundStatus.PROCESSING &&
        refund.status !==
        RefundStatus.PENDING
    ) {
        throw new Error(
            "Only pending or processing refunds can be marked successful.",
        );
    }

    if (
        !refund.providerReference &&
        !refund.providerResponse
    ) {
        throw new Error(
            "This refund has no provider confirmation and cannot be manually marked successful.",
        );
    }

    const successfulRefundTotal =
        refund.payment.refunds
            .filter(
                (item) =>
                    item.id === refund.id ||
                    item.status ===
                    RefundStatus.SUCCESSFUL,
            )
            .reduce(
                (total, item) =>
                    total +
                    item.amount.toNumber(),
                0,
            );

    const paidAmount =
        refund.payment.paidAmount?.toNumber() ??
        refund.payment.amount.toNumber();

    const fullyRefunded =
        successfulRefundTotal >=
        paidAmount;

    const processedAt = new Date();

    await prisma.$transaction([
        prisma.refund.update({
            where: {
                id: refund.id,
            },
            data: {
                status:
                    RefundStatus.SUCCESSFUL,
                processedAt,
                failedAt: null,
                failureReason: null,
            },
        }),

        prisma.payment.update({
            where: {
                id: refund.paymentId,
            },
            data: {
                status: fullyRefunded
                    ? PaymentStatus.REFUNDED
                    : PaymentStatus.PARTIALLY_REFUNDED,
                refundedAmount:
                    new Prisma.Decimal(
                        successfulRefundTotal,
                    ),
                refundedAt: fullyRefunded
                    ? processedAt
                    : refund.payment
                        .refundedAt,
            },
        }),

        prisma.activityLog.create({
            data: {
                userId:
                    financeUser.userId,
                action:
                    ActivityType.UPDATE,
                entity: "Refund",
                entityId: refund.id,
                metadata: serialiseJson({
                    event:
                        "REFUND_MARKED_SUCCESSFUL",
                    refundId: refund.id,
                    paymentId:
                        refund.paymentId,
                    amount:
                        refund.amount.toNumber(),
                    currency:
                        refund.currency,
                    successfulRefundTotal,
                    fullyRefunded,
                }),
            },
        }),

        prisma.notification.create({
            data: {
                userId:
                    refund.payment.userId,
                type: "PAYMENT",
                title:
                    "Refund completed",
                message:
                    `Your refund of ${refund.currency} ${refund.amount
                        .toNumber()
                        .toFixed(
                            2,
                        )} has been completed.`,
                link: `/payments/${refund.paymentId}`,
            },
        }),
    ]);

    revalidatePath(
        `/admin/payments/${refund.paymentId}`,
    );
    revalidatePath("/admin/payments");
}

export async function cancelRefundAction(
    formData: FormData,
): Promise<void> {
    const financeUser =
        await requireFinanceUser();

    const refundId = String(
        formData.get("refundId") ?? "",
    ).trim();

    const reason = String(
        formData.get("reason") ?? "",
    ).trim();

    if (!refundId) {
        throw new Error(
            "Refund ID is missing.",
        );
    }

    if (reason.length < 10) {
        throw new Error(
            "Enter a cancellation reason of at least 10 characters.",
        );
    }

    const refund =
        await prisma.refund.findUnique({
            where: {
                id: refundId,
            },
            include: {
                payment: true,
            },
        });

    if (!refund) {
        throw new Error(
            "Refund could not be found.",
        );
    }

    if (
        !userCanManageJournal(
            financeUser.roles,
            refund.payment.journalId,
        )
    ) {
        throw new Error(
            "You do not have permission to cancel this refund.",
        );
    }

    if (
        refund.status !==
        RefundStatus.PENDING &&
        refund.status !==
        RefundStatus.FAILED
    ) {
        throw new Error(
            "Only pending or failed refunds can be cancelled.",
        );
    }

    await prisma.$transaction([
        prisma.refund.update({
            where: {
                id: refund.id,
            },
            data: {
                status:
                    RefundStatus.CANCELLED,
                failureReason: reason,
                failedAt: null,
            },
        }),

        prisma.activityLog.create({
            data: {
                userId:
                    financeUser.userId,
                action:
                    ActivityType.UPDATE,
                entity: "Refund",
                entityId: refund.id,
                metadata: serialiseJson({
                    event:
                        "REFUND_CANCELLED",
                    refundId: refund.id,
                    paymentId:
                        refund.paymentId,
                    previousStatus:
                        refund.status,
                    newStatus:
                        RefundStatus.CANCELLED,
                    reason,
                }),
            },
        }),
    ]);

    revalidatePath(
        `/admin/payments/${refund.paymentId}`,
    );
    revalidatePath("/admin/payments");
}