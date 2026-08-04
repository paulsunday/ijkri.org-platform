/**
 * Extracted from the inline `isOrcidVerified` check in app/account/page.tsx
 * so the same verified-ORCID badge can be reused on the public ambassador
 * profile, admin ambassador detail page, and leaderboard.
 */
export function OrcidVerifiedBadge({
  orcid,
  verifiedAt,
}: {
  orcid: string | null;
  verifiedAt: Date | null;
}) {
  const isVerified = Boolean(orcid && verifiedAt);

  if (!isVerified) {
    return null;
  }

  return (
    <a
      href={`https://orcid.org/${orcid}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800"
    >
      <span aria-hidden="true">✓</span> ORCID Verified
    </a>
  );
}
