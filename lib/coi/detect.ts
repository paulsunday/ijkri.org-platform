import { prisma } from "@/lib/prisma";
import type { ConflictSeverity, ConflictType } from "@/lib/generated/prisma";

export type ConflictFinding = {
  conflictType: ConflictType;
  severity: ConflictSeverity;
  reason: string;
  recommendation: string;
};

export type ConflictReport = {
  highestSeverity: ConflictSeverity | null;
  findings: ConflictFinding[];
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
]);

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function emailDomain(email: string): string | null {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain || null;
}

async function getApprovedApplicationDepartment(userId: string): Promise<string | null> {
  const application = await prisma.reviewerApplication.findFirst({
    where: { userId, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
    select: { department: true },
  });

  return normalize(application?.department);
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function highestOf(findings: ConflictFinding[]): ConflictSeverity | null {
  if (findings.length === 0) {
    return null;
  }

  return findings.reduce<ConflictSeverity>(
    (highest, finding) =>
      SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest] ? finding.severity : highest,
    findings[0].severity,
  );
}

/**
 * Detects conflicts of interest between a candidate reviewer and a
 * submission's author. Read-only — does not persist anything; the
 * caller (app/editor/submissions/[id]/reviewers/actions.ts) is
 * responsible for writing ConflictOfInterestCheck rows.
 *
 * Implements 8 of the spec's 9 conflict types. "Previous advisor/student"
 * and "shared funding agency" are not implemented — no data source for
 * either exists anywhere in the schema, and fabricating a heuristic for
 * them would produce false signals rather than a real safety check.
 */
export async function detectConflicts(input: {
  submissionId: string;
  reviewerId: string;
}): Promise<ConflictReport> {
  const findings: ConflictFinding[] = [];

  const submission = await prisma.submission.findUnique({
    where: { id: input.submissionId },
    select: {
      id: true,
      authorId: true,
      referrerReviewerId: true,
      author: {
        select: { id: true, name: true, email: true, affiliation: true, orcid: true },
      },
    },
  });

  if (!submission) {
    return { highestSeverity: null, findings: [] };
  }

  const reviewer = await prisma.user.findUnique({
    where: { id: input.reviewerId },
    select: { id: true, name: true, email: true, affiliation: true, orcid: true },
  });

  if (!reviewer) {
    return { highestSeverity: null, findings: [] };
  }

  // Phase 1 rule folded into the unified COI system.
  if (submission.referrerReviewerId === reviewer.id) {
    findings.push({
      conflictType: "REFERRAL_CONFLICT",
      severity: "HIGH",
      reason: "This reviewer referred the submitting author through their referral link.",
      recommendation: "Do not assign — select a different reviewer.",
    });
  }

  // 1. Same institution.
  const reviewerAffiliation = normalize(reviewer.affiliation);
  const authorAffiliation = normalize(submission.author.affiliation);

  if (reviewerAffiliation && authorAffiliation && reviewerAffiliation === authorAffiliation) {
    findings.push({
      conflictType: "SAME_INSTITUTION",
      severity: "HIGH",
      reason: `Reviewer and author share the same affiliation: "${submission.author.affiliation}".`,
      recommendation: "Do not assign unless no alternative reviewer is available.",
    });
  }

  // 2. Same department (only resolvable when both have an approved
  // reviewer application on file, since department isn't stored on User).
  const [reviewerDepartment, authorDepartment] = await Promise.all([
    getApprovedApplicationDepartment(reviewer.id),
    getApprovedApplicationDepartment(submission.author.id),
  ]);

  if (reviewerDepartment && authorDepartment && reviewerDepartment === authorDepartment) {
    findings.push({
      conflictType: "SAME_DEPARTMENT",
      severity: "MEDIUM",
      reason: "Reviewer and author belong to the same academic department.",
      recommendation: "Editor should confirm there is no direct working relationship.",
    });
  }

  // 5. Same email domain (excluding generic free-mail providers).
  const reviewerDomain = emailDomain(reviewer.email);
  const authorDomain = emailDomain(submission.author.email);

  if (
    reviewerDomain &&
    authorDomain &&
    reviewerDomain === authorDomain &&
    !FREE_EMAIL_DOMAINS.has(reviewerDomain)
  ) {
    findings.push({
      conflictType: "SAME_EMAIL_DOMAIN",
      severity: "LOW",
      reason: `Reviewer and author share the email domain "${reviewerDomain}".`,
      recommendation: "Likely the same institution — editor should verify.",
    });
  }

  // 3 & 4. Co-authorship on the author's other submissions (name match =
  // previous co-author, ORCID match = stronger "same ORCID collaboration").
  const otherSubmissionAuthorRows = await prisma.submissionAuthor.findMany({
    where: {
      submission: { authorId: submission.authorId, id: { not: submission.id } },
    },
    select: { fullName: true, orcid: true },
  });

  const reviewerNameNormalized = normalize(reviewer.name);
  const reviewerOrcidNormalized = normalize(reviewer.orcid);

  const hasOrcidCollaboration = otherSubmissionAuthorRows.some(
    (row) => reviewerOrcidNormalized && normalize(row.orcid) === reviewerOrcidNormalized,
  );

  const hasNameCoauthor = otherSubmissionAuthorRows.some(
    (row) => reviewerNameNormalized && normalize(row.fullName) === reviewerNameNormalized,
  );

  if (hasOrcidCollaboration) {
    findings.push({
      conflictType: "SAME_ORCID_COLLABORATION",
      severity: "HIGH",
      reason: "Reviewer's ORCID iD matches a co-author on this author's other manuscripts.",
      recommendation: "Do not assign — confirmed prior collaboration.",
    });
  } else if (hasNameCoauthor) {
    findings.push({
      conflictType: "PREVIOUS_COAUTHOR",
      severity: "HIGH",
      reason: "Reviewer's name matches a listed co-author on this author's other manuscripts.",
      recommendation: "Do not assign unless verified as a different individual.",
    });
  }

  // 6. Previously reviewed this same author's other work.
  const previousReviewCount = await prisma.reviewAssignment.count({
    where: {
      reviewerId: reviewer.id,
      submissionId: { not: submission.id },
      submission: { authorId: submission.authorId },
    },
  });

  if (previousReviewCount > 0) {
    findings.push({
      conflictType: "PREVIOUS_REVIEWER_OF_AUTHOR",
      severity: "MEDIUM",
      reason: `This reviewer has reviewed ${previousReviewCount} other manuscript(s) by this author.`,
      recommendation: "Not necessarily a conflict — editor should use judgment.",
    });
  }

  // 7. Previously served as editor deciding on this same author's work.
  const previousEditorDecisionCount = await prisma.editorialDecision.count({
    where: {
      editorId: reviewer.id,
      submissionId: { not: submission.id },
      submission: { authorId: submission.authorId },
    },
  });

  if (previousEditorDecisionCount > 0) {
    findings.push({
      conflictType: "PREVIOUS_EDITOR_OF_AUTHOR",
      severity: "MEDIUM",
      reason: `This reviewer previously made an editorial decision on ${previousEditorDecisionCount} other manuscript(s) by this author.`,
      recommendation: "Editor should confirm independence before assigning.",
    });
  }

  return { highestSeverity: highestOf(findings), findings };
}
