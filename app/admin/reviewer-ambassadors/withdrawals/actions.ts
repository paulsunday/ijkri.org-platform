"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { initiateTransfer } from "@/lib/payments/initiate-transfer";
import { reverseWithdrawalHold } from "@/lib/ambassador/wallet";

async function getPendingWithdrawal(withdrawalId: string) {
  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
    include: {
      wallet: { select: { id: true } },
      ambassador: { select: { userId: true } },
      payoutAccount: {
        select: { paystackRecipientCode: true, accountName: true },
      },
    },
  });

  if (!withdrawal) {
    throw new Error("Withdrawal request not found.");
  }

  if (withdrawal.status !== "PENDING") {
    throw new Error(
      `This withdrawal cannot be reviewed because its current status is ${withdrawal.status}.`,
    );
  }

  return withdrawal;
}

export async function approveWithdrawal(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const withdrawalId = String(formData.get("withdrawalId") || "").trim();

  if (!withdrawalId) {
    throw new Error("Withdrawal ID is missing.");
  }

  const withdrawal = await getPendingWithdrawal(withdrawalId);

  if (!withdrawal.payoutAccount.paystackRecipientCode) {
    throw new Error("This reviewer's payout account is not fully set up yet.");
  }

  try {
    const transfer = await initiateTransfer({
      amount: Number(withdrawal.amount),
      recipientCode: withdrawal.payoutAccount.paystackRecipientCode,
      reference: withdrawal.internalReference,
      reason: `Ambassador withdrawal ${withdrawal.internalReference}`,
    });

    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: "PROCESSING",
          paystackTransferCode: transfer.data.transfer_code,
          paystackTransferId: String(transfer.data.id),
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          userId: admin.id,
          action: "UPDATE",
          entity: "WithdrawalRequest",
          entityId: withdrawal.id,
          metadata: {
            event: "WITHDRAWAL_APPROVED",
            transferCode: transfer.data.transfer_code,
          },
        },
      });
    });
  } catch (error) {
    logger.error("Paystack transfer initiation failed", error, {
      event: "WITHDRAWAL_TRANSFER_FAILED",
      withdrawalId: withdrawal.id,
    });

    await prisma.$transaction(async (tx) => {
      await reverseWithdrawalHold(tx, {
        walletId: withdrawal.walletId,
        amount: withdrawal.amount.toString(),
        idempotencyKey: `WITHDRAWAL_REVERSED:${withdrawal.id}`,
        sourceId: withdrawal.id,
        description: "Withdrawal transfer could not be initiated",
      });

      await tx.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
          failureReason:
            error instanceof Error ? error.message : "Transfer could not be initiated.",
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
    });

    throw new Error(
      "The transfer could not be initiated with Paystack. The reviewer's balance has been restored.",
    );
  }

  revalidatePath("/admin/reviewer-ambassadors/withdrawals");
  revalidatePath("/reviewer/wallet");
}

export async function rejectWithdrawal(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const withdrawalId = String(formData.get("withdrawalId") || "").trim();
  const reviewNotes = String(formData.get("reviewNotes") || "").trim();

  if (!withdrawalId) {
    throw new Error("Withdrawal ID is missing.");
  }

  if (!reviewNotes) {
    throw new Error("Enter a reason for rejecting this withdrawal.");
  }

  const withdrawal = await getPendingWithdrawal(withdrawalId);

  await prisma.$transaction(async (tx) => {
    await reverseWithdrawalHold(tx, {
      walletId: withdrawal.walletId,
      amount: withdrawal.amount.toString(),
      idempotencyKey: `WITHDRAWAL_REVERSED:${withdrawal.id}`,
      sourceId: withdrawal.id,
      description: "Withdrawal request rejected — funds returned to balance",
    });

    await tx.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: {
        status: "REJECTED",
        reviewNotes,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        userId: withdrawal.ambassador.userId,
        type: "PAYMENT",
        title: "Withdrawal request rejected",
        message: `Your withdrawal request was rejected: ${reviewNotes}`,
        link: "/reviewer/wallet",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "WithdrawalRequest",
        entityId: withdrawal.id,
        metadata: {
          event: "WITHDRAWAL_REJECTED",
          reviewNotes,
        },
      },
    });
  });

  revalidatePath("/admin/reviewer-ambassadors/withdrawals");
  revalidatePath("/reviewer/wallet");
}
