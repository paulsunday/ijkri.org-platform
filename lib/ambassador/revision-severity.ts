import type { ReviewRecommendation } from "@/lib/generated/prisma";

/**
 * The real editorial workflow only has a single REVISION_REQUIRED
 * status (see app/editor/submissions/[id]/decisions/actions.ts). This
 * derives a *display-only* Minor/Major label for the ambassador referral
 * timeline from the majority reviewer recommendation of that round,
 * without touching the core SubmissionStatus state machine.
 */
export function deriveRevisionSeverity(
  recommendations: (ReviewRecommendation | null | undefined)[],
): "MINOR" | "MAJOR" {
  let minorVotes = 0;
  let majorVotes = 0;

  for (const recommendation of recommendations) {
    if (recommendation === "MINOR_REVISION") {
      minorVotes += 1;
    } else if (recommendation === "MAJOR_REVISION") {
      majorVotes += 1;
    }
  }

  return majorVotes >= minorVotes ? "MAJOR" : "MINOR";
}
