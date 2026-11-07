import "server-only";

import { isSuperAdmin } from "@/lib/auth/permissions";
import type { ArticleAccessType } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Roles that manage a journal and therefore always have read
 * access to its published articles, regardless of subscription
 * or purchase status.
 */
const STAFF_ACCESS_ROLES = [
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
] as const;

export type ArticleReadAccessInput = {
    userId: string | null;
    journalId: string;
    articleId: string;
    authorUserId?: string | null;
    accessType: ArticleAccessType;
};

/**
 * Determines whether a reader may access an article's full
 * text/PDF. Shared by the public article page and the
 * production-file download route so the access rule lives in
 * exactly one place.
 */
export async function hasArticleReadAccess({
    userId,
    journalId,
    articleId,
    authorUserId,
    accessType,
}: ArticleReadAccessInput): Promise<boolean> {
    // Every article is paid (site policy since Nov 2026): accessType no
    // longer grants free access. Readers need a purchase or subscription.
    void accessType;

    if (!userId) {
        return false;
    }

    if (authorUserId && userId === authorUserId) {
        return true;
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

    const staffRole = await prisma.userJournalRole.findFirst({
        where: {
            userId,
            journalId,
            role: {
                in: [...STAFF_ACCESS_ROLES],
            },
        },
        select: {
            id: true,
        },
    });

    if (staffRole) {
        return true;
    }

    {
        const purchase = await prisma.articlePurchase.findFirst({
            where: {
                userId,
                articleId,
                accessGrantedAt: {
                    not: null,
                },
                accessRevokedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (purchase) {
            return true;
        }
    }

    const activeSubscription =
        await prisma.subscription.findFirst({
            where: {
                userId,
                journalId,
                status: "ACTIVE",
                expiresAt: {
                    gt: new Date(),
                },
            },
            select: {
                id: true,
            },
        });

    return Boolean(activeSubscription);
}

/** An article's price: its own price if a super admin set one, else the journal's. */
export function getArticlePrice(
    article: { price: import("@/lib/generated/prisma").Prisma.Decimal | null },
    journal: { articlePrice: import("@/lib/generated/prisma").Prisma.Decimal },
) {
    return article.price ?? journal.articlePrice;
}
