import { prisma } from "@/lib/prisma";
import type { StaticPageKey } from "@/lib/generated/prisma";

export type StaticPageOverride = {
  title: string;
  tagline: string | null;
  body: string;
  updatedAt: Date;
};

/**
 * Returns a super-admin-authored override for an otherwise hardcoded
 * public page, or null if the page has never been customized (in
 * which case the caller should render its original built-in content
 * unchanged — nothing is lost by this feature existing).
 */
export async function getStaticPageOverride(
  key: StaticPageKey,
): Promise<StaticPageOverride | null> {
  const journal = await prisma.journal.findFirst({
    where: { slug: "IJKRI" },
    select: { id: true },
  });

  if (!journal) {
    return null;
  }

  return prisma.staticPage.findUnique({
    where: {
      journalId_key: {
        journalId: journal.id,
        key,
      },
    },
    select: {
      title: true,
      tagline: true,
      body: true,
      updatedAt: true,
    },
  });
}
