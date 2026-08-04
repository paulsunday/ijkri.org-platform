import { randomBytes } from "crypto";

function datePart(): string {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `${year}-${month}${day}`;
}

/**
 * Generates a withdrawal reference such as: WD-2026-0804-A3F91C
 */
export function generateWithdrawalReference(): string {
  const randomPart = randomBytes(3).toString("hex").toUpperCase();

  return `WD-${datePart()}-${randomPart}`;
}

/**
 * Generates a certificate number such as: CERT-GOLD_AMBASSADOR-A3F91C6B2D
 */
export function generateCertificateNumber(type: string): string {
  const randomPart = randomBytes(5).toString("hex").toUpperCase();

  return `CERT-${type}-${randomPart}`;
}
