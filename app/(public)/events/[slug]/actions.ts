"use server";

import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { assertHoneypotEmpty } from "@/lib/security/honeypot";
import {
  eventRegistrationConfirmedEmail,
  eventRegistrationNotificationEmail,
} from "@/lib/email/templates";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  return endsAt
    ? `${start} — ${formatter.format(endsAt)}`
    : start;
}

export async function registerForEvent(formData: FormData) {
  assertHoneypotEmpty(formData, { event: "EVENT_REGISTRATION" });

  const slug = String(formData.get("slug") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!slug) {
    throw new Error("Missing event.");
  }

  if (!name) {
    throw new Error("Full name is required.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!journal) {
    throw new Error("Registration is temporarily unavailable.");
  }

  const event = await prisma.event.findUnique({
    where: {
      journalId_slug: {
        journalId: journal.id,
        slug,
      },
    },
  });

  if (!event || !event.isPublished) {
    throw new Error("Event not found.");
  }

  /*
   * Upsert so re-registering with the same email is a harmless
   * no-op rather than a unique-constraint error, and the registrant
   * count never double-counts the same person.
   */
  await prisma.eventRegistration.upsert({
    where: {
      eventId_email: {
        eventId: event.id,
        email,
      },
    },
    create: {
      eventId: event.id,
      name,
      email,
    },
    update: {},
  });

  const scheduleText = formatSchedule(
    event.startsAt,
    event.endsAt,
  );

  const eventUrl = `https://ijkri.org/events/${event.slug}`;

  const speakerText = event.speakerName
    ? `${event.speakerName}${
      event.speakerTitle ? `, ${event.speakerTitle}` : ""
    }`
    : null;

  const confirmation = eventRegistrationConfirmedEmail({
    name,
    eventTitle: event.title,
    scheduleText,
    speakerText,
    eventUrl,
  });

  try {
    await sendEmail({
      to: email,
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
    });
  } catch (error) {
    logger.error("Event registration confirmation email failed", {
      eventId: event.id,
      email,
      error:
        error instanceof Error ? error.message : String(error),
    });
  }

  const notifyTo = process.env.EMAIL_REPLY_TO;

  if (notifyTo) {
    const notification = eventRegistrationNotificationEmail({
      name,
      email,
      eventTitle: event.title,
      scheduleText,
    });

    try {
      await sendEmail({
        to: notifyTo,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
      });
    } catch (error) {
      logger.error("Event registration notification email failed", {
        eventId: event.id,
        email,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  redirect(`/events/${slug}?registered=true`);
}
