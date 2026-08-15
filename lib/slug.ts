export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds a unique slug from `value`, appending a numeric suffix on
 * collision. `isTaken` should check uniqueness within the right scope
 * (e.g. per journal).
 */
export async function generateUniqueSlug(
  value: string,
  isTaken: (candidate: string) => Promise<boolean>,
  fallback = "item",
): Promise<string> {
  const base = slugify(value) || fallback;

  if (!(await isTaken(base))) {
    return base;
  }

  const maxAttempts = 20;

  for (let suffix = 2; suffix <= maxAttempts; suffix += 1) {
    const candidate = `${base}-${suffix}`;

    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique slug. Please try again.");
}
