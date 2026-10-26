import { headers } from "next/headers";

/**
 * Best-effort client IP, read from the standard forwarding headers
 * Vercel sets. Returns null rather than throwing if unavailable —
 * this is recorded for the e-signature audit trail, not relied on
 * for security decisions.
 */
export async function getClientIp(): Promise<string | null> {
  const headerList = await headers();

  const forwardedFor = headerList.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return headerList.get("x-real-ip");
}

export async function getClientUserAgent(): Promise<string | null> {
  const headerList = await headers();

  return headerList.get("user-agent");
}
