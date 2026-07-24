/**
 * ============================================================================
 * Journal Platform Vercel Blob Storage Service
 * ============================================================================
 *
 * This is the only module that should communicate directly with Vercel Blob.
 *
 * Pages, route handlers, and server actions should call:
 *
 *     uploadJournalFile(...)
 *
 * rather than importing `put` from "@vercel/blob".
 */

import "server-only";
import { logger } from "@/lib/logger";
import { del, put } from "@vercel/blob";

import {
  PRIVATE_FILE_TYPES,
  PUBLIC_FILE_TYPES,
  STORAGE_FOLDERS,
} from "./constants";

import type {
  FileCategory,
  FileVisibility,
  StorageFolder,
  StoragePathMetadata,
  UploadJournalFileOptions,
  UploadResult,
  ValidatedFile,
} from "./types";

import { StorageError } from "./types";
import { validateFileAsync } from "./validation";

/**
 * Maps every supported file category to its storage folder.
 */
const CATEGORY_FOLDER_MAP = {
  MANUSCRIPT: STORAGE_FOLDERS.SUBMISSIONS,
  REVISION: STORAGE_FOLDERS.REVISIONS,
  RESPONSE_LETTER: STORAGE_FOLDERS.REVISIONS,
  REVIEW_ATTACHMENT: STORAGE_FOLDERS.REVIEWS,
  COPYEDITED: STORAGE_FOLDERS.COPYEDITING,
  TYPESET: STORAGE_FOLDERS.TYPESETTING,
  PROOF: STORAGE_FOLDERS.PROOFREADING,
  FINAL_ARTICLE: STORAGE_FOLDERS.PUBLICATIONS,
  SUPPLEMENTARY: STORAGE_FOLDERS.SUPPLEMENTARY,
  PDF_GALLEY: STORAGE_FOLDERS.PUBLICATIONS,
  HTML_GALLEY: STORAGE_FOLDERS.PUBLICATIONS,
  XML_GALLEY: STORAGE_FOLDERS.PUBLICATIONS,
} as const satisfies Record<FileCategory, StorageFolder>;

/**
 * Characters permitted inside individual storage path segments.
 */
const UNSAFE_PATH_CHARACTERS = /[^a-zA-Z0-9._-]/g;

/**
 * Repeated hyphens in path segments.
 */
const REPEATED_HYPHENS = /-+/g;

/**
 * Produces a safe object-storage path segment.
 *
 * Examples:
 *
 * "Journal ABC"     -> "journal-abc"
 * "submission/123"  -> "submission-123"
 */
export function sanitizeStoragePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(UNSAFE_PATH_CHARACTERS, "-")
    .replace(REPEATED_HYPHENS, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .toLowerCase();

  if (!sanitized) {
    throw new StorageError(
      "INVALID_STORAGE_PATH",
      "A storage path contains an invalid or empty segment.",
      400,
      {
        value,
      },
    );
  }

  return sanitized;
}

/**
 * Adds an optional path segment when a value has been supplied.
 */
function addOptionalSegment(
  segments: string[],
  prefix: string,
  value: string | number | undefined,
): void {
  if (value === undefined || value === null || value === "") {
    return;
  }

  const sanitizedValue = sanitizeStoragePathSegment(String(value));

  segments.push(`${prefix}-${sanitizedValue}`);
}

/**
 * Returns the default access level for a file category.
 */
export function getDefaultFileVisibility(
  category: FileCategory,
): FileVisibility {
  if ((PUBLIC_FILE_TYPES as readonly string[]).includes(category)) {
    return "public";
  }

  if ((PRIVATE_FILE_TYPES as readonly string[]).includes(category)) {
    return "private";
  }

  /**
   * Secure default: an unknown category should never become public
   * accidentally.
   */
  return "private";
}

/**
 * Confirms that an explicitly supplied visibility is compatible with the
 * file category.
 *
 * Publication files may be public. Editorial and peer-review files must stay
 * private.
 */
export function assertValidVisibility(
  category: FileCategory,
  visibility: FileVisibility,
): void {
  const isPrivateCategory = (PRIVATE_FILE_TYPES as readonly string[]).includes(
    category,
  );

  if (isPrivateCategory && visibility === "public") {
    throw new StorageError(
      "INVALID_STORAGE_PATH",
      `${category.toLowerCase().replaceAll("_", " ")} files cannot be uploaded as public files.`,
      400,
      {
        category,
        visibility,
      },
    );
  }
}

/**
 * Creates a structured Vercel Blob pathname.
 *
 * Example:
 *
 * submissions/
 * tenant-abc/
 * journal-123/
 * submission-456/
 * version-2/
 * manuscript-uuid.docx
 */
export function buildStoragePath(
  metadata: StoragePathMetadata,
  validatedFile: ValidatedFile,
): string {
  const folder = CATEGORY_FOLDER_MAP[metadata.category];

  if (!folder) {
    throw new StorageError(
      "INVALID_STORAGE_PATH",
      "No storage folder is configured for this file category.",
      400,
      {
        category: metadata.category,
      },
    );
  }

  const segments: string[] = [folder];

  addOptionalSegment(segments, "tenant", metadata.tenantId);

  addOptionalSegment(segments, "journal", metadata.journalId);

  addOptionalSegment(segments, "submission", metadata.submissionId);

  addOptionalSegment(segments, "assignment", metadata.assignmentId);

  addOptionalSegment(segments, "article", metadata.articleId);

  addOptionalSegment(segments, "issue", metadata.issueId);

  addOptionalSegment(segments, "round", metadata.reviewRound);

  addOptionalSegment(segments, "version", metadata.versionNumber);

  segments.push(validatedFile.uniqueFilename);

  return segments.join("/");
}

/**
 * Returns the correct Vercel Blob token for the requested visibility.
 *
 * Recommended environment variables:
 *
 * BLOB_PRIVATE_READ_WRITE_TOKEN
 * BLOB_PUBLIC_READ_WRITE_TOKEN
 *
 * BLOB_READ_WRITE_TOKEN is supported as a fallback so the application can
 * initially operate with one connected Blob store.
 */
function getBlobToken(visibility: FileVisibility): string | undefined {
  if (visibility === "private") {
    return (
      process.env.BLOB_PRIVATE_READ_WRITE_TOKEN ||
      process.env.BLOB_READ_WRITE_TOKEN
    );
  }

  return (
    process.env.BLOB_PUBLIC_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN
  );
}

/**
 * Uploads a validated journal file to Vercel Blob.
 *
 * This is the primary upload function for the entire platform.
 */
export async function uploadJournalFile({
  file,
  category,
  visibility: requestedVisibility,
  metadata,
  maxSize,
  additionalAllowedExtensions = [],
  allowOverwrite = false,
}: UploadJournalFileOptions): Promise<UploadResult> {
  const visibility = requestedVisibility ?? getDefaultFileVisibility(category);

  assertValidVisibility(category, visibility);

  if (metadata.category !== category) {
    throw new StorageError(
      "INVALID_STORAGE_PATH",
      "The upload category does not match the storage metadata category.",
      400,
      {
        uploadCategory: category,
        metadataCategory: metadata.category,
      },
    );
  }

  const validatedFile = await validateFileAsync({
    file,
    category,
    maxSize,
    additionalAllowedExtensions,
  });

  const pathname = buildStoragePath(metadata, validatedFile);

  const token = getBlobToken(visibility);

  if (!token) {
    throw new StorageError(
      "UPLOAD_FAILED",
      `The ${visibility} Vercel Blob storage token is not configured.`,
      500,
      {
        visibility,
      },
    );
  }
  logger.info("Uploading journal file", {
    event: "JOURNAL_FILE_UPLOAD_STARTED",
    category,
    visibility,
    pathname,
    originalFilename: validatedFile.originalFilename,
    size: validatedFile.size,
  });

  try {
    const blob = await put(pathname, file, {
      access: visibility,
      token,
      allowOverwrite,
      addRandomSuffix: false,
      contentType: validatedFile.mimeType || "application/octet-stream",

      /**
       * Multipart uploads are better suited to the larger production
       * and supplementary files accepted by the platform.
       */
      multipart: validatedFile.size > 5 * 1024 * 1024,
    });

    logger.info("Journal file uploaded", {
      event: "JOURNAL_FILE_UPLOADED",
      category,
      visibility,
      pathname,
      blobUrl: blob.url,
      size: validatedFile.size,
    });

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      originalFilename: validatedFile.originalFilename,
      storedFilename: validatedFile.uniqueFilename,
      size: validatedFile.size,
      mimeType: validatedFile.mimeType,
      extension: validatedFile.extension,
      category,
      visibility,
    };
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }

    logger.error("Vercel Blob upload failed", {
      pathname,
      category,
      visibility,
      originalFilename: validatedFile.originalFilename,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new StorageError(
      "UPLOAD_FAILED",
      "The file could not be uploaded. Please try again.",
      500,
      {
        pathname,
        category,
        visibility,
        cause: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

/**
 * Deletes a stored Blob using its URL or pathname.
 *
 * Only call this after confirming that the database record can safely be
 * removed or replaced.
 */
export async function deleteJournalFile(
  urlOrPathname: string,
  visibility: FileVisibility = "private",
): Promise<void> {
  const normalizedValue = urlOrPathname.trim();

  if (!normalizedValue) {
    throw new StorageError(
      "FILE_NOT_FOUND",
      "A file URL or storage pathname is required.",
    );
  }

  const token = getBlobToken(visibility);

  if (!token) {
    throw new StorageError(
      "UPLOAD_FAILED",
      `The ${visibility} Vercel Blob storage token is not configured.`,
      500,
      {
        visibility,
      },
    );
  }

  try {
    await del(normalizedValue, {
      token,
    });
    logger.info("Journal file deleted", {
      event: "JOURNAL_FILE_DELETED",
      visibility,
      urlOrPathname: normalizedValue,
    });
  } catch (error) {
    logger.error("Vercel Blob deletion failed", {
      urlOrPathname: normalizedValue,
      visibility,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new StorageError(
      "UPLOAD_FAILED",
      "The stored file could not be deleted.",
      500,
      {
        urlOrPathname: normalizedValue,
        visibility,
        cause: error instanceof Error ? error.message : String(error),
      },
    );
  }
}
