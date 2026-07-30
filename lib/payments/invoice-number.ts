import { randomBytes } from "crypto";

/**
 * Generates an invoice number such as:
 * APC-2026-0728-A3F91C
 *
 * The database unique constraint remains the final protection
 * against a rare duplicate reference.
 */
export function generateInvoiceNumber(): string {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");

    const randomPart = randomBytes(3).toString("hex").toUpperCase();

    return `APC-${year}-${month}${day}-${randomPart}`;
}