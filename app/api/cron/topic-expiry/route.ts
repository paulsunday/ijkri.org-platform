import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RELEASE_REASON =
    "Expired after the reservation window with no recorded proposal seminar.";

function securelyMatches(
    providedValue: string,
    expectedValue: string,
): boolean {
    const providedBuffer = Buffer.from(providedValue);

    const expectedBuffer = Buffer.from(expectedValue);

    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
}

function isAuthorized(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error("CRON_SECRET is not configured");

        return false;
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return false;
    }

    const suppliedSecret = authorization
        .slice("Bearer ".length)
        .trim();

    return securelyMatches(suppliedSecret, cronSecret);
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            {
                success: false,
                error: "Unauthorized.",
            },
            {
                status: 401,
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    }

    const now = new Date();

    const reservations = await prisma.topicReservation.findMany({
        where: {
            status: "ACTIVE",
            expiresAt: {
                lt: now,
            },
            seminarHeldAt: null,
        },

        include: {
            topic: {
                select: {
                    id: true,
                    rawTopicText: true,
                },
            },
        },
    });

    let releasedCount = 0;
    let failedCount = 0;

    const results: Array<{
        reservationId: string;
        status: string;
        message?: string;
    }> = [];

    for (const reservation of reservations) {
        try {
            await prisma.$transaction(async (tx) => {
                await tx.topicReservation.update({
                    where: {
                        id: reservation.id,
                    },
                    data: {
                        status: "RELEASED",
                        releasedAt: now,
                        releaseReason: RELEASE_REASON,
                    },
                });

                await tx.notification.create({
                    data: {
                        userId: reservation.userId,
                        type: "RESEARCH_TOOLKIT",
                        title: "Topic reservation released",
                        message: `Your reservation for "${reservation.topic.rawTopicText}" expired with no recorded proposal seminar and has been released back to the pool.`,
                        link: `/toolkit/${reservation.topic.id}`,
                    },
                });

                await tx.activityLog.create({
                    data: {
                        userId: null,
                        action: "UPDATE",
                        entity: "TopicReservation",
                        entityId: reservation.id,

                        metadata: {
                            event: "TOPIC_RESERVATION_EXPIRED",
                            topicId: reservation.topic.id,
                            userId: reservation.userId,
                            signatureKey: reservation.signatureKey,
                            expiresAt:
                                reservation.expiresAt.toISOString(),
                            releasedAt: now.toISOString(),
                        },
                    },
                });
            });

            releasedCount += 1;

            results.push({
                reservationId: reservation.id,
                status: "RELEASED",
            });
        } catch (error) {
            failedCount += 1;

            logger.error(
                "Automatic topic reservation release failed",
                error,
                {
                    reservationId: reservation.id,
                    topicId: reservation.topic.id,
                },
            );

            results.push({
                reservationId: reservation.id,
                status: "FAILED",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }

    return NextResponse.json(
        {
            success: true,
            processed: reservations.length,
            released: releasedCount,
            failed: failedCount,
            executedAt: now.toISOString(),
            results,
        },
        {
            headers: {
                "Cache-Control": "no-store",
            },
        },
    );
}
