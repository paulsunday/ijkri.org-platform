import type {
  Prisma,
  ReferralStage,
} from "@/lib/generated/prisma";

type RecordReferralEventInput = {
  reviewerId: string;
  referredUserId?: string;
  submissionId?: string;
  stage: ReferralStage;
  metadata?: Record<string, unknown>;
};

/**
 * Appends one row to the referral timeline. Thin wrapper matching the
 * codebase's inline tx.<model>.create convention used for notifications
 * and activity logs elsewhere.
 */
export async function recordReferralEvent(
  tx: Prisma.TransactionClient,
  input: RecordReferralEventInput,
): Promise<void> {
  await tx.referralEvent.create({
    data: {
      reviewerId: input.reviewerId,
      referredUserId: input.referredUserId,
      submissionId: input.submissionId,
      stage: input.stage,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
