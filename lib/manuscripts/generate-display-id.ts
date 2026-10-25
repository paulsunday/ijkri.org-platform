import { randomUUID } from "node:crypto";

import type { Prisma } from "@/lib/generated/prisma";

type TransactionClient = Prisma.TransactionClient;

/**
 * Hands out the next IJKRI-YYYY-NNN manuscript display ID for a journal,
 * atomically, using a single UPDATE ... RETURNING statement so concurrent
 * submissions can never be handed the same number.
 *
 * Call this inside the same transaction as the Submission.create() call.
 */
export async function generateManuscriptDisplayId(
  tx: TransactionClient,
  journalSlug: string,
  journalId: string,
): Promise<string> {
  const year = new Date().getUTCFullYear();

  /*
   * INSERT ... ON CONFLICT DO NOTHING is atomic at the database level,
   * unlike a plain upsert, so two submissions racing to create the first
   * sequence row for a new year can never throw a unique-constraint error
   * against each other.
   */
  await tx.$executeRaw`
    INSERT INTO "ManuscriptSequence" ("id", "journalId", "year", "lastNumber", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${journalId}, ${year}, 0, now(), now())
    ON CONFLICT ("journalId", "year") DO NOTHING
  `;

  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    UPDATE "ManuscriptSequence"
    SET "lastNumber" = "lastNumber" + 1,
        "updatedAt" = now()
    WHERE "journalId" = ${journalId} AND "year" = ${year}
    RETURNING "lastNumber"
  `;

  const nextNumber = rows[0]?.lastNumber;

  if (!nextNumber) {
    throw new Error(
      "Could not allocate the next manuscript sequence number.",
    );
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");

  return `${journalSlug}-${year}-${paddedNumber}`;
}
