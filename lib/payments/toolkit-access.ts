import "server-only";

import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export type ToolkitAccessInput = {
    userId: string | null;
    journalId: string;
};

/**
 * Determines whether a user has unlocked the Research Topic
 * Formulation Workbench for a journal. Shared by the toolkit pages
 * and the paywall redirect so the access rule lives in exactly one
 * place, mirroring hasArticleReadAccess.
 */
export async function hasToolkitAccess({
    userId,
    journalId,
}: ToolkitAccessInput): Promise<boolean> {
    if (!userId) {
        return false;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            roles: {
                select: {
                    role: true,
                },
            },
        },
    });

    if (!user) {
        return false;
    }

    if (isSuperAdmin(user)) {
        return true;
    }

    const access = await prisma.toolkitAccess.findFirst({
        where: {
            userId,
            journalId,
            grantedAt: {
                not: null,
            },
            revokedAt: null,
        },
        select: {
            id: true,
        },
    });

    return Boolean(access);
}
