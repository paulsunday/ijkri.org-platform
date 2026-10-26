"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isHoneypotFilled } from "@/lib/security/honeypot";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewsletterActionState = {
    success: boolean;
    message: string;
};

export async function subscribeToNewsletter(
    _previousState: NewsletterActionState,
    formData: FormData,
): Promise<NewsletterActionState> {
    if (isHoneypotFilled(formData, { event: "NEWSLETTER_SIGNUP" })) {
        /*
         * Pretend success so a bot gets no signal that it was
         * detected, without ever writing a row for it.
         */
        return {
            success: true,
            message: "You're subscribed — thank you.",
        };
    }

    const email = String(formData.get("email") || "")
        .trim()
        .toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email)) {
        return {
            success: false,
            message: "Enter a valid email address.",
        };
    }

    const journal = await prisma.journal.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });

    if (!journal) {
        return {
            success: false,
            message:
                "Subscriptions are not available right now. Please try again later.",
        };
    }

    await prisma.newsletterSubscriber.upsert({
        where: {
            journalId_email: {
                journalId: journal.id,
                email,
            },
        },
        create: {
            journalId: journal.id,
            email,
        },
        update: {
            unsubscribedAt: null,
        },
    });

    revalidatePath("/");

    return {
        success: true,
        message: "You're subscribed — thank you.",
    };
}

export async function unsubscribeFromNewsletter(
    token: string,
): Promise<{ email: string }> {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { unsubscribeToken: token },
    });

    if (!subscriber || subscriber.unsubscribedAt) {
        throw new Error(
            "This unsubscribe link is invalid or has already been used.",
        );
    }

    await prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { unsubscribedAt: new Date() },
    });

    return { email: subscriber.email };
}
