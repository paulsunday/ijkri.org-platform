import { logger } from "@/lib/logger";

/**
 * Hidden form field name used to trap simple bots. Genuine visitors
 * never see or fill this field (it is visually hidden and marked
 * aria-hidden in every form that includes it); anything other than
 * an empty value means the submission was almost certainly automated.
 */
export const HONEYPOT_FIELD_NAME = "homepage_url";

/**
 * Returns true (and logs it) if the honeypot field was filled in.
 * Use this directly when the caller's own contract is to return a
 * result object rather than throw (e.g. a useActionState action).
 */
export function isHoneypotFilled(
  formData: FormData,
  context: Record<string, unknown>,
): boolean {
  const value = formData.get(HONEYPOT_FIELD_NAME);

  const filled =
    typeof value === "string" && value.trim().length > 0;

  if (filled) {
    logger.warn("Honeypot field was filled in; treating as spam", {
      event: "HONEYPOT_TRIPPED",
      ...context,
    });
  }

  return filled;
}

/**
 * Throws a generic, unremarkable error if the honeypot field was
 * filled in. Call this before doing any real work (uploads, writes,
 * emails) so a bot submission never reaches the database.
 */
export function assertHoneypotEmpty(
  formData: FormData,
  context: Record<string, unknown>,
) {
  if (isHoneypotFilled(formData, context)) {
    throw new Error(
      "Your submission could not be processed. Please try again.",
    );
  }
}
