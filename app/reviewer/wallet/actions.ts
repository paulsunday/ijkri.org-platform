"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES, ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reserveWalletFundsForWithdrawal } from "@/lib/ambassador/wallet";
import { generateWithdrawalReference } from "@/lib/ambassador/reference-number";
import { createTransferRecipient } from "@/lib/payments/create-transfer-recipient";

const OPEN_WITHDRAWAL_STATUSES = ["PENDING", "APPROVED", "PROCESSING"] as const;

export async function requestWithdrawal(formData: FormData) {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);

  const amountValue = String(formData.get("amount") || "").trim();
  const amount = Number(amountValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid withdrawal amount.");
  }

  try {
    await enforceRateLimit("withdrawal-request", reviewer.id);
  } catch {
    throw new Error("Too many withdrawal requests. Please wait and try again.");
  }

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: {
      id: true,
      status: true,
      wallet: {
        select: {
          id: true,
          currentBalance: true,
          currency: true,
        },
      },
      payoutAccount: {
        select: {
          id: true,
          bankCode: true,
          accountNumber: true,
          accountName: true,
          paystackRecipientCode: true,
        },
      },
    },
  });

  if (!ambassador || !ambassador.wallet) {
    throw new Error("Only approved reviewers can request a withdrawal.");
  }

  if (ambassador.status !== "ACTIVE") {
    throw new Error("Your ambassador account is suspended.");
  }

  if (!ambassador.payoutAccount) {
    throw new Error("Add and verify a bank account before requesting a withdrawal.");
  }

  if (amount > Number(ambassador.wallet.currentBalance)) {
    throw new Error("Withdrawal amount exceeds your available balance.");
  }

  const existingOpenWithdrawal = await prisma.withdrawalRequest.findFirst({
    where: {
      ambassadorId: ambassador.id,
      status: { in: [...OPEN_WITHDRAWAL_STATUSES] },
    },
    select: { id: true },
  });

  if (existingOpenWithdrawal) {
    throw new Error(
      "You already have a withdrawal request in progress. Wait for it to be resolved before requesting another.",
    );
  }

  let recipientCode = ambassador.payoutAccount.paystackRecipientCode;

  if (!recipientCode) {
    try {
      const recipient = await createTransferRecipient({
        name: ambassador.payoutAccount.accountName,
        accountNumber: ambassador.payoutAccount.accountNumber,
        bankCode: ambassador.payoutAccount.bankCode,
      });

      recipientCode = recipient.data.recipient_code;

      await prisma.ambassadorPayoutAccount.update({
        where: { id: ambassador.payoutAccount.id },
        data: { paystackRecipientCode: recipientCode },
      });
    } catch (error) {
      logger.error("Failed to create Paystack transfer recipient", error, {
        event: "TRANSFER_RECIPIENT_CREATE_FAILED",
        ambassadorId: ambassador.id,
      });

      throw new Error(
        "Could not set up your payout destination. Please try again shortly.",
      );
    }
  }

  const internalReference = generateWithdrawalReference();

  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.create({
      data: {
        walletId: ambassador.wallet!.id,
        ambassadorId: ambassador.id,
        payoutAccountId: ambassador.payoutAccount!.id,
        amount,
        currency: ambassador.wallet!.currency,
        internalReference,
        status: "PENDING",
      },
    });

    await reserveWalletFundsForWithdrawal(tx, {
      walletId: ambassador.wallet!.id,
      amount,
      idempotencyKey: `WITHDRAWAL_REQUEST:${withdrawal.id}`,
      sourceType: "WithdrawalRequest",
      sourceId: withdrawal.id,
      description: "Withdrawal requested",
    });

    await tx.activityLog.create({
      data: {
        userId: reviewer.id,
        action: "CREATE",
        entity: "WithdrawalRequest",
        entityId: withdrawal.id,
        metadata: {
          event: "WITHDRAWAL_REQUESTED",
          ambassadorId: ambassador.id,
          amount: amount.toString(),
        },
      },
    });

    const admins = await tx.userJournalRole.findMany({
      where: { role: { in: ADMIN_ROLES } },
      select: { userId: true },
      distinct: ["userId"],
    });

    for (const admin of admins) {
      await tx.notification.create({
        data: {
          userId: admin.userId,
          type: "PAYMENT",
          title: "New withdrawal request",
          message: `A reviewer requested a withdrawal of ${ambassador.wallet!.currency} ${amount.toFixed(2)}.`,
          link: "/admin/reviewer-ambassadors/withdrawals",
        },
      });
    }
  });

  revalidatePath("/reviewer/wallet");
  revalidatePath("/admin/reviewer-ambassadors/withdrawals");
}
