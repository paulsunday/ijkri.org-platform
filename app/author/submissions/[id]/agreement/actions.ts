"use server";

import { redirect } from "next/navigation";

import { isSuperAdmin, requireAnyActionRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { recordAgreementSignature } from "@/lib/agreements/sign-agreement";
import {
  getClientIp,
  getClientUserAgent,
} from "@/lib/security/client-request-info";

export async function signAgreementAsAuthor(formData: FormData) {
  const author = await requireAnyActionRole(AUTHOR_ROLES);

  const submissionId = String(
    formData.get("submissionId") || "",
  ).trim();

  if (!submissionId) {
    throw new Error("Submission ID is missing.");
  }

  const consent = formData.get("consent") === "on";
  const typedLegalName = String(
    formData.get("typedLegalName") || "",
  ).trim();

  const redirectWithError = (message: string) => {
    redirect(
      `/author/submissions/${submissionId}/agreement?error=${encodeURIComponent(message)}`,
    );
  };

  if (!consent) {
    redirectWithError(
      "You must confirm that you agree to the terms before signing.",
    );
  }

  if (!typedLegalName) {
    redirectWithError("Please type your full legal name to sign.");
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      ...(isSuperAdmin(author) ? {} : { authorId: author.id }),
    },
    select: {
      agreement: {
        select: {
          signatures: {
            where: { userId: author.id },
            select: { id: true },
          },
        },
      },
    },
  });

  const signatureId = submission?.agreement?.signatures[0]?.id;

  if (!signatureId) {
    redirectWithError(
      "No publication agreement signature was found for your account.",
    );

    return;
  }

  try {
    await recordAgreementSignature({
      signatureId,
      typedLegalName,
      ipAddress: await getClientIp(),
      userAgent: await getClientUserAgent(),
    });
  } catch (error) {
    logger.error("Agreement signing failed", error, {
      event: "AGREEMENT_SIGNING_FAILED",
      signatureId,
    });

    redirectWithError(
      error instanceof Error
        ? error.message
        : "The agreement could not be signed. Please try again.",
    );

    return;
  }

  redirect(`/author/submissions/${submissionId}/agreement`);
}
