/**
 * ============================================================================
 * Journal Platform Download Authorization
 * ============================================================================
 *
 * This module determines whether a user may access a stored journal file.
 *
 * Important:
 * - Public publication files may be accessed without editorial permissions.
 * - Private manuscripts, reviews, revisions, and production files require
 *   authenticated authorization.
 * - Server actions and route handlers should call these helpers before
 *   returning or proxying a private Vercel Blob file.
 */

import "server-only";

import {
    PRIVATE_FILE_TYPES,
    PUBLIC_FILE_TYPES,
} from "./constants";

import type {
    DownloadAuthorizationResult,
    FileCategory,
    StoredFileAccessContext,
    StorageUserContext,
} from "./types";

import { StorageError } from "./types";

/**
 * Roles with platform-wide administrative authority.
 */
const PLATFORM_ADMIN_ROLES = new Set([
    "SUPER_ADMIN",
    "ADMIN",
]);

/**
 * Editorial roles that may access files belonging to journals they manage.
 */
const JOURNAL_EDITORIAL_ROLES = new Set([
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
]);

/**
 * Production roles.
 *
 * Production users do not automatically receive access to every submission.
 * They must also be the assigned production user unless they hold an
 * administrative or editorial role.
 */
const PRODUCTION_ROLES = new Set([
    "COPYEDITOR",
    "TYPESETTER",
    "PROOFREADER",
]);

/**
 * File categories accessible to the submission author.
 */
const AUTHOR_ACCESSIBLE_CATEGORIES = new Set<FileCategory>([
    "MANUSCRIPT",
    "REVISION",
    "RESPONSE_LETTER",
    "PROOF",
    "FINAL_ARTICLE",
    "PDF_GALLEY",
    "HTML_GALLEY",
    "XML_GALLEY",
    "SUPPLEMENTARY",
]);

/**
 * File categories accessible to an assigned reviewer.
 *
 * Reviewers may see the manuscript and their own review attachments, but
 * should not automatically see confidential production files.
 */
const REVIEWER_ACCESSIBLE_CATEGORIES = new Set<FileCategory>([
    "MANUSCRIPT",
    "REVISION",
    "REVIEW_ATTACHMENT",
    "SUPPLEMENTARY",
]);

/**
 * Files accessible to an assigned production worker.
 */
const PRODUCTION_ACCESSIBLE_CATEGORIES = new Set<FileCategory>([
    "MANUSCRIPT",
    "REVISION",
    "COPYEDITED",
    "TYPESET",
    "PROOF",
    "FINAL_ARTICLE",
    "PDF_GALLEY",
    "HTML_GALLEY",
    "XML_GALLEY",
    "SUPPLEMENTARY",
]);

/**
 * Normalizes role names so authorization is not affected by casing or
 * surrounding whitespace.
 */
function normalizeRoles(roles: string[]): Set<string> {
    return new Set(
        roles
            .map((role) => role.trim().toUpperCase())
            .filter(Boolean),
    );
}

/**
 * Checks whether at least one role exists in a role collection.
 */
function hasAnyRole(
    userRoles: Set<string>,
    allowedRoles: Set<string>,
): boolean {
    for (const role of allowedRoles) {
        if (userRoles.has(role)) {
            return true;
        }
    }

    return false;
}

/**
 * Determines whether a user is assigned to the journal containing the file.
 *
 * Platform administrators are handled separately and do not require journal
 * assignment.
 */
function hasJournalAccess(
    user: StorageUserContext,
    file: StoredFileAccessContext,
): boolean {
    /**
     * When the file has no journal ID, journal-scoped editorial access cannot
     * be safely established.
     */
    if (!file.journalId) {
        return false;
    }

    return (user.journalIds ?? []).includes(file.journalId);
}

/**
 * Determines whether a public file is genuinely publication-ready.
 *
 * A public URL alone must not make an unpublished article publicly available.
 */
function isPubliclyAvailableFile(
    file: StoredFileAccessContext,
): boolean {
    const isPublicCategory =
        (PUBLIC_FILE_TYPES as readonly string[]).includes(
            file.category,
        );

    if (!isPublicCategory) {
        return false;
    }

    if (file.isPublished === true) {
        return true;
    }

    return file.articleStatus?.trim().toUpperCase() === "PUBLISHED";
}

/**
 * Returns whether a file category is considered private.
 */
function isPrivateFileCategory(
    category: FileCategory,
): boolean {
    return (PRIVATE_FILE_TYPES as readonly string[]).includes(
        category,
    );
}

/**
 * Main non-throwing authorization function.
 *
 * Use this when the calling page or route needs to handle forbidden access
 * without relying on exception handling.
 */
export function authorizeFileDownload(
    user: StorageUserContext | null,
    file: StoredFileAccessContext,
): DownloadAuthorizationResult {
    if (!file.fileUrl?.trim()) {
        return {
            allowed: false,
            reason: "The requested file does not have a valid storage URL.",
        };
    }

    /**
     * Published public files may be downloaded without authentication.
     */
    if (isPubliclyAvailableFile(file)) {
        return {
            allowed: true,
            reason: null,
        };
    }

    /**
     * Everything else requires an authenticated user.
     */
    if (!user?.userId?.trim()) {
        return {
            allowed: false,
            reason: "You must sign in to access this file.",
        };
    }

    const userId = user.userId.trim();
    const userRoles = normalizeRoles(user.roles);

    /**
     * Platform administrators may access all stored journal files.
     */
    if (hasAnyRole(userRoles, PLATFORM_ADMIN_ROLES)) {
        return {
            allowed: true,
            reason: null,
        };
    }

    /**
     * Journal editors may access files only inside journals assigned to them.
     */
    if (
        hasAnyRole(userRoles, JOURNAL_EDITORIAL_ROLES) &&
        hasJournalAccess(user, file)
    ) {
        return {
            allowed: true,
            reason: null,
        };
    }

    /**
     * Submission authors may access approved categories belonging to their
     * own submission.
     */
    if (
        userRoles.has("AUTHOR") &&
        file.authorId === userId &&
        AUTHOR_ACCESSIBLE_CATEGORIES.has(file.category)
    ) {
        return {
            allowed: true,
            reason: null,
        };
    }

    /**
     * Reviewers may access approved categories only when the file context
     * identifies them as the assigned reviewer.
     */
    if (
        userRoles.has("REVIEWER") &&
        file.reviewerId === userId &&
        REVIEWER_ACCESSIBLE_CATEGORIES.has(file.category)
    ) {
        return {
            allowed: true,
            reason: null,
        };
    }

    /**
     * Copyeditors, typesetters, and proofreaders must be assigned to the
     * corresponding production work before they can access private files.
     */
    if (
        hasAnyRole(userRoles, PRODUCTION_ROLES) &&
        file.assigneeId === userId &&
        PRODUCTION_ACCESSIBLE_CATEGORIES.has(file.category)
    ) {
        return {
            allowed: true,
            reason: null,
        };
    }

    /**
     * A private file should never fall through to public access.
     */
    if (isPrivateFileCategory(file.category)) {
        return {
            allowed: false,
            reason:
                "You do not have permission to access this private journal file.",
        };
    }

    return {
        allowed: false,
        reason:
            "This file is not publicly available or you do not have permission to access it.",
    };
}

/**
 * Throwing authorization API.
 *
 * This is the preferred helper for protected route handlers and server
 * actions.
 */
export function assertFileDownloadAuthorized(
    user: StorageUserContext | null,
    file: StoredFileAccessContext,
): void {
    const authorization = authorizeFileDownload(user, file);

    if (!authorization.allowed) {
        throw new StorageError(
            "DOWNLOAD_FORBIDDEN",
            authorization.reason,
            403,
            {
                fileId: file.fileId,
                category: file.category,
                userId: user?.userId,
            },
        );
    }
}

/**
 * Returns the stored file URL after successful authorization.
 *
 * For a public Blob, a route handler may redirect to this URL.
 *
 * For a private Blob, the route handler must retrieve or stream the Blob
 * using the private store token after this authorization check.
 */
export function getAuthorizedFileUrl(
    user: StorageUserContext | null,
    file: StoredFileAccessContext,
): string {
    assertFileDownloadAuthorized(user, file);

    return file.fileUrl.trim();
}