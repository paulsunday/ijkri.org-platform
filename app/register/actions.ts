"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";

import { sendEmail } from "@/lib/email/send-email";
import { prisma } from "@/lib/prisma";
import { createAccountActivationLink } from "@/lib/auth/account-activation";
import { accountActivationEmail, referralRegisteredEmail } from "@/lib/email/templates";
import { createHash } from "node:crypto";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveReferralCode } from "@/lib/ambassador/resolve-referral";
import { recordReferralEvent } from "@/lib/ambassador/referral-events";
import { creditWallet } from "@/lib/ambassador/wallet";
import { resolveActiveCampaignBonus } from "@/lib/campaigns/resolve-active-campaign";
import { applyCampaignBonus } from "@/lib/campaigns/apply-campaign-bonus";
import { getRewardSettings } from "@/lib/ambassador/reward-settings";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function createRegistrationIdentifier(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

export async function registerUser(formData: FormData) {
  const name = String(formData.get("name") || "").trim();

  const email = normalizeEmail(String(formData.get("email") || ""));

  const password = String(formData.get("password") || "");

  const confirmPassword = String(formData.get("confirmPassword") || "");

  const affiliation = String(formData.get("affiliation") || "").trim();

  const country = String(formData.get("country") || "").trim();

  const phone = String(formData.get("phone") || "").trim();

  const orcid = String(formData.get("orcid") || "").trim();

  const acceptedTerms = String(formData.get("acceptedTerms") || "") === "true";

  if (!name) {
    redirect("/register?error=Full+name+is+required.");
  }

  if (!email || !validateEmail(email)) {
    redirect("/register?error=Enter+a+valid+email+address.");
  }

  const registrationIdentifier = createRegistrationIdentifier(email);

  try {
    await enforceRateLimit(
      "registration",
      registrationIdentifier,
    );
  } catch {
    redirect(
      "/register?error=Too+many+registration+attempts.+Please+try+again+later.",
    );
  }

  if (!validatePassword(password)) {
    redirect(
      "/register?error=Password+must+contain+at+least+8+characters,+one+uppercase+letter,+one+lowercase+letter+and+one+number.",
    );
  }

  if (password !== confirmPassword) {
    redirect("/register?error=The+passwords+do+not+match.");
  }

  if (!acceptedTerms) {
    redirect(
      "/register?error=You+must+accept+the+terms+and+publication+policies.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (existingUser) {
    redirect("/register?error=An+account+with+this+email+already+exists.");
  }

  const journal = await prisma.journal.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!journal) {
    redirect(
      "/register?error=Registration+is+temporarily+unavailable+because+no+active+journal+was+found.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const referralCodeInput = String(formData.get("referralCode") || "").trim();

  const referral = await resolveReferralCode(referralCodeInput);

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        affiliation: affiliation || null,
        country: country || null,
        phone: phone || null,
        orcid: orcid || null,
        isActive: false,
        emailVerified: null,
        passwordChangedAt: null,
        referredByReviewerId: referral?.reviewerId,
        referredByCode: referral ? referralCodeInput : null,
        referredAt: referral ? new Date() : null,
      },
    });

    await tx.userJournalRole.create({
      data: {
        userId: user.id,
        journalId: journal.id,
        role: "AUTHOR",
      },
    });

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        metadata: {
          event: "PUBLIC_USER_REGISTERED",
          email: user.email,
          journalId: journal.id,
          assignedRole: "AUTHOR",
          referredByReviewerId: referral?.reviewerId ?? null,
        },
      },
    });

    if (referral) {
      await recordReferralEvent(tx, {
        reviewerId: referral.reviewerId,
        referredUserId: user.id,
        stage: "REGISTERED",
      });

      const wallet = await tx.ambassadorWallet.findUnique({
        where: { ambassadorId: referral.ambassadorId },
        select: { id: true },
      });

      if (wallet) {
        const rewardSettings = await getRewardSettings(journal.id);

        await creditWallet(tx, {
          walletId: wallet.id,
          type: "REFERRAL_BONUS",
          amount: rewardSettings.referralBonus,
          idempotencyKey: `REFERRAL_BONUS:${user.id}`,
          sourceType: "User",
          sourceId: user.id,
          description: "New author registered through your referral link",
        });

        const campaignBonus = await resolveActiveCampaignBonus({
          journalId: journal.id,
          rewardType: "REFERRAL_BONUS",
          baseAmount: rewardSettings.referralBonus,
          referredCountry: country || null,
          referredAffiliation: affiliation || null,
        });

        if (campaignBonus) {
          await applyCampaignBonus(tx, {
            walletId: wallet.id,
            walletTransactionType: "REFERRAL_BONUS",
            bonus: campaignBonus,
            sourceType: "User",
            sourceId: user.id,
            description: "Referral campaign bonus for a new registration",
          });
        }

        await tx.notification.create({
          data: {
            userId: referral.reviewerId,
            type: "GENERAL",
            title: "Someone registered through your referral link",
            message: `${user.name} created an author account using your referral link.`,
            link: "/reviewer/referrals",
          },
        });
      }
    }

    return user;
  });

  const { activationUrl, expiresInHours } = await createAccountActivationLink(
    createdUser.id,
  );

  const emailContent = accountActivationEmail({
    name: createdUser.name,
    journalName: journal.name,
    assignedRole: "AUTHOR",
    activationUrl,
    expiresInHours,
  });

  try {
    await sendEmail({
      to: createdUser.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (error) {
    logger.error("Activation email failed", {
      userId: createdUser.id,
      email: createdUser.email,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (referral) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
      /\/+$/,
      "",
    );

    const referringReviewer = await prisma.user.findUnique({
      where: { id: referral.reviewerId },
      select: { name: true, email: true },
    });

    if (referringReviewer) {
      const referralEmailContent = referralRegisteredEmail({
        reviewerName: referringReviewer.name,
        referredName: createdUser.name,
        referralCentreUrl: `${appUrl}/reviewer/referrals`,
      });

      try {
        await sendEmail({
          to: referringReviewer.email,
          subject: referralEmailContent.subject,
          html: referralEmailContent.html,
          text: referralEmailContent.text,
        });
      } catch (error) {
        logger.error("Referral registration email failed", {
          reviewerId: referral.reviewerId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  redirect("/login?registered=true&activationRequired=true");
}
