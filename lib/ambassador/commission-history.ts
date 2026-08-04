import { prisma } from "@/lib/prisma";
import type { Prisma, SubmissionStatus } from "@/lib/generated/prisma";

export type CommissionFilter = "PENDING" | "PAID" | "PUBLISHED" | "REJECTED";

export type CommissionRow = {
  submissionId: string;
  manuscriptTitle: string;
  referralDate: Date | null;
  editorialStatus: SubmissionStatus;
  rewardType: string | null;
  rewardAmount: string | null;
  paymentStatus: "PENDING" | "PAID";
  walletTransactionId: string | null;
  datePaid: Date | null;
};

const PAGE_SIZE = 20;

/**
 * Composes the commission history view entirely from Phase 1 data
 * (WalletTransaction + Submission + ReferralEvent) — no new model. One
 * row per referred manuscript; when both a submission and a publication
 * reward exist, the publication reward (the more advanced state) is shown.
 */
export async function getCommissionHistory(input: {
  reviewerId: string;
  filter?: CommissionFilter;
  search?: string;
  page?: number;
}): Promise<{ rows: CommissionRow[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, input.page ?? 1);

  const wallet = await prisma.ambassadorWallet.findFirst({
    where: { ambassador: { userId: input.reviewerId } },
    select: { id: true },
  });

  const paidSubmissionIds = wallet
    ? (
      await prisma.walletTransaction.findMany({
        where: {
          walletId: wallet.id,
          sourceType: "Submission",
          type: { in: ["SUBMISSION_REWARD", "PUBLICATION_REWARD"] },
        },
        select: { sourceId: true },
      })
    )
      .map((row) => row.sourceId)
      .filter((id): id is string => Boolean(id))
    : [];

  const where: Prisma.SubmissionWhereInput = { referrerReviewerId: input.reviewerId };

  if (input.search) {
    where.title = { contains: input.search, mode: "insensitive" };
  }

  if (input.filter === "PENDING") {
    where.id = { notIn: paidSubmissionIds };
  } else if (input.filter === "PAID") {
    where.id = { in: paidSubmissionIds };
  } else if (input.filter === "PUBLISHED") {
    where.status = "PUBLISHED";
  } else if (input.filter === "REJECTED") {
    where.status = "REJECTED";
  }

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, status: true },
    }),

    prisma.submission.count({ where }),
  ]);

  const submissionIds = submissions.map((submission) => submission.id);

  const [transactions, referralEvents] = await Promise.all([
    wallet
      ? prisma.walletTransaction.findMany({
        where: {
          walletId: wallet.id,
          sourceType: "Submission",
          sourceId: { in: submissionIds },
          type: { in: ["SUBMISSION_REWARD", "PUBLICATION_REWARD"] },
        },
        orderBy: { createdAt: "desc" },
      })
      : [],

    prisma.referralEvent.findMany({
      where: {
        reviewerId: input.reviewerId,
        submissionId: { in: submissionIds },
        stage: "SUBMITTED",
      },
      select: { submissionId: true, occurredAt: true },
    }),
  ]);

  const referralDateBySubmission = new Map(
    referralEvents.map((event) => [event.submissionId, event.occurredAt]),
  );

  const rows: CommissionRow[] = submissions.map((submission) => {
    const submissionTransactions = transactions.filter(
      (transaction) => transaction.sourceId === submission.id,
    );

    // Prefer the more advanced reward (publication over submission).
    const primary =
      submissionTransactions.find((t) => t.type === "PUBLICATION_REWARD") ??
      submissionTransactions.find((t) => t.type === "SUBMISSION_REWARD");

    return {
      submissionId: submission.id,
      manuscriptTitle: submission.title,
      referralDate: referralDateBySubmission.get(submission.id) ?? null,
      editorialStatus: submission.status,
      rewardType: primary?.type ?? null,
      rewardAmount: primary?.amount.toString() ?? null,
      paymentStatus: primary ? "PAID" : "PENDING",
      walletTransactionId: primary?.id ?? null,
      datePaid: primary?.createdAt ?? null,
    };
  });

  return {
    rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
