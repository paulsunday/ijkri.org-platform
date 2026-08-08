import { createHash } from "node:crypto";
import { redirect } from "next/navigation";

import { sendEmail } from "@/lib/email/send-email";
import { welcomeEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

type Props = {
    params: Promise<{
        token: string;
    }>;
};

export default async function ActivateAccountPage({ params }: Props) {
    const { token } = await params;

    if (!token) {
        redirect("/login?error=invalidActivation");
    }

    const tokenHash = hashToken(token);

    try {
        await enforceRateLimit("account-activation", tokenHash);
    } catch (error) {
        logger.warn("Account activation blocked by rate limiter", {
            event: "ACCOUNT_ACTIVATION_RATE_LIMITED",
            identifier: tokenHash,
            error: error instanceof Error ? error.message : String(error),
        });

        redirect("/login?error=tooManyActivationAttempts");
    }

    const activation = await prisma.passwordResetToken.findUnique({
        where: {
            tokenHash,
        },
        select: {
            id: true,
            userId: true,
            usedAt: true,
            expiresAt: true,
        },
    });

    if (
        !activation ||
        activation.usedAt ||
        activation.expiresAt <= new Date()
    ) {
        redirect("/login?error=activationExpired");
    }

    const activated = await prisma.$transaction(async (tx) => {
        /*
         * Claim the token atomically. Only one concurrent request
         * can change an unused and unexpired token.
         */
        const claimedToken = await tx.passwordResetToken.updateMany({
            where: {
                id: activation.id,
                usedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
            data: {
                usedAt: new Date(),
            },
        });

        if (claimedToken.count !== 1) {
            return null;
        }

        const activatedUser = await tx.user.update({
            where: {
                id: activation.userId,
            },
            data: {
                emailVerified: new Date(),
                isActive: true,
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: activation.userId,
                action: "UPDATE",
                entity: "User",
                entityId: activation.userId,
                metadata: {
                    event: "ACCOUNT_ACTIVATED",
                },
            },
        });

        return activatedUser;
    });

    if (!activated) {
        redirect("/login?error=activationExpired");
    }

    /*
     * The token claim above is atomic (updateMany on usedAt: null), so
     * this branch runs at most once per account — no separate
     * "welcome email sent" flag is needed to avoid duplicates.
     */
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
        /\/+$/,
        "",
    );

    const welcomeEmailContent = welcomeEmail({
        name: activated.name,
        appUrl,
    });

    try {
        await sendEmail({
            to: activated.email,
            subject: welcomeEmailContent.subject,
            html: welcomeEmailContent.html,
            text: welcomeEmailContent.text,
        });
    } catch (error) {
        logger.error("Welcome email failed", error, {
            event: "WELCOME_EMAIL_FAILED",
            userId: activated.id,
            email: activated.email,
        });
    }

    redirect("/login?accountActivated=true");
}