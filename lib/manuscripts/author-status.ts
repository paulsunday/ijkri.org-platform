import type { SubmissionStatus } from "@/lib/generated/prisma";

/**
 * Public visibility (article pages, feed, sitemap, OAI, search) is driven
 * entirely by Article.status / Issue.isPublished and is untouched by this
 * helper. This module only controls what the AUTHOR is shown: a submission
 * cannot read as "Published" to its author until the article has been
 * assigned its own ISSN, even if it is already live on the public site.
 */
export type AuthorFacingStatus = SubmissionStatus | "PENDING_ISSN";

export function hasIssn(
    issn: string | null | undefined,
): boolean {
    return typeof issn === "string" && issn.trim().length > 0;
}

export function getAuthorFacingStatus(
    submissionStatus: SubmissionStatus,
    article: { issn: string | null } | null | undefined,
): AuthorFacingStatus {
    if (submissionStatus !== "PUBLISHED") {
        return submissionStatus;
    }

    return hasIssn(article?.issn)
        ? "PUBLISHED"
        : "PENDING_ISSN";
}

export function formatAuthorStatusLabel(
    status: AuthorFacingStatus,
): string {
    if (status === "PENDING_ISSN") {
        return "Under Review";
    }

    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

export function authorStatusBadgeClass(
    status: AuthorFacingStatus,
): string {
    if (status === "PENDING_ISSN") {
        return "bg-blue-100 text-blue-800";
    }

    switch (status) {
        case "DRAFT":
            return "bg-gray-100 text-gray-700";

        case "SUBMITTED":
        case "UNDER_INITIAL_REVIEW":
            return "bg-blue-100 text-blue-800";

        case "UNDER_PEER_REVIEW":
            return "bg-purple-100 text-purple-800";

        case "REVISION_REQUIRED":
            return "bg-orange-100 text-orange-800";

        case "ACCEPTED":
            return "bg-green-100 text-green-800";

        case "COPYEDITING":
        case "TYPESETTING":
            return "bg-indigo-100 text-indigo-800";

        case "PROOFREADING":
            return "bg-amber-100 text-amber-800";

        case "AUTHOR_PROOF_APPROVAL":
            return "bg-violet-100 text-violet-800";

        case "READY_FOR_PUBLICATION":
            return "bg-emerald-100 text-emerald-800";

        case "PUBLISHED":
            return "bg-green-100 text-green-800";

        case "REJECTED":
            return "bg-red-100 text-red-800";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

export function isAuthorFacingPublished(
    status: AuthorFacingStatus,
): boolean {
    return status === "PUBLISHED";
}
