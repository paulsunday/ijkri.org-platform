import "server-only";

import { sendEmail } from "@/lib/email/send-email";
import {
    eventRegistrationConfirmedEmail,
    eventRegistrationNotificationEmail,
} from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

function formatSchedule(startsAt: Date, endsAt: Date | null) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const start = formatter.format(startsAt);

    return endsAt ? `${start} — ${formatter.format(endsAt)}` : start;
}

/** Emails the registrant (and the journal) once a registration is paid. */
export async function sendEventRegistrationConfirmation(
    eventRegistrationId: string,
): Promise<void> {
    const registration = await prisma.eventRegistration.findUnique({
        where: { id: eventRegistrationId },
        include: { event: true },
    });

    if (!registration) return;

    const { event } = registration;

    const appUrl = (
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.ijkri.org"
    ).replace(/\/$/, "");

    const eventUrl = `${appUrl}/events/${event.slug}`;

    const speakerText = event.speakerName
        ? `${event.speakerName}${event.speakerTitle ? `, ${event.speakerTitle}` : ""}`
        : null;

    const scheduleText = formatSchedule(event.startsAt, event.endsAt);

    const confirmation = eventRegistrationConfirmedEmail({
        name: registration.name,
        eventTitle: event.title,
        scheduleText,
        speakerText,
        eventUrl,
    });

    await sendEmail({
        to: registration.email,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
    });

    const notifyTo = process.env.EMAIL_REPLY_TO;

    if (!notifyTo) return;

    try {
        const notification = eventRegistrationNotificationEmail({
            name: registration.name,
            email: registration.email,
            eventTitle: event.title,
            scheduleText,
        });

        await sendEmail({
            to: notifyTo,
            subject: notification.subject,
            html: notification.html,
            text: notification.text,
        });
    } catch (error) {
        logger.error("Event registration staff notification failed", error, {
            event: "EVENT_REGISTRATION_NOTIFY_FAILED",
            eventRegistrationId,
        });
    }
}
