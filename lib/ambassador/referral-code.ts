import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

/**
 * Generates a referral code such as:
 * IJKRI-RF-83HD91
 *
 * The database unique constraint on ReviewerAmbassador.referralCode remains
 * the final protection against a rare duplicate reference.
 */
function buildReferralCode(journalShortName: string): string {
  const safeShortName = journalShortName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const randomPart = randomBytes(3).toString("hex").toUpperCase();

  return `${safeShortName}-RF-${randomPart}`;
}

/**
 * Generates a unique referral code for a journal, retrying a bounded
 * number of times on the rare chance of a collision.
 */
export async function generateReferralCode(
  journalShortName: string,
): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = buildReferralCode(journalShortName);

    const existing = await prisma.reviewerAmbassador.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error(
    "Unable to generate a unique referral code. Please try again.",
  );
}
