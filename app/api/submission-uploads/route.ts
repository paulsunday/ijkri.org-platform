import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { hasRequiredRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { logger } from "@/lib/logger";
import { getBlobToken } from "@/lib/storage/blob";
import {
  MANUSCRIPT_CONTENT_TYPES,
  MAX_MANUSCRIPT_SIZE,
  isAllowedManuscriptFilename,
  pendingManuscriptPrefix,
} from "@/lib/storage/manuscript-direct-upload";

/**
 * Issues short-lived tokens so a signed-in author's browser can upload a
 * manuscript straight to private Blob storage. Only the author's own
 * pending folder, PDF/DOC/DOCX, and files up to 20 MB are allowed.
 */
export async function POST(request: Request) {
  const token = getBlobToken("private");

  if (!token) {
    logger.error("Manuscript upload token requested but Blob is not configured");
    return NextResponse.json(
      { error: "File uploads are not available right now." },
      { status: 500 },
    );
  }

  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();

        if (!user || !hasRequiredRole(user.roles, AUTHOR_ROLES)) {
          throw new Error("Please sign in as an author to upload a manuscript.");
        }

        if (
          pathname.includes("..") ||
          !pathname.startsWith(pendingManuscriptPrefix(user.id)) ||
          !isAllowedManuscriptFilename(pathname)
        ) {
          throw new Error("Only PDF, DOC, and DOCX manuscript files are accepted.");
        }

        return {
          allowedContentTypes: MANUSCRIPT_CONTENT_TYPES,
          maximumSizeInBytes: MAX_MANUSCRIPT_SIZE,
          addRandomSuffix: true,
          // Long enough for a 20 MB upload on a slow connection.
          validUntil: Date.now() + 30 * 60 * 1000,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.warn("Manuscript upload token refused", {
      event: "MANUSCRIPT_UPLOAD_TOKEN_REFUSED",
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The upload could not be started.",
      },
      { status: 400 },
    );
  }
}
