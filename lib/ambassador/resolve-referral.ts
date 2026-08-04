import { prisma } from "@/lib/prisma";

/**
 * Resolves a referral code string to the reviewer who owns it.
 *
 * Security: this is the ONLY path that turns a client-supplied string
 * into a referrerReviewerId. It only ever matches an ACTIVE ambassador
 * record via the unique-indexed referralCode column, and it never
 * throws — an unknown, malformed, or suspended code simply resolves to
 * null so registration/submission flows are never blocked by a bad or
 * fabricated code.
 */
export async function resolveReferralCode(
  code: string | null | undefined,
): Promise<{ reviewerId: string; ambassadorId: string } | null> {
  const trimmedCode = code?.trim();

  if (!trimmedCode) {
    return null;
  }

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { referralCode: trimmedCode },
    select: { id: true, userId: true, status: true },
  });

  if (!ambassador || ambassador.status !== "ACTIVE") {
    return null;
  }

  return { reviewerId: ambassador.userId, ambassadorId: ambassador.id };
}

/**
 * Looks up an ambassador record by the reviewer's User id (used as a
 * fallback when an author has no explicit ?ref= on this request but was
 * already attributed to a reviewer at registration time). Same
 * never-throws, ACTIVE-only contract as resolveReferralCode.
 */
export async function resolveAmbassadorByReviewerId(
  reviewerId: string | null | undefined,
): Promise<{ reviewerId: string; ambassadorId: string } | null> {
  if (!reviewerId) {
    return null;
  }

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewerId },
    select: { id: true, userId: true, status: true },
  });

  if (!ambassador || ambassador.status !== "ACTIVE") {
    return null;
  }

  return { reviewerId: ambassador.userId, ambassadorId: ambassador.id };
}
