"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";

import { sendEmail } from "@/lib/email/send-email";
import { passwordResetEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_LIFETIME_MINUTES = 30;

function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashToken(token: string) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

export async function requestPasswordReset(
    formData: FormData,
) {
    const emailAddress = normalizeEmail(
        String(formData.get("email") || ""),
    );

    if (
        !emailAddress ||
        !isValidEmail(emailAddress)
    ) {
        redirect(
            "/forgot-password?error=Enter+a+valid+email+address.",
        );
    }

    const user = await prisma.user.findUnique({
        where: {
            email: emailAddress,
        },

        select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
        },
    });

    /*
     * Return the same response whether or not the account
     * exists. This prevents account-email enumeration.
     */
    if (!user || !user.isActive) {
        redirect(
            "/forgot-password?submitted=true",
        );
    }

    const rawToken = randomBytes(32).toString(
        "hex",
    );

    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(
        Date.now() +
        RESET_TOKEN_LIFETIME_MINUTES *
        60 *
        1000,
    );

    await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.deleteMany({
            where: {
                userId: user.id,
                usedAt: null,
            },
        });

        await tx.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: user.id,
                action: "UPDATE",
                entity: "User",
                entityId: user.id,

                metadata: {
                    event: "PASSWORD_RESET_REQUESTED",
                    expiresAt: expiresAt.toISOString(),
                },
            },
        });
    });

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

    const resetUrl =
        `${appUrl}/reset-password/${rawToken}`;

    const emailContent = passwordResetEmail({
        name: user.name,
        resetUrl,
        expiresInMinutes:
            RESET_TOKEN_LIFETIME_MINUTES,
    });

    try {
        await sendEmail({
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
        });
    } catch (error) {
        console.error(
            "Password-reset email failed:",
            error,
        );

        /*
         * Do not expose delivery failure or account existence
         * to the public page.
         */
    }

    redirect(
        "/forgot-password?submitted=true",
    );
}