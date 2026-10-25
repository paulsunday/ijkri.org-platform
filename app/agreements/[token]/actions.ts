"use server";

import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { hashAgreementToken } from "@/lib/agreements/send-agreement";
import { recordAgreementSignature } from "@/lib/agreements/sign-agreement";
import { assertHoneypotEmpty } from "@/lib/security/honeypot";
import {
  getClientIp,
  getClientUserAgent,
} from "@/lib/security/client-request-info";

export async function signAgreementByToken(formData: FormData) {
  const token = String(formData.get("token") || "").trim();

  if (!token) {
    redirect(`/agreements/${token}`);
  }

  assertHoneypotEmpty(formData, { event: "AGREEMENT_SIGNING" });

  const consent = formData.get("consent") === "on";
  const typedLegalName = String(
    formData.get("typedLegalName") || "",
  ).trim();

  if (!consent) {
    redirect(
      `/agreements/${token}?error=${encodeURIComponent(
        "You must confirm that you agree to the terms before signing.",
      )}`,
    );
  }

  if (!typedLegalName) {
    redirect(
      `/agreements/${token}?error=${encodeURIComponent(
        "Please type your full legal name to sign.",
      )}`,
    );
  }

  const signature = await prisma.agreementSignature.findUnique({
    where: { tokenHash: hashAgreementToken(token) },
  });

  if (!signature) {
    redirect(`/agreements/${token}`);
  }

  try {
    await recordAgreementSignature({
      signatureId: signature.id,
      typedLegalName,
      ipAddress: await getClientIp(),
      userAgent: await getClientUserAgent(),
    });
  } catch (error) {
    logger.error("Agreement signing failed", error, {
      event: "AGREEMENT_SIGNING_FAILED",
      signatureId: signature.id,
    });

    redirect(
      `/agreements/${token}?error=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "The agreement could not be signed. Please try again.",
      )}`,
    );
  }

  redirect(`/agreements/${token}`);
}
