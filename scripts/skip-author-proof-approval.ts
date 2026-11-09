import "dotenv/config";

import { prisma } from "../lib/prisma";

/**
 * One-time cleanup after removing the Author Proof Approval step.
 * Moves every submission still waiting in AUTHOR_PROOF_APPROVAL
 * to READY_FOR_PUBLICATION, and logs each move in the activity log.
 *
 * SAFE BY DEFAULT: runs as a dry run and only prints what it would
 * do. Pass --apply to actually write the changes.
 *
 * Usage:
 *   npx tsx scripts/skip-author-proof-approval.ts            (dry run)
 *   npx tsx scripts/skip-author-proof-approval.ts --apply    (writes)
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const submissions = await prisma.submission.findMany({
    where: { status: "AUTHOR_PROOF_APPROVAL" },
    select: { id: true, displayId: true, title: true, authorId: true },
    orderBy: { createdAt: "asc" },
  });

  if (submissions.length === 0) {
    console.log("No submissions are awaiting author proof approval. Nothing to do.");
    return;
  }

  console.log(`Found ${submissions.length} submission(s) awaiting author proof approval.`);
  console.log(APPLY ? "Mode: APPLY (will write changes)" : "Mode: DRY RUN (no changes will be written)");
  console.log("");

  for (const submission of submissions) {
    console.log(
      `${submission.displayId ?? submission.id}  ->  READY_FOR_PUBLICATION   ("${submission.title.slice(0, 60)}")`,
    );

    if (APPLY) {
      await prisma.$transaction([
        prisma.submission.update({
          where: { id: submission.id },
          data: { status: "READY_FOR_PUBLICATION" },
        }),
        prisma.activityLog.create({
          data: {
            userId: submission.authorId,
            action: "UPDATE",
            entity: "Submission",
            entityId: submission.id,
            metadata: {
              event: "AUTHOR_PROOF_APPROVAL_SKIPPED",
              reason: "Author proof approval step removed from workflow",
              previousStatus: "AUTHOR_PROOF_APPROVAL",
              newStatus: "READY_FOR_PUBLICATION",
            },
          },
        }),
      ]);
    }
  }

  console.log("");
  console.log(
    APPLY
      ? "Done. All listed submissions are now Ready for Publication."
      : "Dry run complete. Re-run with --apply to write these changes.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error("Update failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
