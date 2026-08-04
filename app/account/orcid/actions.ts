"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActionUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import {
    ORCID_STATE_COOKIE,
    buildOrcidAuthorizeUrl,
} from "@/lib/orcid/oauth";
import { fetchPublicOrcidRecord } from "@/lib/orcid/public-profile";
import { prisma } from "@/lib/prisma";

export async function startOrcidConnect() {
    await requireActionUser();

    const state = randomUUID();

    let authorizeUrl: string;

    try {
        authorizeUrl = buildOrcidAuthorizeUrl(state);
    } catch (error) {
        logger.error(
            "Could not build the ORCID authorization URL",
            {
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
        );

        redirect(
            `/account?orcidError=${encodeURIComponent(
                "ORCID connection is not available right now. Please contact the journal administrator.",
            )}`,
        );
    }

    const cookieStore = await cookies();

    cookieStore.set(ORCID_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
    });

    redirect(authorizeUrl);
}

/**
 * Refreshes PUBLIC ORCID record data (biography, employment, education,
 * keywords, works count) via ORCID's public API. Requires the user to
 * have already connected ORCID through the existing OAuth identity
 * flow above — this never touches that connection, it only reads
 * additional public data using the already-verified ORCID iD.
 */
export async function refreshOrcidData() {
    const user = await requireActionUser();

    if (!user.orcid || !user.orcidVerifiedAt) {
        throw new Error("Connect your ORCID iD before refreshing profile data.");
    }

    let profile;

    try {
        profile = await fetchPublicOrcidRecord(user.orcid);
    } catch (error) {
        logger.error("ORCID public profile refresh failed", {
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
        });

        throw new Error(
            "Could not refresh your ORCID data right now. Please try again shortly.",
        );
    }

    await prisma.$transaction([
        prisma.orcidProfileSnapshot.upsert({
            where: { userId: user.id },
            update: {
                biography: profile.biography,
                employments: profile.employments,
                educations: profile.educations,
                keywords: profile.keywords,
                worksCount: profile.worksCount,
                publicProfileUrl: profile.publicProfileUrl,
                syncedAt: new Date(),
            },
            create: {
                userId: user.id,
                biography: profile.biography,
                employments: profile.employments,
                educations: profile.educations,
                keywords: profile.keywords,
                worksCount: profile.worksCount,
                publicProfileUrl: profile.publicProfileUrl,
            },
        }),

        prisma.activityLog.create({
            data: {
                userId: user.id,
                action: "UPDATE",
                entity: "User",
                entityId: user.id,
                metadata: {
                    event: "ORCID_DATA_REFRESHED",
                },
            },
        }),
    ]);

    revalidatePath("/account");
}

export async function disconnectOrcid() {
    const user = await requireActionUser();

    await prisma.$transaction([
        prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                orcid: null,
                orcidVerifiedAt: null,
            },
        }),

        prisma.activityLog.create({
            data: {
                userId: user.id,
                action: "UPDATE",
                entity: "User",
                entityId: user.id,
                metadata: {
                    event: "ORCID_DISCONNECTED",
                },
            },
        }),
    ]);

    revalidatePath("/account");
}
