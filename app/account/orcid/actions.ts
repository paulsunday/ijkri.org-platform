"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActionUser } from "@/lib/auth/current-user";
import {
    ORCID_STATE_COOKIE,
    buildOrcidAuthorizeUrl,
} from "@/lib/orcid/oauth";
import { prisma } from "@/lib/prisma";

export async function startOrcidConnect() {
    await requireActionUser();

    const state = randomUUID();

    const cookieStore = await cookies();

    cookieStore.set(ORCID_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
    });

    redirect(buildOrcidAuthorizeUrl(state));
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
