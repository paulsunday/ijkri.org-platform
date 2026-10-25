import { createHash } from "node:crypto";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { agreementFullySignedEmail } from "@/lib/email/templates";
import { notifyStaffActionNeeded } from "@/lib/notifications/notify-staff";
import { sendChatNotification } from "@/lib/notifications/notify-webhook";
import { uploadJournalFile } from "@/lib/storage/blob";

import { renderSignedAgreementPdf } from "./render-signed-agreement-pdf";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export type RecordAgreementSignatureInput = {
  signatureId: string;
  typedLegalName: string;
  ipAddress: string | null;
  userAgent: string | null;
};

/**
 * Records one signer's consent + typed legal name on an agreement.
 * When this is the last outstanding signature, finalizes the
 * agreement: renders the signed PDF, hashes it, stores it, and
 * notifies the author, staff, and chat.
 */
export async function recordAgreementSignature(
  input: RecordAgreementSignatureInput,
): Promise<void> {
  const signature = await prisma.agreementSignature.findUnique({
    where: { id: input.signatureId },
  });

  if (!signature) {
    throw new Error("Signature record not found.");
  }

  if (signature.signedAt) {
    throw new Error(
      "This agreement has already been signed by this signer.",
    );
  }

  const trimmedName = input.typedLegalName.trim();

  if (!trimmedName) {
    throw new Error("Please type your full legal name.");
  }

  await prisma.agreementSignature.update({
    where: { id: signature.id },
    data: {
      typedLegalName: trimmedName,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      signedAt: new Date(),
    },
  });

  const remaining = await prisma.agreementSignature.count({
    where: {
      agreementId: signature.agreementId,
      signedAt: null,
    },
  });

  if (remaining > 0) {
    await prisma.publicationAgreement.update({
      where: { id: signature.agreementId },
      data: { status: "PARTIALLY_SIGNED" },
    });

    return;
  }

  await finalizeAgreement(signature.agreementId);
}

async function finalizeAgreement(agreementId: string): Promise<void> {
  const agreement = await prisma.publicationAgreement.findUnique({
    where: { id: agreementId },
    include: {
      signatures: true,
      submission: {
        include: {
          journal: { select: { id: true, name: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!agreement) {
    return;
  }

  const manuscriptDisplayId =
    agreement.submission.displayId ?? agreement.submission.id;

  const pdfBytes = await renderSignedAgreementPdf({
    manuscriptDisplayId,
    manuscriptTitle: agreement.submission.title,
    journalName: agreement.submission.journal.name,
    agreementText: agreement.agreementText,
    signers: agreement.signatures.map((signer) => ({
      signerName: signer.signerName,
      signerEmail: signer.signerEmail,
      typedLegalName: signer.typedLegalName ?? signer.signerName,
      signedAt: signer.signedAt ?? new Date(),
      ipAddress: signer.ipAddress,
    })),
  });

  const sha256 = createHash("sha256")
    .update(pdfBytes)
    .digest("hex");

  const file = new File(
    [Buffer.from(pdfBytes)],
    `agreement-${manuscriptDisplayId}.pdf`,
    { type: "application/pdf" },
  );

  const upload = await uploadJournalFile({
    file,
    category: "AGREEMENT",
    visibility: "private",
    metadata: {
      category: "AGREEMENT",
      journalId: agreement.submission.journalId,
      submissionId: agreement.submissionId,
    },
  });

  await prisma.publicationAgreement.update({
    where: { id: agreement.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      pdfFileUrl: upload.url,
      pdfSha256: sha256,
    },
  });

  await prisma.notification.create({
    data: {
      userId: agreement.submission.author.id,
      type: "AGREEMENT",
      title: "Publication agreement fully signed",
      message: `The publication agreement for "${agreement.submission.title}" has been signed by all required signers.`,
      link: `/author/submissions/${agreement.submissionId}`,
    },
  });

  await notifyStaffActionNeeded(prisma, {
    journalId: agreement.submission.journalId,
    type: "AGREEMENT",
    title: "Publication agreement fully signed",
    message: `${manuscriptDisplayId}: "${agreement.submission.title}" is fully signed and ready for production.`,
    link: `/admin/submissions/${agreement.submissionId}`,
  });

  const appUrl = getAppUrl();

  const emailContent = agreementFullySignedEmail({
    authorName: agreement.submission.author.name,
    journalName: agreement.submission.journal.name,
    manuscriptTitle: agreement.submission.title,
    manuscriptDisplayId,
    submissionUrl: `${appUrl}/author/submissions/${agreement.submissionId}`,
  });

  try {
    await sendEmail({
      to: agreement.submission.author.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (error) {
    logger.error("Agreement fully-signed email failed", error, {
      event: "AGREEMENT_SIGNED_EMAIL_FAILED",
      submissionId: agreement.submissionId,
    });
  }

  await sendChatNotification({
    title: "Agreement fully signed",
    message: `${manuscriptDisplayId}: "${agreement.submission.title}" — all signatures collected.`,
    link: `${appUrl}/admin/submissions/${agreement.submissionId}`,
  });
}
