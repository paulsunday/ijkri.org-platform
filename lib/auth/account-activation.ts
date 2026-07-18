import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const ACTIVATION_TOKEN_LIFETIME_HOURS = 24;

function hashToken(token: string) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

export async function createAccountActivationLink(
    userId: string,
) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(
        Date.now() +
        ACTIVATION_TOKEN_LIFETIME_HOURS *
        60 *
        60 *
        1000,
    );

    await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({
            where: {
                userId,
                usedAt: null,
            },

            data: {
                usedAt: new Date(),
            },
        });

        await tx.passwordResetToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            },
        });

        await tx.activityLog.create({
            data: {
                userId,
                action: "CREATE",
                entity: "PasswordResetToken",
                entityId: userId,

                metadata: {
                    event: "ACCOUNT_ACTIVATION_LINK_CREATED",
                    expiresAt: expiresAt.toISOString(),
                },
            },
        });
    });

    return {
        activationUrl:
            `${getAppUrl()}/activate-account/${rawToken}`,

        expiresInHours:
            ACTIVATION_TOKEN_LIFETIME_HOURS,
    };
}