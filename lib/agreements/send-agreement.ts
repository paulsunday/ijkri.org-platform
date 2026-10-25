import { createHash, randomBytes } from "node:crypto";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { agreementSigningRequestEmail } from "@/lib/email/templates";

import {
  AGREEMENT_TEMPLATE_VERSION,
  buildAgreementText,
} from "./agreement-text";

const TOKEN_EXPIRY_DAYS = 30;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashAgreementToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
}

type PendingSigner = {
  signerName: string;
  signerEmail: string;
  userId: string | null;
  submissionAuthorId: string | null;
  token: string | null;
};

/**
 * Creates and sends the publication agreement for a submission, once
 * its APC has been paid or waived.
 *
 * Idempotent: if an agreement already exists for this submission,
 * this is a no-op, so it's safe to call from every place an invoice
 * can become PAID/WAIVED (the Paystack webhook, the Paystack
 * callback, and the admin manual-payment/waiver actions) without
 * risking a duplicate agreement or duplicate emails.
 */
export async function sendPublicationAgreement(
  submissionId: string,
): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      author: {
        select: { id: true, name: true, email: true },
      },
      submissionAuthors: {
        orderBy: { sortOrder: "asc" },
      },
      journal: {
        select: {
          name: true,
          publisher: { select: { name: true } },
          settings: {
            select: {
              agreementSignatureMode: true,
              defaultLicenseType: true,
            },
          },
        },
      },
      agreement: {
        select: { id: true },
      },
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  if (submission.agreement) {
    return;
  }

  const signatureMode =
    submission.journal.settings?.agreementSignatureMode ??
    "CORRESPONDING_AUTHOR_ONLY";

  const licenseType =
    submission.journal.settings?.defaultLicenseType ?? "CC_BY_4";

  const correspondingAuthor =
    submission.submissionAuthors.find(
      (author) => author.isCorresponding,
    ) ?? null;

  const agreementText = buildAgreementText({
    licenseType,
    journalName: submission.journal.name,
    publisherName:
      submission.journal.publisher?.name ?? submission.journal.name,
    manuscriptTitle: submission.title,
    manuscriptDisplayId: submission.displayId ?? submission.id,
    correspondingAuthorName:
      correspondingAuthor?.fullName ?? submission.author.name,
  });

  const signers: PendingSigner[] =
    signatureMode === "ALL_AUTHORS" &&
    submission.submissionAuthors.length > 0
      ? submission.submissionAuthors.map((author) => ({
          signerName: author.fullName,
          signerEmail: author.email ?? "",
          userId: null,
          submissionAuthorId: author.id,
          token: author.email ? generateToken() : null,
        }))
      : [
          {
            signerName: submission.author.name,
            signerEmail: submission.author.email,
            userId: submission.author.id,
            submissionAuthorId: null,
            token: null,
          },
        ];

  const tokenExpiresAt = new Date();
  tokenExpiresAt.setUTCDate(
    tokenExpiresAt.getUTCDate() + TOKEN_EXPIRY_DAYS,
  );

  await prisma.$transaction(async (tx) => {
    const agreement = await tx.publicationAgreement.create({
      data: {
        submissionId,
        licenseType,
        signatureMode,
        templateVersion: AGREEMENT_TEMPLATE_VERSION,
        agreementText,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await tx.agreementSignature.createMany({
      data: signers.map((signer) => ({
        agreementId: agreement.id,
        submissionAuthorId: signer.submissionAuthorId,
        userId: signer.userId,
        signerName: signer.signerName,
        signerEmail: signer.signerEmail,
        tokenHash: signer.token
          ? hashAgreementToken(signer.token)
          : null,
        tokenExpiresAt: signer.token ? tokenExpiresAt : null,
      })),
    });
  });

  const appUrl = getAppUrl();

  await Promise.all(
    signers
      .filter((signer) => signer.signerEmail)
      .map(async (signer) => {
        const signingUrl = signer.userId
          ? `${appUrl}/author/submissions/${submissionId}/agreement`
          : `${appUrl}/agreements/${signer.token}`;

        const emailContent = agreementSigningRequestEmail({
          signerName: signer.signerName,
          journalName: submission.journal.name,
          manuscriptTitle: submission.title,
          manuscriptDisplayId: submission.displayId ?? submission.id,
          signingUrl,
        });

        try {
          await sendEmail({
            to: signer.signerEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });
        } catch (error) {
          logger.error(
            "Agreement signing request email failed",
            error,
            {
              event: "AGREEMENT_EMAIL_FAILED",
              submissionId,
              signerEmail: signer.signerEmail,
            },
          );
        }
      }),
  );
}
