/**
 * ============================================================================
 * Journal Platform File Validation
 * ============================================================================
 */

import { randomUUID } from "crypto";
import { validateFileSignature } from "./file-signature";

import {
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    BLOCKED_EXTENSIONS,
    MAX_FILE_SIZE,
} from "./constants";

import {
    FileCategory,
    FileValidationResult,
    StorageError,
    ValidateFileOptions,
    ValidatedFile,
} from "./types";

/**
 * Maps each upload category to its configured extension group.
 */
const CATEGORY_EXTENSION_MAP = {
    MANUSCRIPT: ALLOWED_EXTENSIONS.MANUSCRIPT,
    REVISION: ALLOWED_EXTENSIONS.MANUSCRIPT,
    RESPONSE_LETTER: ALLOWED_EXTENSIONS.RESPONSE_LETTER,
    REVIEW_ATTACHMENT: ALLOWED_EXTENSIONS.REVIEW_ATTACHMENT,
    COPYEDITED: ALLOWED_EXTENSIONS.PRODUCTION,
    TYPESET: ALLOWED_EXTENSIONS.PRODUCTION,
    PROOF: ALLOWED_EXTENSIONS.PRODUCTION,
    FINAL_ARTICLE: ALLOWED_EXTENSIONS.PRODUCTION,
    SUPPLEMENTARY: ALLOWED_EXTENSIONS.SUPPLEMENTARY,
    PDF_GALLEY: ["pdf"],
    HTML_GALLEY: ["html"],
    XML_GALLEY: ["xml"],
} as const satisfies Record<FileCategory, readonly string[]>;

/**
 * Maps each upload category to its configured maximum size.
 */
const CATEGORY_SIZE_MAP = {
    MANUSCRIPT: MAX_FILE_SIZE.MANUSCRIPT,
    REVISION: MAX_FILE_SIZE.MANUSCRIPT,
    RESPONSE_LETTER: MAX_FILE_SIZE.RESPONSE_LETTER,
    REVIEW_ATTACHMENT: MAX_FILE_SIZE.REVIEW_ATTACHMENT,
    COPYEDITED: MAX_FILE_SIZE.COPYEDITED,
    TYPESET: MAX_FILE_SIZE.TYPESET,
    PROOF: MAX_FILE_SIZE.PROOF,
    FINAL_ARTICLE: MAX_FILE_SIZE.FINAL_ARTICLE,
    SUPPLEMENTARY: MAX_FILE_SIZE.SUPPLEMENTARY,
    PDF_GALLEY: MAX_FILE_SIZE.FINAL_ARTICLE,
    HTML_GALLEY: MAX_FILE_SIZE.FINAL_ARTICLE,
    XML_GALLEY: MAX_FILE_SIZE.FINAL_ARTICLE,
} as const satisfies Record<FileCategory, number>;

/**
 * Extension-specific MIME types.
 *
 * MIME types supplied by browsers are not always perfectly consistent.
 * For that reason, validation checks both the extension and a controlled
 * collection of acceptable MIME values.
 */
const MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
    pdf: ["application/pdf"],

    doc: [
        "application/msword",
        "application/octet-stream",
    ],

    docx: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream",
    ],

    xls: [
        "application/vnd.ms-excel",
        "application/octet-stream",
    ],

    xlsx: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/octet-stream",
    ],

    csv: [
        "text/csv",
        "application/csv",
        "text/plain",
        "application/vnd.ms-excel",
    ],

    zip: [
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
    ],

    rar: [
        "application/vnd.rar",
        "application/x-rar-compressed",
        "application/octet-stream",
    ],

    "7z": [
        "application/x-7z-compressed",
        "application/octet-stream",
    ],

    png: ["image/png"],

    jpg: ["image/jpeg"],

    jpeg: ["image/jpeg"],

    tif: [
        "image/tiff",
        "image/x-tiff",
    ],

    tiff: [
        "image/tiff",
        "image/x-tiff",
    ],

    svg: [
        "image/svg+xml",
        "text/xml",
        "application/xml",
    ],

    html: [
        "text/html",
        "application/xhtml+xml",
        "text/plain",
    ],

    xml: [
        "application/xml",
        "text/xml",
        "application/xhtml+xml",
        "text/plain",
    ],

    epub: [
        "application/epub+zip",
        "application/zip",
        "application/octet-stream",
    ],

    indd: [
        "application/octet-stream",
        "application/x-indesign",
    ],

    idml: [
        "application/octet-stream",
        "application/zip",
        "application/x-indesign-interchange",
    ],
};

/**
 * Characters that should never appear in a stored filename.
 */
const UNSAFE_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/g;

/**
 * Consecutive whitespace.
 */
const MULTIPLE_WHITESPACE = /\s+/g;

/**
 * Consecutive hyphens.
 */
const MULTIPLE_HYPHENS = /-+/g;

/**
 * Maximum length for the human-readable filename portion.
 */
const MAX_FILENAME_BASE_LENGTH = 100;

/**
 * Returns the lowercase extension without the leading period.
 */
export function getFileExtension(filename: string): string {
    const normalizedFilename = filename.trim();
    const finalPeriodIndex = normalizedFilename.lastIndexOf(".");

    if (
        finalPeriodIndex <= 0 ||
        finalPeriodIndex === normalizedFilename.length - 1
    ) {
        return "";
    }

    return normalizedFilename
        .slice(finalPeriodIndex + 1)
        .trim()
        .toLowerCase();
}

/**
 * Returns the filename without its final extension.
 */
export function getFilenameBase(filename: string): string {
    const trimmedFilename = filename.trim();
    const finalPeriodIndex = trimmedFilename.lastIndexOf(".");

    if (finalPeriodIndex <= 0) {
        return trimmedFilename;
    }

    return trimmedFilename.slice(0, finalPeriodIndex);
}

/**
 * Produces a safe human-readable filename.
 *
 * This does not create uniqueness. Use generateUniqueFilename() for the
 * final object-storage filename.
 */
export function sanitizeFilename(filename: string): string {
    const trimmedFilename = filename.trim();

    if (!trimmedFilename) {
        throw new StorageError(
            "INVALID_FILENAME",
            "The uploaded file does not have a valid filename.",
        );
    }

    const extension = getFileExtension(trimmedFilename);
    const rawBase = getFilenameBase(trimmedFilename);

    const sanitizedBase = rawBase
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(UNSAFE_FILENAME_CHARACTERS, "")
        .replace(MULTIPLE_WHITESPACE, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(MULTIPLE_HYPHENS, "-")
        .replace(/^[._-]+|[._-]+$/g, "")
        .slice(0, MAX_FILENAME_BASE_LENGTH);

    if (!sanitizedBase) {
        throw new StorageError(
            "INVALID_FILENAME",
            "The uploaded filename contains no usable characters.",
        );
    }

    if (!extension) {
        return sanitizedBase;
    }

    return `${sanitizedBase}.${extension}`;
}

/**
 * Generates a collision-resistant filename.
 */
export function generateUniqueFilename(filename: string): string {
    const sanitizedFilename = sanitizeFilename(filename);
    const extension = getFileExtension(sanitizedFilename);
    const base = getFilenameBase(sanitizedFilename);
    const uuid = randomUUID();

    if (!extension) {
        return `${base}-${uuid}`;
    }

    return `${base}-${uuid}.${extension}`;
}

/**
 * Returns the configured extensions for a category.
 */
export function getAllowedExtensions(
    category: FileCategory,
    additionalAllowedExtensions: string[] = [],
): string[] {
    const configuredExtensions = CATEGORY_EXTENSION_MAP[category];

    const normalizedAdditionalExtensions =
        additionalAllowedExtensions.map((extension) =>
            extension.replace(/^\./, "").trim().toLowerCase(),
        );

    return Array.from(
        new Set([
            ...configuredExtensions.map((extension) =>
                extension.toLowerCase(),
            ),
            ...normalizedAdditionalExtensions,
        ]),
    );
}

/**
 * Returns the configured maximum size for a category.
 */
export function getMaximumFileSize(category: FileCategory): number {
    return CATEGORY_SIZE_MAP[category];
}

/**
 * Converts bytes into a readable size for validation messages.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} bytes`;
    }

    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    const megabytes = kilobytes / 1024;

    if (megabytes < 1024) {
        return `${megabytes.toFixed(1)} MB`;
    }

    const gigabytes = megabytes / 1024;

    return `${gigabytes.toFixed(1)} GB`;
}

/**
 * Detects dangerous double-extension filenames such as:
 *
 * manuscript.pdf.exe
 * review.docx.js
 * article.pdf.scr
 */
export function hasDangerousDoubleExtension(filename: string): boolean {
    const parts = filename
        .trim()
        .toLowerCase()
        .split(".")
        .filter(Boolean);

    if (parts.length < 2) {
        return false;
    }

    return parts.some((part) =>
        (BLOCKED_EXTENSIONS as readonly string[]).includes(part),
    );
}

/**
 * Determines whether the browser-reported MIME type is acceptable.
 */
export function isAllowedMimeType(
    mimeType: string,
    extension: string,
): boolean {
    const normalizedMimeType = mimeType.trim().toLowerCase();
    const normalizedExtension = extension.trim().toLowerCase();

    /**
     * Some browsers provide an empty MIME type for uncommon formats.
     * Extension validation still applies, so an empty MIME type is accepted
     * only for formats whose MIME detection is known to be inconsistent.
     */
    if (!normalizedMimeType) {
        return ["indd", "idml"].includes(normalizedExtension);
    }

    const extensionMimeTypes =
        MIME_TYPES_BY_EXTENSION[normalizedExtension] ?? [];

    if (extensionMimeTypes.includes(normalizedMimeType)) {
        return true;
    }

    return (ALLOWED_MIME_TYPES as readonly string[]).includes(
        normalizedMimeType,
    );
}

/**
 * Throwing validation API.
 *
 * Use this in server actions and upload services.
 */
export function validateFile({
    file,
    category,
    maxSize,
    additionalAllowedExtensions = [],
}: ValidateFileOptions): ValidatedFile {
    if (!(file instanceof File)) {
        throw new StorageError(
            "INVALID_FILENAME",
            "A valid uploaded file is required.",
        );
    }

    const originalFilename = file.name.trim();

    if (!originalFilename) {
        throw new StorageError(
            "INVALID_FILENAME",
            "The uploaded file does not have a filename.",
        );
    }

    if (file.size <= 0) {
        throw new StorageError(
            "EMPTY_FILE",
            "The uploaded file is empty.",
        );
    }

    const extension = getFileExtension(originalFilename);

    if (!extension) {
        throw new StorageError(
            "INVALID_EXTENSION",
            "The uploaded file must have a valid extension.",
        );
    }

    if (
        (BLOCKED_EXTENSIONS as readonly string[]).includes(extension)
    ) {
        throw new StorageError(
            "BLOCKED_EXTENSION",
            `Files with the .${extension} extension are not permitted.`,
            400,
            {
                extension,
                originalFilename,
            },
        );
    }

    if (hasDangerousDoubleExtension(originalFilename)) {
        throw new StorageError(
            "DOUBLE_EXTENSION",
            "The uploaded filename contains a blocked or dangerous extension.",
            400,
            {
                originalFilename,
            },
        );
    }

    const allowedExtensions = getAllowedExtensions(
        category,
        additionalAllowedExtensions,
    );

    if (!allowedExtensions.includes(extension)) {
        throw new StorageError(
            "INVALID_EXTENSION",
            `The .${extension} file type is not allowed for ${category.toLowerCase().replaceAll("_", " ")} uploads. Allowed extensions: ${allowedExtensions.join(", ")}.`,
            400,
            {
                category,
                extension,
                allowedExtensions,
            },
        );
    }

    const configuredMaximumSize = maxSize ?? getMaximumFileSize(category);

    if (file.size > configuredMaximumSize) {
        throw new StorageError(
            "FILE_TOO_LARGE",
            `The uploaded file exceeds the maximum allowed size of ${formatFileSize(configuredMaximumSize)}.`,
            400,
            {
                actualSize: file.size,
                maximumSize: configuredMaximumSize,
                category,
            },
        );
    }

    if (!isAllowedMimeType(file.type, extension)) {
        throw new StorageError(
            "INVALID_MIME_TYPE",
            `The file content type "${file.type || "unknown"}" is not valid for a .${extension} file.`,
            400,
            {
                mimeType: file.type,
                extension,
                category,
            },
        );
    }

    const sanitizedFilename = sanitizeFilename(originalFilename);
    const uniqueFilename = generateUniqueFilename(sanitizedFilename);

    return {
        originalFilename,
        sanitizedFilename,
        uniqueFilename,
        extension,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        category,
    };
}

export async function validateFileAsync(
    options: ValidateFileOptions,
): Promise<ValidatedFile> {
    const validatedFile = validateFile(options);

    await validateFileSignature(
        options.file,
        validatedFile.extension,
    );

    return validatedFile;
}
/**
 * Non-throwing validation API.
 *
 * This is useful when the UI needs to display validation messages without
 * relying on exception handling.
 */
export function safeValidateFile(
    options: ValidateFileOptions,
): FileValidationResult {
    try {
        const validatedFile = validateFile(options);

        return {
            valid: true,
            file: validatedFile,
            errors: [],
        };
    } catch (error) {
        if (error instanceof StorageError) {
            return {
                valid: false,
                file: null,
                errors: [error.message],
            };
        }

        return {
            valid: false,
            file: null,
            errors: [
                error instanceof Error
                    ? error.message
                    : "The uploaded file could not be validated.",
            ],
        };
    }
}