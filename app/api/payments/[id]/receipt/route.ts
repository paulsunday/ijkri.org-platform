import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { generatePaymentReceipt } from "@/lib/payments/generate-receipt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

type SessionRole = {
    role: string;
    journalId?: string | null;
};

function jsonError(
    message: string,
    status: number,
) {
    return NextResponse.json(
        {
            error: message,
        },
        {
            status,
        },
    );
}

function sanitiseFileName(value: string) {
    const cleaned = value
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return cleaned || "payment-receipt";
}

function hasReceiptAccess({
    userId,
    paymentOwnerId,
    journalId,
    roles,
}: {
    userId: string;
    paymentOwnerId: string;
    journalId: string;
    roles: SessionRole[];
}) {
    if (userId === paymentOwnerId) {
        return true;
    }

    const isSuperAdmin = roles.some(
        (assignment) =>
            assignment.role ===
            "SUPER_ADMIN",
    );

    if (isSuperAdmin) {
        return true;
    }

    const allowedJournalRoles =
        new Set([
            "ADMIN",
            "EDITOR_IN_CHIEF",
            "MANAGING_EDITOR",
            "PUBLISHER",
        ]);

    return roles.some(
        (assignment) =>
            assignment.journalId ===
            journalId &&
            allowedJournalRoles.has(
                assignment.role,
            ),
    );
}

function paymentDescription(
    purpose: string,
) {
    switch (purpose) {
        case "APC":
            return "Article Processing Charge";

        case "SUBSCRIPTION":
            return "Journal Subscription";

        case "ARTICLE_PURCHASE":
            return "Article Purchase";

        default:
            return "Journal Payment";
    }
}

export async function GET(
    _request: NextRequest,
    context: RouteContext,
) {
    const session = await auth();

    if (
        !session?.user?.id
    ) {
        return jsonError(
            "Authentication is required.",
            401,
        );
    }

    const { id } =
        await context.params;

    const paymentId = id.trim();

    if (!paymentId) {
        return jsonError(
            "Payment ID is required.",
            400,
        );
    }

    const payment =
        await prisma.payment.findUnique({
            where: {
                id: paymentId,
            },

            select: {
                id: true,
                journalId: true,
                userId: true,
                purpose: true,
                provider: true,
                status: true,
                amount: true,
                currency: true,
                internalReference: true,
                providerReference: true,
                providerChannel: true,
                providerFees: true,
                paidAmount: true,
                receiptNumber: true,
                paidAt: true,
                verifiedAt: true,

                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isActive: true,
                    },
                },

                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        websiteUrl: true,
                        contactEmail: true,

                        settings: {
                            select: {
                                contactAddress:
                                    true,
                            },
                        },

                        publisher: {
                            select: {
                                name: true,
                                address: true,
                                website: true,
                                email: true,
                            },
                        },
                    },
                },

                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        status: true,

                        submission: {
                            select: {
                                id: true,
                                title: true,

                                article: {
                                    select: {
                                        issue: {
                                            select: {
                                                number:
                                                    true,

                                                volume: {
                                                    select: {
                                                        number:
                                                            true,
                                                        year: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                subscription: {
                    select: {
                        planName: true,
                        durationMonths: true,
                    },
                },

                articlePurchase: {
                    select: {
                        article: {
                            select: {
                                title: true,

                                issue: {
                                    select: {
                                        number: true,

                                        volume: {
                                            select: {
                                                number:
                                                    true,
                                                year: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

    if (!payment) {
        return jsonError(
            "Payment was not found.",
            404,
        );
    }

    const roles =
        Array.isArray(
            session.user.roles,
        )
            ? (session.user
                .roles as SessionRole[])
            : [];

    const authorised =
        hasReceiptAccess({
            userId:
                session.user.id,
            paymentOwnerId:
                payment.userId,
            journalId:
                payment.journalId,
            roles,
        });

    /*
     * Return 404 instead of 403 so an unauthorised user
     * cannot confirm that a payment record exists.
     */
    if (!authorised) {
        return jsonError(
            "Payment was not found.",
            404,
        );
    }

    if (
        payment.status !== "PAID"
    ) {
        return jsonError(
            "A receipt is available only for a successfully paid transaction.",
            409,
        );
    }

    if (
        !payment.receiptNumber
    ) {
        return jsonError(
            "This paid transaction does not yet have a receipt number. Contact support.",
            409,
        );
    }

    if (!payment.user.isActive) {
        const isOwner =
            session.user.id ===
            payment.userId;

        if (isOwner) {
            return jsonError(
                "This account is inactive. Contact support to obtain the receipt.",
                403,
            );
        }
    }

    const invoiceSubmission =
        payment.invoice
            ?.submission;

    const purchasedArticle =
        payment.articlePurchase
            ?.article;

    const issue =
        invoiceSubmission?.article
            ?.issue ??
        purchasedArticle?.issue ??
        null;

    const manuscriptTitle =
        invoiceSubmission?.title ??
        purchasedArticle?.title ??
        null;

    const volumeLabel = issue
        ? `${issue.volume.number} (${issue.volume.year})`
        : null;

    const issueLabel = issue
        ? String(issue.number)
        : null;

    const description =
        payment.purpose ===
            "SUBSCRIPTION" &&
            payment.subscription
            ? `${payment.subscription.planName} — ${payment.subscription.durationMonths} month${payment.subscription
                .durationMonths ===
                1
                ? ""
                : "s"
            }`
            : paymentDescription(
                payment.purpose,
            );

    const journalWebsite =
        payment.journal
            .websiteUrl ??
        payment.journal.publisher
            ?.website ??
        null;

    const journalEmail =
        payment.journal
            .contactEmail ??
        payment.journal.publisher
            ?.email ??
        null;

    const journalAddress =
        payment.journal.settings
            ?.contactAddress ??
        payment.journal.publisher
            ?.address ??
        null;

    try {
        const pdfBytes =
            await generatePaymentReceipt(
                {
                    payment: {
                        receiptNumber:
                            payment.receiptNumber,

                        invoiceNumber:
                            payment.invoice
                                ?.invoiceNumber ??
                            null,

                        internalReference:
                            payment.internalReference,

                        providerReference:
                            payment.providerReference,

                        provider:
                            payment.provider,

                        providerChannel:
                            payment.providerChannel,

                        status:
                            payment.status,

                        currency:
                            payment.currency,

                        amount:
                            payment.amount.toString(),

                        paidAmount:
                            payment.paidAmount?.toString() ??
                            payment.amount.toString(),

                        providerFees:
                            payment.providerFees?.toString() ??
                            null,

                        paidAt:
                            payment.paidAt,

                        verifiedAt:
                            payment.verifiedAt,
                    },

                    customer: {
                        name:
                            payment.user.name,
                        email:
                            payment.user.email,
                        userId:
                            payment.user.id,
                    },

                    journal: {
                        name:
                            payment.journal
                                .name,
                        website:
                            journalWebsite,
                        supportEmail:
                            journalEmail,
                        address:
                            journalAddress,
                    },

                    invoice: {
                        description,
                        manuscriptTitle,
                        volume:
                            volumeLabel,
                        issue:
                            issueLabel,
                    },
                },
            );

        const fileName =
            sanitiseFileName(
                `receipt-${payment.receiptNumber}.pdf`,
            );

        return new Response(
            Buffer.from(pdfBytes),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/pdf",

                    "Content-Disposition":
                        `attachment; filename="${fileName}"`,

                    "Content-Length":
                        String(
                            pdfBytes.byteLength,
                        ),

                    "Cache-Control":
                        "private, no-store, no-cache, must-revalidate",

                    Pragma:
                        "no-cache",

                    Expires: "0",

                    "X-Content-Type-Options":
                        "nosniff",

                    "Content-Security-Policy":
                        "default-src 'none'; frame-ancestors 'none'; sandbox",
                },
            },
        );
    } catch (error) {
        console.error(
            "Payment receipt generation failed:",
            {
                paymentId:
                    payment.id,
                receiptNumber:
                    payment.receiptNumber,
                requestedBy:
                    session.user.id,
                error,
            },
        );

        return jsonError(
            "The payment receipt could not be generated.",
            500,
        );
    }
}