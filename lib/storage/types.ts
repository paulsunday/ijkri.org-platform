/**
 * ============================================================================
 * Journal Platform Storage Types
 * ============================================================================
 */

import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  STORAGE_FOLDERS,
} from "./constants";

/**
 * Supported upload categories.
 *
 * These categories determine:
 * - maximum file size
 * - allowed extensions
 * - storage folder
 * - whether the file is private or public
 */
export type FileCategory =
  | "MANUSCRIPT"
  | "REVISION"
  | "RESPONSE_LETTER"
  | "REVIEW_ATTACHMENT"
  | "COPYEDITED"
  | "TYPESET"
  | "PROOF"
  | "FINAL_ARTICLE"
  | "SUPPLEMENTARY"
  | "PDF_GALLEY"
  | "HTML_GALLEY"
  | "XML_GALLEY"
  | "ISSUE_COVER";

/**
 * Storage visibility.
 */
export type FileVisibility = "private" | "public";

/**
 * Storage folder names.
 */
export type StorageFolder =
  (typeof STORAGE_FOLDERS)[keyof typeof STORAGE_FOLDERS];

/**
 * Keys used by the maximum file-size configuration.
 */
export type FileSizeCategory = keyof typeof MAX_FILE_SIZE;

/**
 * Keys used by the extension configuration.
 */
export type ExtensionCategory = keyof typeof ALLOWED_EXTENSIONS;

/**
 * Input accepted by the central file-validation service.
 */
export interface ValidateFileOptions {
  file: File;
  category: FileCategory;

  /**
   * Optional override for the configured maximum size.
   */
  maxSize?: number;

  /**
   * Optional extra extensions for a specific workflow.
   *
   * Do not include the leading period.
   *
   * Example:
   * ["pdf", "docx"]
   */
  additionalAllowedExtensions?: string[];
}

/**
 * Successful validation information.
 */
export interface ValidatedFile {
  originalFilename: string;
  sanitizedFilename: string;
  uniqueFilename: string;
  extension: string;
  mimeType: string;
  size: number;
  category: FileCategory;
}

/**
 * Validation result returned when a non-throwing API is preferred.
 */
export type FileValidationResult =
  | {
      valid: true;
      file: ValidatedFile;
      errors: [];
    }
  | {
      valid: false;
      file: null;
      errors: string[];
    };

/**
 * Metadata used to construct a structured object-storage path.
 */
export interface StoragePathMetadata {
  tenantId?: string;
  journalId?: string;
  submissionId?: string;
  assignmentId?: string;
  articleId?: string;
  issueId?: string;
  reviewRound?: number;
  versionNumber?: number;
  category: FileCategory;
}

/**
 * Options accepted by the central upload service.
 */
export interface UploadJournalFileOptions {
  file: File;
  category: FileCategory;
  visibility?: FileVisibility;

  /**
   * Metadata used to produce paths such as:
   *
   * submissions/{journalId}/{submissionId}/version-2/{filename}
   */
  metadata: StoragePathMetadata;

  /**
   * Optional configured file-size override.
   */
  maxSize?: number;

  /**
   * Optional extra allowed extensions.
   */
  additionalAllowedExtensions?: string[];

  /**
   * Whether the storage provider may replace a file with the same pathname.
   *
   * The default upload implementation should normally use false because
   * generated filenames are unique.
   */
  allowOverwrite?: boolean;
}

/**
 * Normalized result returned after a successful cloud upload.
 */
export interface UploadResult {
  url: string;
  downloadUrl?: string;
  pathname: string;
  originalFilename: string;
  storedFilename: string;
  size: number;
  mimeType: string;
  extension: string;
  category: FileCategory;
  visibility: FileVisibility;
}

/**
 * A stored file record used by download authorization helpers.
 *
 * This interface is deliberately independent of Prisma so that the storage
 * layer can remain provider-agnostic and database-agnostic.
 */
export interface StoredFileAccessContext {
  fileId?: string;
  fileUrl: string;
  journalId?: string;
  category: FileCategory;
  visibility: FileVisibility;

  submissionId?: string;
  articleId?: string;
  issueId?: string;
  assignmentId?: string;

  authorId?: string;
  reviewerId?: string;
  assigneeId?: string;

  submissionStatus?: string;
  articleStatus?: string;
  isPublished?: boolean;
}

/**
 * User information needed by download authorization helpers.
 */
export interface StorageUserContext {
  userId: string;
  roles: string[];
  journalIds?: string[];
}

/**
 * Download authorization result.
 */
export type DownloadAuthorizationResult =
  | {
      allowed: true;
      reason: null;
    }
  | {
      allowed: false;
      reason: string;
    };

/**
 * Storage-layer error codes.
 */
export type StorageErrorCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_FILENAME"
  | "INVALID_EXTENSION"
  | "BLOCKED_EXTENSION"
  | "INVALID_MIME_TYPE"
  | "INVALID_FILE_SIGNATURE"
  | "DOUBLE_EXTENSION"
  | "UPLOAD_FAILED"
  | "DOWNLOAD_FORBIDDEN"
  | "FILE_NOT_FOUND"
  | "INVALID_STORAGE_PATH";

/**
 * Standard storage-layer error.
 */
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: StorageErrorCode,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);

    this.name = "StorageError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
