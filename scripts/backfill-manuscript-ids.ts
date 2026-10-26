import "dotenv/config";

import { prisma } from "../lib/prisma";

/**
 * Assigns a human-readable IJKRI-YYYY-NNN display ID to every
 * existing submission that doesn't have one yet (everything
 * submitted before this feature shipped).
 *
 * Numbering is based on the YEAR THE MANUSCRIPT WAS SUBMITTED
 * (submittedAt, falling back to createdAt for drafts), not the year
 * this script runs — otherwise a 2024 submission would wrongly get
 * a 2026 number. Submissions are processed in submission order
 * within each journal/year, so numbering reads chronologically.
 *
 * SAFE BY DEFAULT: runs as a dry run and only prints what it would
 * do. Pass --apply to actually write the changes.
 *
 * Usage:
 *   npx tsx scripts/backfill-manuscript-ids.ts            (dry run)
 *   npx tsx scripts/backfill-manuscript-ids.ts --apply    (writes)
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const submissions = await prisma.submission.findMany({
    where: { displayId: null },
    select: {
      id: true,
      journalId: true,
      title: true,
      submittedAt: true,
      createdAt: true,
      journal: { select: { slug: true } },
    },
    orderBy: [{ journalId: "asc" }, { createdAt: "asc" }],
  });

  if (submissions.length === 0) {
    console.log("No submissions are missing a displayId. Nothing to do.");
    return;
  }

  console.log(
    `Found ${submissions.length} submission(s) without a manuscript ID.`,
  );
  console.log(APPLY ? "Mode: APPLY (will write changes)" : "Mode: DRY RUN (no changes will be written)");
  console.log("");

  // Running counters per journal+year, seeded from whatever has
  // already been assigned (new submissions since this feature
  // shipped may already occupy some numbers for the current year).
  const counters = new Map<string, number>();

  for (const submission of submissions) {
    const year = (submission.submittedAt ?? submission.createdAt).getUTCFullYear();
    const counterKey = `${submission.journalId}:${year}`;

    if (!counters.has(counterKey)) {
      const existingMax = await prisma.manuscriptSequence.findUnique({
        where: {
          journalId_year: {
            journalId: submission.journalId,
            year,
          },
        },
        select: { lastNumber: true },
      });

      counters.set(counterKey, existingMax?.lastNumber ?? 0);
    }

    const nextNumber = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, nextNumber);

    const displayId = `${submission.journal.slug}-${year}-${String(
      nextNumber,
    ).padStart(3, "0")}`;

    console.log(
      `${submission.id}  ->  ${displayId}   ("${submission.title.slice(0, 60)}")`,
    );

    if (APPLY) {
      await prisma.$transaction([
        prisma.submission.update({
          where: { id: submission.id },
          data: { displayId },
        }),
        prisma.manuscriptSequence.upsert({
          where: {
            journalId_year: {
              journalId: submission.journalId,
              year,
            },
          },
          create: {
            journalId: submission.journalId,
            year,
            lastNumber: nextNumber,
          },
          update: {
            lastNumber: nextNumber,
          },
        }),
      ]);
    }
  }

  console.log("");
  console.log(
    APPLY
      ? "Done. All listed submissions now have a displayId."
      : "Dry run complete. Re-run with --apply to write these changes.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error("Backfill failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
