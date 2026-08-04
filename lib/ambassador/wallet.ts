import {
  Prisma,
  type WalletTransactionType,
} from "@/lib/generated/prisma";

const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR
  );
}

type CreditWalletInput = {
  walletId: string;
  type: WalletTransactionType;
  amount: number | string;
  idempotencyKey: string;
  description: string;
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
};

/**
 * Credits a wallet's current balance and lifetime earnings inside the
 * caller's existing transaction. Idempotent: if a WalletTransaction with
 * the same idempotencyKey already exists (e.g. a retried after() hook or
 * webhook redelivery), this silently no-ops instead of double-crediting.
 * A zero/negative amount is treated as a no-op (reward setting not
 * configured yet), per spec "never hardcoded" — an unconfigured reward
 * simply doesn't pay out rather than defaulting to some fabricated value.
 */
export async function creditWallet(
  tx: Prisma.TransactionClient,
  input: CreditWalletInput,
): Promise<void> {
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  try {
    const wallet = await tx.ambassadorWallet.update({
      where: { id: input.walletId },
      data: {
        currentBalance: { increment: amount },
        lifetimeEarnings: { increment: amount },
      },
      select: { currentBalance: true, currency: true },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        type: input.type,
        direction: "CREDIT",
        amount,
        currency: wallet.currency,
        balanceAfter: wallet.currentBalance,
        idempotencyKey: input.idempotencyKey,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        description: input.description,
        createdById: input.createdById,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return;
    }

    throw error;
  }
}

type DebitWalletInput = {
  walletId: string;
  amount: number | string;
  idempotencyKey: string;
  description: string;
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
};

/**
 * Moves funds out of currentBalance into pendingBalance when a
 * withdrawal is requested. Throws if the wallet does not have enough
 * currentBalance to cover the amount.
 */
export async function reserveWalletFundsForWithdrawal(
  tx: Prisma.TransactionClient,
  input: DebitWalletInput,
): Promise<void> {
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdrawal amount must be greater than zero.");
  }

  const wallet = await tx.ambassadorWallet.findUniqueOrThrow({
    where: { id: input.walletId },
    select: { currentBalance: true, currency: true },
  });

  if (Number(wallet.currentBalance) < amount) {
    throw new Error("Insufficient wallet balance for this withdrawal.");
  }

  const updated = await tx.ambassadorWallet.update({
    where: { id: input.walletId },
    data: {
      currentBalance: { decrement: amount },
      pendingBalance: { increment: amount },
    },
    select: { currentBalance: true, currency: true },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: input.walletId,
      type: "WITHDRAWAL",
      direction: "DEBIT",
      amount,
      currency: updated.currency,
      balanceAfter: updated.currentBalance,
      idempotencyKey: input.idempotencyKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      description: input.description,
      createdById: input.createdById,
    },
  });
}

/**
 * Moves pendingBalance to totalWithdrawn once a Paystack transfer
 * succeeds.
 */
export async function finalizeWalletWithdrawal(
  tx: Prisma.TransactionClient,
  input: {
    walletId: string;
    amount: number | string;
    idempotencyKey: string;
    description: string;
    sourceId?: string;
  },
): Promise<void> {
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  try {
    const updated = await tx.ambassadorWallet.update({
      where: { id: input.walletId },
      data: {
        pendingBalance: { decrement: amount },
        totalWithdrawn: { increment: amount },
      },
      select: { currentBalance: true, currency: true },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        type: "WITHDRAWAL",
        direction: "DEBIT",
        amount: 0,
        currency: updated.currency,
        balanceAfter: updated.currentBalance,
        idempotencyKey: input.idempotencyKey,
        sourceType: "WithdrawalRequest",
        sourceId: input.sourceId,
        description: input.description,
        status: "COMPLETED",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return;
    }

    throw error;
  }
}

/**
 * Reverses a withdrawal hold, moving pendingBalance back to
 * currentBalance, on a rejected/failed/reversed withdrawal.
 */
export async function reverseWithdrawalHold(
  tx: Prisma.TransactionClient,
  input: {
    walletId: string;
    amount: number | string;
    idempotencyKey: string;
    description: string;
    sourceId?: string;
  },
): Promise<void> {
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  try {
    const updated = await tx.ambassadorWallet.update({
      where: { id: input.walletId },
      data: {
        pendingBalance: { decrement: amount },
        currentBalance: { increment: amount },
      },
      select: { currentBalance: true, currency: true },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        type: "WITHDRAWAL_REVERSAL",
        direction: "CREDIT",
        amount,
        currency: updated.currency,
        balanceAfter: updated.currentBalance,
        idempotencyKey: input.idempotencyKey,
        sourceType: "WithdrawalRequest",
        sourceId: input.sourceId,
        description: input.description,
        status: "REVERSED",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return;
    }

    throw error;
  }
}

/**
 * Admin-only manual balance adjustment (positive or negative). Always
 * requires a reason and the admin's user id for a full audit trail.
 */
export async function adjustWalletBalance(
  tx: Prisma.TransactionClient,
  input: {
    walletId: string;
    amount: number;
    reason: string;
    createdById: string;
  },
): Promise<void> {
  if (input.amount === 0) {
    throw new Error("Adjustment amount cannot be zero.");
  }

  const direction = input.amount > 0 ? "CREDIT" : "DEBIT";
  const absoluteAmount = Math.abs(input.amount);

  const updated = await tx.ambassadorWallet.update({
    where: { id: input.walletId },
    data: {
      currentBalance: { increment: input.amount },
      lifetimeEarnings:
        direction === "CREDIT"
          ? { increment: absoluteAmount }
          : undefined,
    },
    select: { currentBalance: true, currency: true },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: input.walletId,
      type: "ADMIN_ADJUSTMENT",
      direction,
      amount: absoluteAmount,
      currency: updated.currency,
      balanceAfter: updated.currentBalance,
      idempotencyKey: `ADMIN_ADJUSTMENT:${input.walletId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      description: input.reason,
      createdById: input.createdById,
    },
  });
}
