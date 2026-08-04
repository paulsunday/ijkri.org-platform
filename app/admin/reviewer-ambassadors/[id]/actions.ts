"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { adjustWalletBalance } from "@/lib/ambassador/wallet";
import { generateReferralCode } from "@/lib/ambassador/referral-code";
import {
  issueAmbassadorCertificate,
  CERTIFICATE_TITLES,
} from "@/lib/ambassador/issue-certificate";
import { sendEmail } from "@/lib/email/send-email";
import { certificateIssuedEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import type { CertificateType } from "@/lib/generated/prisma";

const MANUALLY_ISSUABLE_CERTIFICATE_TYPES: CertificateType[] = [
  "OUTSTANDING_REVIEWER",
  "TOP_REVIEWER",
  "TOP_AMBASSADOR",
];

async function getAmbassador(ambassadorId: string) {
  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { id: ambassadorId },
    include: {
      wallet: true,
      journal: { select: { shortName: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!ambassador) {
    throw new Error("Ambassador not found.");
  }

  return ambassador;
}

export async function adjustEarnings(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const ambassadorId = String(formData.get("ambassadorId") || "").trim();
  const amountValue = String(formData.get("amount") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!ambassadorId) {
    throw new Error("Ambassador ID is missing.");
  }

  const amount = Number(amountValue);

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Enter a non-zero adjustment amount.");
  }

  if (!reason) {
    throw new Error("Enter a reason for this adjustment.");
  }

  const ambassador = await getAmbassador(ambassadorId);

  if (!ambassador.wallet) {
    throw new Error("This ambassador does not have a wallet yet.");
  }

  await prisma.$transaction(async (tx) => {
    await adjustWalletBalance(tx, {
      walletId: ambassador.wallet!.id,
      amount,
      reason,
      createdById: admin.id,
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "AmbassadorWallet",
        entityId: ambassador.wallet!.id,
        metadata: {
          event: "AMBASSADOR_EARNINGS_ADJUSTED",
          ambassadorId,
          amount: amount.toString(),
          reason,
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: ambassador.userId,
        type: "PAYMENT",
        title: "Your wallet balance was adjusted",
        message: `An administrator adjusted your wallet balance: ${reason}`,
        link: "/reviewer/wallet",
      },
    });
  });

  revalidatePath(`/admin/reviewer-ambassadors/${ambassadorId}`);
  revalidatePath("/admin/reviewer-ambassadors");
  revalidatePath("/reviewer/wallet");
}

export async function suspendAmbassador(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const ambassadorId = String(formData.get("ambassadorId") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!ambassadorId) {
    throw new Error("Ambassador ID is missing.");
  }

  if (!reason) {
    throw new Error("Enter a reason for suspending this ambassador.");
  }

  const ambassador = await getAmbassador(ambassadorId);

  await prisma.$transaction(async (tx) => {
    await tx.reviewerAmbassador.update({
      where: { id: ambassadorId },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspendedReason: reason,
        suspendedById: admin.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "ReviewerAmbassador",
        entityId: ambassadorId,
        metadata: { event: "AMBASSADOR_SUSPENDED", reason },
      },
    });

    await tx.notification.create({
      data: {
        userId: ambassador.userId,
        type: "GENERAL",
        title: "Your ambassador account was suspended",
        message: reason,
        link: "/reviewer/referrals",
      },
    });
  });

  revalidatePath(`/admin/reviewer-ambassadors/${ambassadorId}`);
  revalidatePath("/admin/reviewer-ambassadors");
}

export async function reactivateAmbassador(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const ambassadorId = String(formData.get("ambassadorId") || "").trim();

  if (!ambassadorId) {
    throw new Error("Ambassador ID is missing.");
  }

  const ambassador = await getAmbassador(ambassadorId);

  await prisma.$transaction(async (tx) => {
    await tx.reviewerAmbassador.update({
      where: { id: ambassadorId },
      data: {
        status: "ACTIVE",
        suspendedAt: null,
        suspendedReason: null,
        suspendedById: null,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "ReviewerAmbassador",
        entityId: ambassadorId,
        metadata: { event: "AMBASSADOR_REACTIVATED" },
      },
    });

    await tx.notification.create({
      data: {
        userId: ambassador.userId,
        type: "GENERAL",
        title: "Your ambassador account was reactivated",
        message: "Your ambassador account has been reactivated by an administrator.",
        link: "/reviewer/referrals",
      },
    });
  });

  revalidatePath(`/admin/reviewer-ambassadors/${ambassadorId}`);
  revalidatePath("/admin/reviewer-ambassadors");
}

export async function regenerateReferralCode(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const ambassadorId = String(formData.get("ambassadorId") || "").trim();

  if (!ambassadorId) {
    throw new Error("Ambassador ID is missing.");
  }

  const ambassador = await getAmbassador(ambassadorId);

  const newCode = await generateReferralCode(ambassador.journal.shortName);

  await prisma.$transaction(async (tx) => {
    await tx.reviewerAmbassador.update({
      where: { id: ambassadorId },
      data: {
        referralCode: newCode,
        regeneratedCount: { increment: 1 },
      },
    });

    await tx.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "ReviewerAmbassador",
        entityId: ambassadorId,
        metadata: { event: "REFERRAL_CODE_REGENERATED" },
      },
    });

    await tx.notification.create({
      data: {
        userId: ambassador.userId,
        type: "GENERAL",
        title: "Your referral code was regenerated",
        message: `Your previous referral code is no longer valid. Your new code is ${newCode}.`,
        link: "/reviewer/referrals",
      },
    });
  });

  revalidatePath(`/admin/reviewer-ambassadors/${ambassadorId}`);
  revalidatePath("/reviewer/referrals");
}

export async function issueManualCertificate(formData: FormData) {
  const admin = await requireAnyActionRole(ADMIN_ROLES);

  const ambassadorId = String(formData.get("ambassadorId") || "").trim();
  const type = String(formData.get("type") || "").trim() as CertificateType;
  const periodLabel = String(formData.get("periodLabel") || "").trim();

  if (!ambassadorId) {
    throw new Error("Ambassador ID is missing.");
  }

  if (!MANUALLY_ISSUABLE_CERTIFICATE_TYPES.includes(type)) {
    throw new Error("Select a valid certificate type.");
  }

  const ambassador = await getAmbassador(ambassadorId);

  let certificateCreated = false;

  await prisma.$transaction(async (tx) => {
    const certificate = await issueAmbassadorCertificate(tx, {
      ambassadorId,
      type,
      periodLabel: periodLabel || undefined,
    });

    if (certificate.created) {
      certificateCreated = true;

      await tx.notification.create({
        data: {
          userId: ambassador.userId,
          type: "GENERAL",
          title: "You were awarded a certificate",
          message: "The journal administrator has issued you a certificate. It is ready to download.",
          link: "/reviewer/certificates",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: admin.id,
          action: "CREATE",
          entity: "AmbassadorCertificate",
          entityId: certificate.id,
          metadata: { event: "CERTIFICATE_MANUALLY_ISSUED", ambassadorId, type },
        },
      });
    }
  });

  if (certificateCreated) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
      /\/+$/,
      "",
    );

    const emailContent = certificateIssuedEmail({
      reviewerName: ambassador.user.name,
      certificateTitle: CERTIFICATE_TITLES[type],
      certificatesUrl: `${appUrl}/reviewer/certificates`,
    });

    try {
      await sendEmail({
        to: ambassador.user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (error) {
      logger.error("Certificate issued email failed", error, {
        event: "CERTIFICATE_ISSUED_EMAIL_FAILED",
        ambassadorId,
      });
    }
  }

  revalidatePath(`/admin/reviewer-ambassadors/${ambassadorId}`);
}
