import "server-only";

import { get } from "@vercel/blob";

import { getBlobToken, sanitizeStoragePathSegment } from "./blob";
import { validateFileSignature } from "./file-signature";
import type { UploadResult } from "./types";
import { getFileExtension } from "./validation";

/*
 * Manuscripts are uploaded straight from the browser to Vercel Blob,
 * because a server action only accepts a 1 MB body (and Vercel caps any
 * request at ~4.5 MB). The browser gets a short-lived token from
 * /api/submission-uploads, then the submit action receives only the
 * uploaded file's reference and verifies it here.
 */

export const MAX_MANUSCRIPT_SIZE = 20 * 1024 * 1024;

// Without the leading dot, matching getFileExtension().
export const MANUSCRIPT_EXTENSIONS = ["pdf", "doc", "docx"];

export const MANUSCRIPT_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];

const SIGNATURE_BYTES = 4 * 1024 * 1024;

/** Every pending upload for a user must live under this folder. */
export function pendingManuscriptPrefix(userId: string): string {
  return `submissions/pending/user-${sanitizeStoragePathSegment(userId)}/`;
}

export function isAllowedManuscriptFilename(filename: string): boolean {
  return MANUSCRIPT_EXTENSIONS.includes(getFileExtension(filename));
}

async function readFirstBytes(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < limit) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(Math.min(total, limit));
  let offset = 0;

  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset);
    bytes.set(part, offset);
    offset += part.length;
    if (offset >= bytes.length) break;
  }

  return bytes;
}

/**
 * Confirms a browser-uploaded manuscript belongs to this user, exists,
 * is within the size limit, and really is a PDF/DOC/DOCX. Throws an
 * Error with an author-friendly message otherwise.
 */
export async function verifyPendingManuscriptUpload({
  pathname,
  originalFilename,
  userId,
}: {
  pathname: string;
  originalFilename: string;
  userId: string;
}): Promise<UploadResult> {
  if (
    !pathname ||
    pathname.includes("..") ||
    !pathname.startsWith(pendingManuscriptPrefix(userId))
  ) {
    throw new Error("Please upload the manuscript file again.");
  }

  const extension = getFileExtension(originalFilename);

  if (
    !isAllowedManuscriptFilename(originalFilename) ||
    getFileExtension(pathname) !== extension
  ) {
    throw new Error("Only PDF, DOC, and DOCX manuscript files are accepted.");
  }

  const token = getBlobToken("private");

  if (!token) {
    throw new Error(
      "File uploads are not available right now. Please try again later.",
    );
  }

  const result = await get(pathname, {
    access: "private",
    token,
    useCache: false,
  }).catch(() => null);

  if (!result || result.statusCode !== 200) {
    throw new Error(
      "The uploaded manuscript could not be found. Please upload it again.",
    );
  }

  const { blob } = result;

  if (blob.size === 0) {
    await result.stream.cancel().catch(() => undefined);
    throw new Error("The manuscript file is empty.");
  }

  if (blob.size > MAX_MANUSCRIPT_SIZE) {
    await result.stream.cancel().catch(() => undefined);
    throw new Error("The manuscript file must not exceed 20 MB.");
  }

  const head = await readFirstBytes(result.stream, SIGNATURE_BYTES);

  try {
    await validateFileSignature(
      new File([head], originalFilename),
      extension,
    );
  } catch {
    throw new Error(
      "The manuscript file does not look like a valid PDF, DOC, or DOCX file.",
    );
  }

  return {
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    pathname: blob.pathname,
    originalFilename,
    storedFilename: blob.pathname.split("/").pop() ?? blob.pathname,
    size: blob.size,
    mimeType: blob.contentType,
    extension,
    category: "MANUSCRIPT",
    visibility: "private",
  };
}
