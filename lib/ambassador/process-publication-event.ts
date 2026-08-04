import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { creditWallet } from "@/lib/ambassador/wallet";
import { getRewardSettings } from "@/lib/ambassador/reward-settings";
import { recordReferralEvent } from "@/lib/ambassador/referral-events";
import { calculateAmbassadorLevel } from "@/lib/ambassador/levels";
import { issueAmbassadorCertificate } from "@/lib/ambassador/issue-certificate";
import { LEVEL_LABELS } from "@/lib/ambassador/levels";
import { sendEmail } from "@/lib/email/send-email";
import {
  referralPublishedEmail,
  ambassadorLevelUpEmail,
} from "@/lib/email/templates";
import { recalculateReviewerScore } from "@/lib/scoring/record-score";
import { resolveActiveCampaignBonus } from "@/lib/campaigns/resolve-active-campaign";
import { applyCampaignBonus } from "@/lib/campaigns/apply-campaign-bonus";
import type { AmbassadorLevel, CertificateType } from "@/lib/generated/prisma";

const LEVEL_CERTIFICATE_TYPE: Partial<
  Record<AmbassadorLevel, CertificateType>
> = {
  BRONZE: "BRONZE_AMBASSADOR",
  SILVER: "SILVER_AMBASSADOR",
  GOLD: "GOLD_AMBASSADOR",
  PLATINUM: "PLATINUM_AMBASSADOR",
};

/**
 * Runs from the after() hook in app/admin/articles/actions.ts once an
 * article transitions to PUBLISHED. Re-fetches the submission (never
 * trusts a stale closure across the after() boundary) and, only if it
 * was referred by an ambassador, credits the publication reward,
 * recalculates the ambassador's level, and issues a certificate on
 * level-up. Never throws — publication itself already committed and
 * must not be undone by a failure here.
 */
export async function processAmbassadorPublicationEvent(input: {
  articleId: string;
  submissionId: string | null;
}): Promise<void> {
  if (!input.submissionId) {
    return;
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        title: true,
        journalId: true,
        status: true,
        referrerReviewerId: true,
        manuscriptType: true,
        author: { select: { country: true, affiliation: true } },
      },
    });

    if (!submission?.referrerReviewerId || submission.status !== "PUBLISHED") {
      return;
    }

    const reviewerId = submission.referrerReviewerId;

    const ambassador = await prisma.reviewerAmbassador.findUnique({
      where: { userId: reviewerId },
      select: {
        id: true,
        level: true,
        wallet: { select: { id: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!ambassador) {
      return;
    }

    const rewardSettings = await getRewardSettings(submission.journalId);

    let leveledUpTo: AmbassadorLevel | null = null;
    let certificateIssued = false;

    await prisma.$transaction(async (tx) => {
      if (ambassador.wallet) {
        await creditWallet(tx, {
          walletId: ambassador.wallet.id,
          type: "PUBLICATION_REWARD",
          amount: rewardSettings.publicationReward,
          idempotencyKey: `PUBLICATION_REWARD:${submission.id}`,
          sourceType: "Submission",
          sourceId: submission.id,
          description: `Referred manuscript "${submission.title}" was published`,
        });

        const campaignBonus = await resolveActiveCampaignBonus({
          journalId: submission.journalId,
          rewardType: "PUBLICATION_REWARD",
          baseAmount: rewardSettings.publicationReward,
          manuscriptType: submission.manuscriptType,
          referredCountry: submission.author.country,
          referredAffiliation: submission.author.affiliation,
        });

        if (campaignBonus) {
          await applyCampaignBonus(tx, {
            walletId: ambassador.wallet.id,
            walletTransactionType: "PUBLICATION_REWARD",
            bonus: campaignBonus,
            sourceType: "Submission",
            sourceId: submission.id,
            description: "Referral campaign bonus for this publication",
          });
        }
      }

      await recordReferralEvent(tx, {
        reviewerId,
        submissionId: submission.id,
        stage: "PUBLISHED",
      });

      const publishedReferralCount = await tx.submission.count({
        where: { referrerReviewerId: reviewerId, status: "PUBLISHED" },
      });

      const totalReferralCount = await tx.submission.count({
        where: { referrerReviewerId: reviewerId },
      });

      const newLevel = calculateAmbassadorLevel(publishedReferralCount);
      const leveledUp = newLevel !== ambassador.level;

      await tx.reviewerAmbassador.update({
        where: { id: ambassador.id },
        data: {
          publishedReferralCount,
          totalReferralCount,
          level: newLevel,
          levelAchievedAt: leveledUp ? new Date() : undefined,
        },
      });

      await tx.notification.create({
        data: {
          userId: reviewerId,
          type: "PUBLICATION",
          title: "A referred manuscript was published",
          message: `"${submission.title}" — referred through your link — has been published.`,
          link: "/reviewer/referrals",
        },
      });

      const certificateType = LEVEL_CERTIFICATE_TYPE[newLevel];

      if (leveledUp && certificateType) {
        const certificate = await issueAmbassadorCertificate(tx, {
          ambassadorId: ambassador.id,
          type: certificateType,
        });

        if (certificate.created) {
          leveledUpTo = newLevel;
          certificateIssued = true;

          await tx.notification.create({
            data: {
              userId: reviewerId,
              type: "GENERAL",
              title: "You reached a new ambassador level",
              message: `Congratulations — you are now a ${LEVEL_LABELS[newLevel]}. Your certificate is ready to download.`,
              link: "/reviewer/certificates",
            },
          });
        }
      }
    });

    revalidateTag("leaderboard", "minutes");

    await recalculateReviewerScore(ambassador.id);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
      /\/+$/,
      "",
    );

    try {
      const publishedEmailContent = referralPublishedEmail({
        reviewerName: ambassador.user.name,
        manuscriptTitle: submission.title,
        referralCentreUrl: `${appUrl}/reviewer/referrals`,
      });

      await sendEmail({
        to: ambassador.user.email,
        subject: publishedEmailContent.subject,
        html: publishedEmailContent.html,
        text: publishedEmailContent.text,
      });
    } catch (error) {
      logger.error("Referral publication email failed", error, {
        event: "REFERRAL_PUBLICATION_EMAIL_FAILED",
        reviewerId,
        submissionId: submission.id,
      });
    }

    if (certificateIssued && leveledUpTo) {
      try {
        const levelUpEmailContent = ambassadorLevelUpEmail({
          reviewerName: ambassador.user.name,
          levelLabel: LEVEL_LABELS[leveledUpTo],
          certificatesUrl: `${appUrl}/reviewer/certificates`,
        });

        await sendEmail({
          to: ambassador.user.email,
          subject: levelUpEmailContent.subject,
          html: levelUpEmailContent.html,
          text: levelUpEmailContent.text,
        });
      } catch (error) {
        logger.error("Ambassador level-up email failed", error, {
          event: "AMBASSADOR_LEVEL_UP_EMAIL_FAILED",
          reviewerId,
        });
      }
    }
  } catch (error) {
    logger.error("Ambassador publication event processing failed", error, {
      event: "AMBASSADOR_PUBLICATION_EVENT_FAILED",
      articleId: input.articleId,
      submissionId: input.submissionId,
    });
  }
}
