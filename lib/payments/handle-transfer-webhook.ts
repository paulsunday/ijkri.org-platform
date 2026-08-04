import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
    finalizeWalletWithdrawal,
    reverseWithdrawalHold,
} from "@/lib/ambassador/wallet";
import { sendEmail } from "@/lib/email/send-email";
import {
    withdrawalApprovedEmail,
    withdrawalFailedEmail,
} from "@/lib/email/templates";

function getAppUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
        /\/+$/,
        "",
    );
}

type PaystackTransferWebhookData = {
    transfer_code?: string;
    reference?: string;
    status?: string;
    reason?: string;
};

export type PaystackTransferWebhookEvent = {
    event?: string;
    data?: PaystackTransferWebhookData;
};

/**
 * Handles transfer.success / transfer.failed / transfer.reversed
 * Paystack webhook events for ambassador withdrawals. Called from
 * app/api/paystack/webhook/route.ts before the existing charge.success
 * logic, using the same PaymentWebhookLog idempotency row (with
 * withdrawalRequestId populated instead of paymentId).
 */
export async function handleTransferWebhookEvent(
    event: PaystackTransferWebhookEvent,
    webhookLogId: string,
): Promise<{ handled: boolean }> {
    const eventType = event.event?.trim() ?? "";
    const transferCode = event.data?.transfer_code?.trim();
    const reference = event.data?.reference?.trim();

    if (!transferCode && !reference) {
        return { handled: false };
    }

    const withdrawal = await prisma.withdrawalRequest.findFirst({
        where: {
            OR: [
                transferCode ? { paystackTransferCode: transferCode } : undefined,
                reference ? { internalReference: reference } : undefined,
            ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
        },
        select: {
            id: true,
            walletId: true,
            amount: true,
            currency: true,
            status: true,
        },
    });

    if (!withdrawal) {
        logger.warn("Paystack transfer webhook matched no withdrawal request", {
            event: "TRANSFER_WEBHOOK_NO_MATCH",
            eventType,
            transferCode,
            reference,
        });

        return { handled: false };
    }

    await prisma.paymentWebhookLog.update({
        where: { id: webhookLogId },
        data: { withdrawalRequestId: withdrawal.id },
    });

    if (withdrawal.status !== "PROCESSING") {
        // Already resolved (or not yet in a state a webhook should mutate).
        return { handled: true };
    }

    if (eventType === "transfer.success") {
        let recipient: { userId: string; name: string; email: string } | null = null;

        await prisma.$transaction(async (tx) => {
            await finalizeWalletWithdrawal(tx, {
                walletId: withdrawal.walletId,
                amount: withdrawal.amount.toString(),
                idempotencyKey: `WITHDRAWAL_PAID:${withdrawal.id}`,
                sourceId: withdrawal.id,
                description: "Withdrawal paid out via Paystack",
            });

            await tx.withdrawalRequest.update({
                where: { id: withdrawal.id },
                data: { status: "PAID", paidAt: new Date() },
            });

            const wallet = await tx.ambassadorWallet.findUnique({
                where: { id: withdrawal.walletId },
                select: {
                    ambassador: {
                        select: { userId: true, user: { select: { name: true, email: true } } },
                    },
                },
            });

            if (wallet?.ambassador) {
                recipient = {
                    userId: wallet.ambassador.userId,
                    name: wallet.ambassador.user.name,
                    email: wallet.ambassador.user.email,
                };

                await tx.notification.create({
                    data: {
                        userId: wallet.ambassador.userId,
                        type: "PAYMENT",
                        title: "Withdrawal paid",
                        message: "Your withdrawal has been paid out to your bank account.",
                        link: "/reviewer/wallet",
                    },
                });
            }
        });

        if (recipient) {
            const { name, email } = recipient;

            const emailContent = withdrawalApprovedEmail({
                reviewerName: name,
                amount: Number(withdrawal.amount).toFixed(2),
                currency: withdrawal.currency,
                walletUrl: `${getAppUrl()}/reviewer/wallet`,
            });

            try {
                await sendEmail({
                    to: email,
                    subject: emailContent.subject,
                    html: emailContent.html,
                    text: emailContent.text,
                });
            } catch (error) {
                logger.error("Withdrawal paid email failed", error, {
                    event: "WITHDRAWAL_PAID_EMAIL_FAILED",
                    withdrawalId: withdrawal.id,
                });
            }
        }

        return { handled: true };
    }

    if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
        let recipient: { userId: string; name: string; email: string } | null = null;
        const failureReason = event.data?.reason ?? eventType;

        await prisma.$transaction(async (tx) => {
            await reverseWithdrawalHold(tx, {
                walletId: withdrawal.walletId,
                amount: withdrawal.amount.toString(),
                idempotencyKey: `WITHDRAWAL_REVERSED:${withdrawal.id}`,
                sourceId: withdrawal.id,
                description: `Withdrawal ${eventType === "transfer.failed" ? "failed" : "reversed"} — funds returned to balance`,
            });

            await tx.withdrawalRequest.update({
                where: { id: withdrawal.id },
                data: {
                    status: "FAILED",
                    failureReason,
                },
            });

            const wallet = await tx.ambassadorWallet.findUnique({
                where: { id: withdrawal.walletId },
                select: {
                    ambassador: {
                        select: { userId: true, user: { select: { name: true, email: true } } },
                    },
                },
            });

            if (wallet?.ambassador) {
                recipient = {
                    userId: wallet.ambassador.userId,
                    name: wallet.ambassador.user.name,
                    email: wallet.ambassador.user.email,
                };

                await tx.notification.create({
                    data: {
                        userId: wallet.ambassador.userId,
                        type: "PAYMENT",
                        title: "Withdrawal could not be completed",
                        message: "Your withdrawal could not be completed and the funds have been returned to your balance.",
                        link: "/reviewer/wallet",
                    },
                });
            }
        });

        if (recipient) {
            const { name, email } = recipient;

            const emailContent = withdrawalFailedEmail({
                reviewerName: name,
                reason: failureReason,
                walletUrl: `${getAppUrl()}/reviewer/wallet`,
            });

            try {
                await sendEmail({
                    to: email,
                    subject: emailContent.subject,
                    html: emailContent.html,
                    text: emailContent.text,
                });
            } catch (error) {
                logger.error("Withdrawal failed email failed to send", error, {
                    event: "WITHDRAWAL_FAILED_EMAIL_FAILED",
                    withdrawalId: withdrawal.id,
                });
            }
        }

        return { handled: true };
    }

    return { handled: false };
}
