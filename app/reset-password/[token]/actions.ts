"use server";

import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";

import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function validPassword(value: string) {
    return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /\d/.test(value)
    );
}

export async function resetPassword(
    formData: FormData,
) {
    const token = String(
        formData.get("token") || "",
    ).trim();

    const password = String(
        formData.get("password") || "",
    );

    const confirmPassword = String(
        formData.get("confirmPassword") || "",
    );

    if (!token) {
        redirect(
            "/forgot-password?error=The+password-reset+link+is+invalid.",
        );
    }

    if (!validPassword(password)) {
        redirect(
            `/reset-password/${token}?error=Password+must+contain+at+least+8+characters,+one+uppercase+letter,+one+lowercase+letter+and+one+number.`,
        );
    }

    if (password !== confirmPassword) {
        redirect(
            `/reset-password/${token}?error=The+passwords+do+not+match.`,
        );
    }

    const tokenHash = hashToken(token);

    const rateLimitIdentifier = tokenHash;

    try {
        await enforceRateLimit(
            "reset-password",
            rateLimitIdentifier,
        );
    } catch (error) {
        logger.warn("Password reset blocked by rate limiter", {
            event: "PASSWORD_RESET_RATE_LIMITED",
            identifier: rateLimitIdentifier,
            error: error instanceof Error ? error.message : String(error),
        });

        redirect(
            "/forgot-password?error=Too+many+password-reset+attempts.+Please+try+again+later.",
        );
    }

    const resetRecord =
        await prisma.passwordResetToken.findUnique({
            where: {
                tokenHash,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        isActive: true,
                    },
                },
            },
        });

    if (
        !resetRecord ||
        resetRecord.usedAt ||
        resetRecord.expiresAt <= new Date() ||
        !resetRecord.user.isActive
    ) {
        redirect(
            "/forgot-password?error=The+password-reset+link+is+invalid+or+has+expired.",
        );
    }

    const passwordHash = await bcrypt.hash(
        password,
        12,
    );

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: {
                id: resetRecord.user.id,
            },
            data: {
                passwordHash,
                passwordChangedAt: new Date(),
                emailVerified: new Date(),
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });

        await tx.passwordResetToken.update({
            where: {
                id: resetRecord.id,
            },
            data: {
                usedAt: new Date(),
            },
        });

        await tx.passwordResetToken.updateMany({
            where: {
                userId: resetRecord.user.id,
                id: {
                    not: resetRecord.id,
                },
                usedAt: null,
            },
            data: {
                usedAt: new Date(),
            },
        });

        await tx.activityLog.create({
            data: {
                userId: resetRecord.user.id,
                action: "UPDATE",
                entity: "User",
                entityId: resetRecord.user.id,
                metadata: {
                    event: "PASSWORD_CREATED_OR_RESET",
                },
            },
        });
    });

    redirect(
        "/login?passwordReset=true",
    );
}