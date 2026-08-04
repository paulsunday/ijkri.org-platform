import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generates a unique ambassador profile slug from a reviewer's name
 * (e.g. "Dr. John Okeke" -> "dr-john-okeke"), appending a numeric
 * suffix on collision. Mirrors the retry-loop shape of
 * generateReferralCode.
 */
export async function generateAmbassadorSlug(name: string): Promise<string> {
  const base = slugify(name) || "ambassador";

  const existing = await prisma.reviewerAmbassador.findUnique({
    where: { slug: base },
    select: { id: true },
  });

  if (!existing) {
    return base;
  }

  const maxAttempts = 20;

  for (let suffix = 2; suffix <= maxAttempts; suffix += 1) {
    const candidate = `${base}-${suffix}`;

    const candidateExisting = await prisma.reviewerAmbassador.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!candidateExisting) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique ambassador slug. Please try again.");
}
