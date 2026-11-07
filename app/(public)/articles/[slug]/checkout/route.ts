import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import {
    getArticlePrice,
    hasArticleReadAccess,
} from "@/lib/payments/article-access";
import {
    startItemCheckout,
    withPaymentMessage,
} from "@/lib/payments/start-checkout";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/** "Buy this article" target. Plain POST route (safe across deploys). */
export async function POST(request: NextRequest, { params }: RouteContext) {
    const { slug } = await params;
    const articlePath = `/articles/${slug}`;
    const go = (path: string) =>
        NextResponse.redirect(new URL(path, request.url), 303);

    const user = await getCurrentUser();

    if (!user) {
        return go(`/login?callbackUrl=${encodeURIComponent(articlePath)}`);
    }

    try {
        const article = await prisma.article.findFirst({
            where: { slug, status: "PUBLISHED" },
            select: {
                id: true,
                journalId: true,
                accessType: true,
                price: true,
                submission: { select: { authorId: true } },
                journal: {
                    select: {
                        id: true,
                        articlePrice: true,
                        currency: true,
                        ngnExchangeRate: true,
                    },
                },
            },
        });

        if (!article) {
            return go("/archives");
        }

        const isAlreadyPaid = () =>
            hasArticleReadAccess({
                userId: user.id,
                journalId: article.journalId,
                articleId: article.id,
                authorUserId: article.submission?.authorId ?? null,
                accessType: article.accessType,
            });

        if (await isAlreadyPaid()) {
            return go(articlePath);
        }

        const price = getArticlePrice(article, article.journal);

        const purchase = await prisma.articlePurchase.upsert({
            where: {
                userId_articleId: { userId: user.id, articleId: article.id },
            },
            create: {
                journalId: article.journalId,
                articleId: article.id,
                userId: user.id,
                amount: price,
                currency: article.journal.currency,
            },
            update: { amount: price },
        });

        const formData = await request.formData();

        return go(
            await startItemCheckout({
                user: { id: user.id, email: user.email },
                journal: article.journal,
                item: { purpose: "ARTICLE_PURCHASE", articlePurchaseId: purchase.id },
                baseAmount: price,
                currencyValue: formData.get("currency"),
                returnPath: articlePath,
                isAlreadyPaid,
            }),
        );
    } catch (error) {
        logger.error("Article checkout failed", error, {
            event: "ARTICLE_CHECKOUT_FAILED",
            slug,
        });

        return go(
            withPaymentMessage(
                articlePath,
                "error",
                "We couldn't start the payment. Please try again in a moment.",
            ),
        );
    }
}
