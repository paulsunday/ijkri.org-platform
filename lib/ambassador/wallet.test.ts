import { describe, expect, it, vi } from "vitest";

import { Prisma } from "@/lib/generated/prisma";

import {
  creditWallet,
  reserveWalletFundsForWithdrawal,
  reverseWithdrawalHold,
} from "./wallet";

function makeUniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

function makeTx() {
  return {
    ambassadorWallet: {
      update: vi.fn().mockResolvedValue({
        currentBalance: new Prisma.Decimal(150),
        currency: "USD",
      }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        currentBalance: new Prisma.Decimal(100),
        currency: "USD",
      }),
    },
    walletTransaction: {
      create: vi.fn().mockResolvedValue({ id: "txn_1" }),
    },
  } as unknown as Prisma.TransactionClient & {
    ambassadorWallet: { update: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn> };
    walletTransaction: { create: ReturnType<typeof vi.fn> };
  };
}

describe("creditWallet", () => {
  it("increments balance and records a CREDIT transaction", async () => {
    const tx = makeTx();

    await creditWallet(tx, {
      walletId: "wallet_1",
      type: "REVIEW_REWARD",
      amount: 50,
      idempotencyKey: "REVIEW_REWARD:assignment_1",
      description: "Review completed",
    });

    expect(tx.ambassadorWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wallet_1" },
        data: expect.objectContaining({
          currentBalance: { increment: 50 },
          lifetimeEarnings: { increment: 50 },
        }),
      }),
    );

    expect(tx.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "CREDIT",
          amount: 50,
          idempotencyKey: "REVIEW_REWARD:assignment_1",
        }),
      }),
    );
  });

  it("is a no-op for a zero or negative amount (unconfigured reward)", async () => {
    const tx = makeTx();

    await creditWallet(tx, {
      walletId: "wallet_1",
      type: "REVIEW_REWARD",
      amount: 0,
      idempotencyKey: "REVIEW_REWARD:assignment_2",
      description: "Review completed",
    });

    expect(tx.ambassadorWallet.update).not.toHaveBeenCalled();
    expect(tx.walletTransaction.create).not.toHaveBeenCalled();
  });

  it("silently no-ops on a duplicate idempotency key instead of double-crediting", async () => {
    const tx = makeTx();
    tx.walletTransaction.create.mockRejectedValue(makeUniqueConstraintError());

    await expect(
      creditWallet(tx, {
        walletId: "wallet_1",
        type: "REVIEW_REWARD",
        amount: 50,
        idempotencyKey: "REVIEW_REWARD:assignment_1",
        description: "Review completed",
      }),
    ).resolves.toBeUndefined();
  });

  it("re-throws non-idempotency errors", async () => {
    const tx = makeTx();
    tx.walletTransaction.create.mockRejectedValue(new Error("connection lost"));

    await expect(
      creditWallet(tx, {
        walletId: "wallet_1",
        type: "REVIEW_REWARD",
        amount: 50,
        idempotencyKey: "REVIEW_REWARD:assignment_1",
        description: "Review completed",
      }),
    ).rejects.toThrow("connection lost");
  });
});

describe("reserveWalletFundsForWithdrawal", () => {
  it("throws when the amount exceeds the current balance", async () => {
    const tx = makeTx();

    await expect(
      reserveWalletFundsForWithdrawal(tx, {
        walletId: "wallet_1",
        amount: 1000,
        idempotencyKey: "WITHDRAWAL_REQUEST:w1",
        description: "Withdrawal requested",
      }),
    ).rejects.toThrow(/insufficient/i);
  });

  it("moves funds from currentBalance to pendingBalance", async () => {
    const tx = makeTx();

    await reserveWalletFundsForWithdrawal(tx, {
      walletId: "wallet_1",
      amount: 50,
      idempotencyKey: "WITHDRAWAL_REQUEST:w1",
      description: "Withdrawal requested",
    });

    expect(tx.ambassadorWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentBalance: { decrement: 50 },
          pendingBalance: { increment: 50 },
        }),
      }),
    );
  });
});

describe("reverseWithdrawalHold", () => {
  it("moves pendingBalance back to currentBalance", async () => {
    const tx = makeTx();

    await reverseWithdrawalHold(tx, {
      walletId: "wallet_1",
      amount: 50,
      idempotencyKey: "WITHDRAWAL_REVERSED:w1",
      description: "Withdrawal rejected",
    });

    expect(tx.ambassadorWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pendingBalance: { decrement: 50 },
          currentBalance: { increment: 50 },
        }),
      }),
    );
  });
});
