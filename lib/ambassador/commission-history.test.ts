import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  walletFindFirst,
  walletTransactionFindMany,
  submissionFindMany,
  submissionCount,
  referralEventFindMany,
} = vi.hoisted(() => ({
  walletFindFirst: vi.fn(),
  walletTransactionFindMany: vi.fn(),
  submissionFindMany: vi.fn(),
  submissionCount: vi.fn(),
  referralEventFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ambassadorWallet: { findFirst: walletFindFirst },
    walletTransaction: { findMany: walletTransactionFindMany },
    submission: { findMany: submissionFindMany, count: submissionCount },
    referralEvent: { findMany: referralEventFindMany },
  },
}));

const { getCommissionHistory } = await import("./commission-history");

beforeEach(() => {
  vi.clearAllMocks();
  walletFindFirst.mockResolvedValue({ id: "wallet_1" });
  referralEventFindMany.mockResolvedValue([]);
});

describe("getCommissionHistory", () => {
  it("marks a submission PENDING when no wallet transaction exists for it", async () => {
    walletTransactionFindMany
      .mockResolvedValueOnce([]) // paid-id lookup pass
      .mockResolvedValueOnce([]); // per-page transaction lookup

    submissionFindMany.mockResolvedValue([
      { id: "sub_1", title: "Untitled Study", status: "UNDER_PEER_REVIEW" },
    ]);
    submissionCount.mockResolvedValue(1);

    const result = await getCommissionHistory({ reviewerId: "reviewer_1" });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].paymentStatus).toBe("PENDING");
    expect(result.rows[0].rewardAmount).toBeNull();
  });

  it("marks a submission PAID and picks the publication reward over the submission reward", async () => {
    const submissionRewardTxn = {
      id: "txn_submission",
      sourceId: "sub_1",
      type: "SUBMISSION_REWARD",
      amount: { toString: () => "10.00" },
      createdAt: new Date("2026-01-05"),
    };

    const publicationRewardTxn = {
      id: "txn_publication",
      sourceId: "sub_1",
      type: "PUBLICATION_REWARD",
      amount: { toString: () => "50.00" },
      createdAt: new Date("2026-03-01"),
    };

    walletTransactionFindMany
      .mockResolvedValueOnce([{ sourceId: "sub_1" }])
      .mockResolvedValueOnce([submissionRewardTxn, publicationRewardTxn]);

    submissionFindMany.mockResolvedValue([
      { id: "sub_1", title: "Published Study", status: "PUBLISHED" },
    ]);
    submissionCount.mockResolvedValue(1);

    const result = await getCommissionHistory({ reviewerId: "reviewer_1" });

    expect(result.rows[0].paymentStatus).toBe("PAID");
    expect(result.rows[0].rewardType).toBe("PUBLICATION_REWARD");
    expect(result.rows[0].rewardAmount).toBe("50.00");
    expect(result.rows[0].walletTransactionId).toBe("txn_publication");
  });

  it("filters to only paid submissions when filter=PAID", async () => {
    walletTransactionFindMany.mockResolvedValueOnce([{ sourceId: "sub_1" }]).mockResolvedValueOnce([]);
    submissionFindMany.mockResolvedValue([]);
    submissionCount.mockResolvedValue(0);

    await getCommissionHistory({ reviewerId: "reviewer_1", filter: "PAID" });

    const callArgs = submissionFindMany.mock.calls[0][0];
    expect(callArgs.where.id).toEqual({ in: ["sub_1"] });
  });

  it("filters to only pending submissions when filter=PENDING", async () => {
    walletTransactionFindMany.mockResolvedValueOnce([{ sourceId: "sub_1" }]).mockResolvedValueOnce([]);
    submissionFindMany.mockResolvedValue([]);
    submissionCount.mockResolvedValue(0);

    await getCommissionHistory({ reviewerId: "reviewer_1", filter: "PENDING" });

    const callArgs = submissionFindMany.mock.calls[0][0];
    expect(callArgs.where.id).toEqual({ notIn: ["sub_1"] });
  });
});
