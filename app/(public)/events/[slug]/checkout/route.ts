import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import {
    startItemCheckout,
    withPaymentMessage,
} from "@/lib/payments/start-checkout";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/** "Pay & register" target for an event. Plain POST route. */
export async function POST(request: NextRequest, { params }: RouteContext) {
    const { slug } = await params;
    const eventPath = `/events/${slug}`;
    const go = (path: string) =>
        NextResponse.redirect(new URL(path, request.url), 303);

    const user = await getCurrentUser();

    if (!user) {
        return go(`/login?callbackUrl=${encodeURIComponent(eventPath)}`);
    }

    try {
        const journal = await prisma.journal.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
            select: { id: true, currency: true, ngnExchangeRate: true },
        });

        const event = journal
            ? await prisma.event.findUnique({
                where: { journalId_slug: { journalId: journal.id, slug } },
            })
            : null;

        if (!journal || !event || !event.isPublished) {
            return go("/events");
        }

        const hasEnded =
            event.status === "COMPLETED" ||
            event.status === "CANCELLED" ||
            (event.endsAt ?? event.startsAt) < new Date();

        if (hasEnded) {
            return go(withPaymentMessage(eventPath, "error", "Registration for this event has closed."));
        }

        const email = user.email.toLowerCase();

        // One registration per person per event (unique on event + email).
        const registration = await prisma.eventRegistration.upsert({
            where: { eventId_email: { eventId: event.id, email } },
            create: {
                eventId: event.id,
                userId: user.id,
                name: user.name || email,
                email,
                status: "PENDING",
            },
            update: { userId: user.id },
        });

        if (registration.status === "CONFIRMED") {
            return go(eventPath);
        }

        const isAlreadyPaid = async () =>
            (
                await prisma.eventRegistration.findUnique({
                    where: { id: registration.id },
                    select: { status: true },
                })
            )?.status === "CONFIRMED";

        const formData = await request.formData();

        return go(
            await startItemCheckout({
                user: { id: user.id, email: user.email },
                journal,
                item: {
                    purpose: "EVENT_REGISTRATION",
                    eventRegistrationId: registration.id,
                },
                baseAmount: event.fee,
                currencyValue: formData.get("currency"),
                returnPath: eventPath,
                isAlreadyPaid,
            }),
        );
    } catch (error) {
        logger.error("Event checkout failed", error, {
            event: "EVENT_CHECKOUT_FAILED",
            slug,
        });

        return go(
            withPaymentMessage(
                eventPath,
                "error",
                "We couldn't start the payment. Please try again in a moment.",
            ),
        );
    }
}
