"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { initializePaystackPayment } from "@/lib/payments/initialize-payment";
import { prisma } from "@/lib/prisma";

function getApplicationUrl() {
    const applicationUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        process.env.NEXTAUTH_URL;

    if (!applicationUrl) {
        throw new Error(
            "Application URL is not configured. Add NEXT_PUBLIC_APP_URL to your environment variables.",
        );
    }

    return applicationUrl.replace(/\/$/, "");
}

function generatePaymentReference(articleSlug: string) {
    const safeSlug = articleSlug
        .replace(/[^a-zA-Z0-9.-]/g, "-")
        .slice(0, 40);

    const uniquePart = randomUUID().replaceAll("-", "");

    return `ART-${safeSlug}-${uniquePart}`;
}

export async function initializeArticlePurchase(
    formData: FormData,
) {
    const articleId = String(
        formData.get("articleId") ?? "",
    ).trim();

    if (!articleId) {
        throw new Error("Article ID is required.");
    }

    const article = await prisma.article.findUnique({
        where: {
            id: articleId,
        },
        select: {
            id: true,
            slug: true,
            status: true,
            journalId: true,

            journal: {
                select: {
                    id: true,
                    isActive: true,
                    articlePrice: true,
                    currency: true,
                },
            },
        },
    });

    if (!article || article.status !== "PUBLISHED") {
        throw new Error("Article not found.");
    }

    const user = await getCurrentUser();

    if (!user) {
        redirect(
            `/login?callbackUrl=${encodeURIComponent(
                `/articles/${article.slug}`,
            )}`,
        );
    }

    if (!user.isActive) {
        throw new Error(
            "Your account is inactive. Contact the journal administrator.",
        );
    }

    if (!article.journal.isActive) {
        throw new Error(
            "This journal is not currently accepting article purchases.",
        );
    }

    const amount = article.journal.articlePrice.toNumber();

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
            "This journal has not configured an article price.",
        );
    }

    let articlePurchase =
        await prisma.articlePurchase.findUnique({
            where: {
                userId_articleId: {
                    userId: user.id,
                    articleId: article.id,
                },
            },
        });

    if (articlePurchase?.accessGrantedAt) {
        redirect(`/articles/${article.slug}`);
    }

    if (!articlePurchase) {
        articlePurchase =
            await prisma.articlePurchase.create({
                data: {
                    journalId: article.journalId,
                    articleId: article.id,
                    userId: user.id,
                    amount: article.journal.articlePrice,
                    currency: article.journal.currency,
                },
            });
    }

    /*
     * Reuse a recently initialised Paystack checkout session
     * instead of creating several payment attempts when a
     * reader clicks the button repeatedly.
     */
    const recentPaymentThreshold = new Date(
        Date.now() - 30 * 60 * 1000,
    );

    const existingPayment = await prisma.payment.findFirst({
        where: {
            articlePurchaseId: articlePurchase.id,
            userId: user.id,
            provider: "PAYSTACK",
            status: {
                in: ["PENDING", "PROCESSING"],
            },
            authorizationUrl: {
                not: null,
            },
            initiatedAt: {
                gte: recentPaymentThreshold,
            },
        },
        orderBy: {
            initiatedAt: "desc",
        },
    });

    if (existingPayment?.authorizationUrl) {
        redirect(existingPayment.authorizationUrl);
    }

    /*
     * Cancel older incomplete payment attempts before creating
     * a fresh Paystack checkout session.
     */
    await prisma.payment.updateMany({
        where: {
            articlePurchaseId: articlePurchase.id,
            userId: user.id,
            provider: "PAYSTACK",
            status: {
                in: ["PENDING", "PROCESSING"],
            },
        },
        data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            providerStatus: "superseded",
            failureReason:
                "Replaced by a newer payment attempt.",
        },
    });

    const internalReference = generatePaymentReference(
        article.slug,
    );

    const payment = await prisma.payment.create({
        data: {
            journalId: article.journalId,
            userId: user.id,
            articlePurchaseId: articlePurchase.id,

            purpose: "ARTICLE_PURCHASE",
            provider: "PAYSTACK",
            status: "PENDING",

            amount: article.journal.articlePrice,
            currency: article.journal.currency,

            customerEmail: user.email,
            internalReference,
            initiatedAt: new Date(),
        },
    });

    let authorizationUrl: string;

    try {
        const applicationUrl = getApplicationUrl();

        const callbackUrl =
            `${applicationUrl}/api/paystack/callback`;

        const paystackResponse =
            await initializePaystackPayment({
                email: user.email,
                amount,
                currency: article.journal.currency,
                reference: internalReference,
                callbackUrl,
                articlePurchaseId: articlePurchase.id,
                userId: user.id,
                purpose: "ARTICLE_PURCHASE",
            });

        if (
            !paystackResponse.status ||
            !paystackResponse.data.authorization_url
        ) {
            throw new Error(
                paystackResponse.message ||
                "Paystack did not return a checkout URL.",
            );
        }

        const updatedPayment =
            await prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    status: "PROCESSING",
                    providerStatus: "initialized",
                    providerReference:
                        paystackResponse.data.reference,
                    authorizationUrl:
                        paystackResponse.data
                            .authorization_url,
                    providerResponse: paystackResponse,
                },
            });

        if (!updatedPayment.authorizationUrl) {
            throw new Error(
                "The Paystack checkout URL was not saved.",
            );
        }

        authorizationUrl =
            updatedPayment.authorizationUrl;
    } catch (error) {
        const failureReason =
            error instanceof Error
                ? error.message
                : "An unknown payment initialization error occurred.";

        await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                status: "FAILED",
                providerStatus:
                    "initialization_failed",
                failureReason,
                failedAt: new Date(),
            },
        });

        throw new Error(
            `Unable to initialise payment: ${failureReason}`,
        );
    }

    redirect(authorizationUrl);
}
