/**
 * ============================================================================
 * Journal Platform Binary File-Signature Validation
 * ============================================================================
 *
 * Confirms that supported uploaded files contain the binary signature expected
 * for their validated filename extension.
 *
 * This validation supplements filename, extension, MIME-type, and size checks.
 */

import "server-only";

import { fileTypeFromBuffer } from "file-type";

import { StorageError } from "./types";

/**
 * Extensions that do not have a reliable binary signature or cannot be
 * sufficiently distinguished by the file-type package.
 */
const TEXT_BASED_EXTENSIONS = new Set([
    "csv",
    "html",
    "xml",
    "svg",
]);

const UNSUPPORTED_SIGNATURE_EXTENSIONS = new Set([
    "indd",
]);

/**
 * Expected detected extensions for each supported uploaded extension.
 *
 * Office Open XML files are ZIP containers, but file-type normally identifies
 * their specific formats, such as docx or xlsx.
 */
const EXPECTED_DETECTED_EXTENSIONS: Record<
    string,
    readonly string[]
> = {
    pdf: ["pdf"],

    doc: ["doc", "cfb"],
    xls: ["xls", "cfb"],

    docx: ["docx", "zip"],
    xlsx: ["xlsx", "zip"],
    idml: ["zip"],

    zip: ["zip"],
    rar: ["rar"],
    "7z": ["7z"],

    png: ["png"],
    jpg: ["jpg"],
    jpeg: ["jpg"],
    tif: ["tif"],
    tiff: ["tif"],

    epub: ["epub", "zip"],
};

/**
 * Reads only the initial part of the file.
 *
 * Magic-number detection generally needs only a small portion of the file,
 * avoiding an unnecessary full-file allocation for large uploads.
 */
async function readDetectionBuffer(
    file: File,
): Promise<Uint8Array> {
    const detectionSize = Math.min(
        file.size,
        4 * 1024 * 1024,
    );

    const arrayBuffer = await file
        .slice(0, detectionSize)
        .arrayBuffer();

    return new Uint8Array(arrayBuffer);
}

/**
 * Validates the uploaded file's binary signature against its already-validated
 * filename extension.
 */
export async function validateFileSignature(
    file: File,
    extension: string,
): Promise<void> {
    const normalizedExtension = extension
        .replace(/^\./, "")
        .trim()
        .toLowerCase();

    if (!normalizedExtension) {
        throw new StorageError(
            "INVALID_FILE_SIGNATURE",
            "The uploaded file extension is required for content verification.",
        );
    }

    /**
     * Plain-text and XML-based formats do not have dependable magic numbers.
     * Their extension, MIME type, and size are validated elsewhere.
     */
    if (
        TEXT_BASED_EXTENSIONS.has(normalizedExtension) ||
        UNSUPPORTED_SIGNATURE_EXTENSIONS.has(
            normalizedExtension,
        )
    ) {
        return;
    }

    const expectedExtensions =
        EXPECTED_DETECTED_EXTENSIONS[
        normalizedExtension
        ];

    if (!expectedExtensions) {
        throw new StorageError(
            "INVALID_FILE_SIGNATURE",
            `Binary signature validation is not configured for .${normalizedExtension} files.`,
            400,
            {
                extension: normalizedExtension,
                originalFilename: file.name,
            },
        );
    }

    const detectionBuffer =
        await readDetectionBuffer(file);

    let detected:
        | Awaited<
            ReturnType<
                typeof fileTypeFromBuffer
            >
        >
        | undefined;

    try {
        detected =
            await fileTypeFromBuffer(
                detectionBuffer,
            );
    } catch (error) {
        throw new StorageError(
            "INVALID_FILE_SIGNATURE",
            "The uploaded file content could not be verified.",
            400,
            {
                extension: normalizedExtension,
                originalFilename: file.name,
                cause:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
        );
    }

    if (!detected) {
        throw new StorageError(
            "INVALID_FILE_SIGNATURE",
            `The uploaded file does not contain a recognizable .${normalizedExtension} file signature.`,
            400,
            {
                extension: normalizedExtension,
                originalFilename: file.name,
                browserMimeType: file.type,
            },
        );
    }

    const detectedExtension =
        detected.ext.toLowerCase();

    if (
        !expectedExtensions.includes(
            detectedExtension,
        )
    ) {
        throw new StorageError(
            "INVALID_FILE_SIGNATURE",
            `The uploaded file content does not match its .${normalizedExtension} filename extension.`,
            400,
            {
                expectedExtensions,
                detectedExtension,
                detectedMimeType:
                    detected.mime,
                browserMimeType: file.type,
                originalFilename: file.name,
            },
        );
    }
}