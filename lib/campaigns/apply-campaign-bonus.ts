import type { Prisma, WalletTransactionType } from "@/lib/generated/prisma";

import { creditWallet } from "@/lib/ambassador/wallet";
import type { ResolvedCampaignBonus } from "./resolve-active-campaign";

/**
 * Credits a campaign bonus as a second, independently-idempotent
 * WalletTransaction alongside the base Phase 1 reward, and records the
 * CampaignRewardLog + spentBudget update in the same transaction. Never
 * touches the base reward's amount or idempotency key.
 */
export async function applyCampaignBonus(
  tx: Prisma.TransactionClient,
  input: {
    walletId: string;
    walletTransactionType: WalletTransactionType;
    bonus: ResolvedCampaignBonus;
    sourceType?: string;
    sourceId?: string;
    description: string;
  },
): Promise<void> {
  const idempotencyKey = `CAMPAIGN_BONUS:${input.bonus.campaignId}:${input.sourceId ?? input.walletId}`;

  await creditWallet(tx, {
    walletId: input.walletId,
    type: input.walletTransactionType,
    amount: input.bonus.bonusAmount,
    idempotencyKey,
    sourceType: "ReferralCampaign",
    sourceId: input.bonus.campaignId,
    description: input.description,
  });

  const walletTransaction = await tx.walletTransaction.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });

  if (!walletTransaction) {
    return;
  }

  const existingLog = await tx.campaignRewardLog.findUnique({
    where: { walletTransactionId: walletTransaction.id },
    select: { id: true },
  });

  if (existingLog) {
    return;
  }

  await tx.campaignRewardLog.create({
    data: {
      campaignId: input.bonus.campaignId,
      walletTransactionId: walletTransaction.id,
      submissionId: input.sourceType === "Submission" ? input.sourceId : undefined,
      amount: input.bonus.bonusAmount,
    },
  });

  await tx.referralCampaign.update({
    where: { id: input.bonus.campaignId },
    data: { spentBudget: { increment: input.bonus.bonusAmount } },
  });
}
