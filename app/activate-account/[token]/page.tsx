import { createHash } from "crypto";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

type Props = {
    params: Promise<{
        token: string;
    }>;
};

export default async function ActivateAccountPage({
    params,
}: Props) {
    const { token } = await params;

    if (!token) {
        redirect("/login?error=invalidActivation");
    }

    const tokenHash = hashToken(token);

    const activation =
        await prisma.passwordResetToken.findUnique({
            where: {
                tokenHash,
            },
            include: {
                user: true,
            },
        });

    if (
        !activation ||
        activation.usedAt ||
        activation.expiresAt < new Date()
    ) {
        redirect("/login?error=activationExpired");
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: {
                id: activation.userId,
            },
            data: {
                emailVerified: new Date(),
                isActive: true,
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });

        await tx.passwordResetToken.update({
            where: {
                id: activation.id,
            },
            data: {
                usedAt: new Date(),
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
    });

    redirect("/login?accountActivated=true");
}