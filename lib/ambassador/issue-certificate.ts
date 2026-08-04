import type { CertificateType, Prisma } from "@/lib/generated/prisma";

import { generateCertificateNumber } from "@/lib/ambassador/reference-number";

export const CERTIFICATE_TITLES: Record<CertificateType, string> = {
  OUTSTANDING_REVIEWER: "Certificate of Outstanding Reviewer",
  BRONZE_AMBASSADOR: "Bronze Ambassador Certificate",
  SILVER_AMBASSADOR: "Silver Ambassador Certificate",
  GOLD_AMBASSADOR: "Gold Ambassador Certificate",
  PLATINUM_AMBASSADOR: "Platinum Ambassador Certificate",
  TOP_REVIEWER: "Certificate of Top Reviewer",
  TOP_AMBASSADOR: "Certificate of Top Ambassador",
};

/**
 * Idempotently issues an ambassador certificate. Safe to call more than
 * once for the same [ambassadorId, type, periodLabel] combination — the
 * unique constraint means a repeat call simply reuses the existing
 * record instead of creating a duplicate.
 */
export async function issueAmbassadorCertificate(
  tx: Prisma.TransactionClient,
  input: {
    ambassadorId: string;
    type: CertificateType;
    periodLabel?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ id: string; certificateNumber: string; created: boolean }> {
  /*
   * A compound findUnique can't match a null periodLabel reliably
   * (Postgres treats each NULL as distinct in a unique constraint), so
   * this uses findFirst with an explicit where instead.
   */
  const existing = await tx.ambassadorCertificate.findFirst({
    where: {
      ambassadorId: input.ambassadorId,
      type: input.type,
      periodLabel: input.periodLabel ?? null,
    },
    select: { id: true, certificateNumber: true },
  });

  if (existing) {
    return { ...existing, created: false };
  }

  const certificate = await tx.ambassadorCertificate.create({
    data: {
      ambassadorId: input.ambassadorId,
      type: input.type,
      title: CERTIFICATE_TITLES[input.type],
      certificateNumber: generateCertificateNumber(input.type),
      periodLabel: input.periodLabel,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    select: { id: true, certificateNumber: true },
  });

  return { ...certificate, created: true };
}
