"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";

const MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

const EVENT_TYPES = [
    "SEMINAR",
    "WEBINAR",
    "WORKSHOP",
    "CONFERENCE",
    "EDITORIAL_SESSION",
] as const;

const EVENT_STATUSES = [
    "UPCOMING",
    "ONGOING",
    "COMPLETED",
    "CANCELLED",
] as const;

const EventSchema = z.object({
    journalId: z.string().min(1),

    eventType: z.enum(EVENT_TYPES).default("WEBINAR"),

    status: z.enum(EVENT_STATUSES).default("UPCOMING"),

    title: z.string().trim().min(3).max(200),

    description: z.string().trim().min(3),

    startsAt: z.string().trim().min(1),

    endsAt: z.string().trim().optional(),

    speakerName: z.string().trim().optional(),

    speakerTitle: z.string().trim().optional(),

    registrationUrl: z.string().trim().optional(),

    recordingUrl: z.string().trim().optional(),

    isPublished: z.coerce.boolean().default(false),
});

function refreshPages(slug?: string) {
    revalidatePath("/admin/events");
    revalidatePath("/events");

    if (slug) {
        revalidatePath(`/events/${slug}`);
    }
}

function normalize(formData: FormData) {
    return EventSchema.parse({
        journalId: formData.get("journalId"),
        eventType: formData.get("eventType"),
        status: formData.get("status"),
        title: formData.get("title"),
        description: formData.get("description"),
        startsAt: formData.get("startsAt"),
        endsAt: formData.get("endsAt"),
        speakerName: formData.get("speakerName"),
        speakerTitle: formData.get("speakerTitle"),
        registrationUrl: formData.get("registrationUrl"),
        recordingUrl: formData.get("recordingUrl"),
        isPublished: formData.get("isPublished"),
    });
}

async function ensureJournalManager(journalId: string) {
    const user = await requireAnyActionRole([...MANAGER_ROLES]);

    if (!isSuperAdmin(user)) {
        const access = await prisma.userJournalRole.findFirst({
            where: {
                userId: user.id,
                journalId,
                role: {
                    in: [...MANAGER_ROLES],
                },
            },
        });

        if (!access) {
            throw new Error("Permission denied.");
        }
    }

    return user;
}

function parseRequiredDate(value: string, label: string): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${label} must be a valid date and time.`);
    }

    return parsed;
}

function parseOptionalDate(
    value: string | undefined,
    label: string,
): Date | null {
    const trimmed = value?.trim();

    if (!trimmed) {
        return null;
    }

    return parseRequiredDate(trimmed, label);
}

function validatedUrl(value: string | undefined, label: string) {
    const normalized = value?.trim() || null;

    if (normalized) {
        try {
            new URL(normalized);
        } catch {
            throw new Error(`Enter a valid ${label}.`);
        }
    }

    return normalized;
}

export async function createEvent(formData: FormData) {
    const data = normalize(formData);

    const manager = await ensureJournalManager(data.journalId);

    const journal = await prisma.journal.findUnique({
        where: { id: data.journalId },
        select: { id: true, name: true, isActive: true },
    });

    if (!journal) {
        throw new Error("The selected journal could not be found.");
    }

    if (!journal.isActive) {
        throw new Error(
            "Events cannot be added to an inactive journal.",
        );
    }

    const startsAt = parseRequiredDate(
        data.startsAt,
        "Start date and time",
    );

    const endsAt = parseOptionalDate(
        data.endsAt,
        "End date and time",
    );

    if (endsAt && endsAt < startsAt) {
        throw new Error(
            "End date and time cannot be before the start date and time.",
        );
    }

    const registrationUrl = validatedUrl(
        data.registrationUrl,
        "registration URL",
    );

    const recordingUrl = validatedUrl(
        data.recordingUrl,
        "recording URL",
    );

    const slug = await generateUniqueSlug(
        data.title,
        async (candidate) =>
            !!(await prisma.event.findUnique({
                where: {
                    journalId_slug: {
                        journalId: data.journalId,
                        slug: candidate,
                    },
                },
            })),
    );

    await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                journalId: data.journalId,
                title: data.title,
                slug,
                description: data.description,
                eventType: data.eventType,
                startsAt,
                endsAt,
                speakerName: data.speakerName?.trim() || null,
                speakerTitle: data.speakerTitle?.trim() || null,
                registrationUrl,
                recordingUrl,
                status: data.status,
                isPublished: data.isPublished,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "CREATE",
                entity: "Event",
                entityId: event.id,
                metadata: {
                    event: "EVENT_CREATED",
                    journalId: journal.id,
                    journalName: journal.name,
                    eventTitle: event.title,
                    eventType: event.eventType,
                    isPublished: event.isPublished,
                },
            },
        });
    });

    refreshPages(slug);
}

export async function updateEvent(formData: FormData) {
    const eventId = String(formData.get("eventId") || "").trim();

    if (!eventId) {
        throw new Error("Event ID is missing.");
    }

    const data = normalize(formData);

    const manager = await ensureJournalManager(data.journalId);

    const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            journal: {
                select: { id: true, name: true, isActive: true },
            },
        },
    });

    if (!existingEvent) {
        throw new Error("Event not found.");
    }

    if (existingEvent.journalId !== data.journalId) {
        throw new Error(
            "The selected journal does not match this event.",
        );
    }

    if (!existingEvent.journal.isActive) {
        throw new Error(
            "Events cannot be updated for an inactive journal.",
        );
    }

    const startsAt = parseRequiredDate(
        data.startsAt,
        "Start date and time",
    );

    const endsAt = parseOptionalDate(
        data.endsAt,
        "End date and time",
    );

    if (endsAt && endsAt < startsAt) {
        throw new Error(
            "End date and time cannot be before the start date and time.",
        );
    }

    const registrationUrl = validatedUrl(
        data.registrationUrl,
        "registration URL",
    );

    const recordingUrl = validatedUrl(
        data.recordingUrl,
        "recording URL",
    );

    await prisma.$transaction(async (tx) => {
        const updatedEvent = await tx.event.update({
            where: { id: eventId },
            data: {
                title: data.title,
                description: data.description,
                eventType: data.eventType,
                startsAt,
                endsAt,
                speakerName: data.speakerName?.trim() || null,
                speakerTitle: data.speakerTitle?.trim() || null,
                registrationUrl,
                recordingUrl,
                status: data.status,
                isPublished: data.isPublished,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "Event",
                entityId: updatedEvent.id,
                metadata: {
                    event: "EVENT_UPDATED",
                    journalId: existingEvent.journal.id,
                    journalName: existingEvent.journal.name,
                    eventTitle: updatedEvent.title,
                    eventType: updatedEvent.eventType,
                    isPublished: updatedEvent.isPublished,
                },
            },
        });
    });

    refreshPages(existingEvent.slug);
}

export async function deleteEvent(formData: FormData) {
    const eventId = String(formData.get("eventId") || "").trim();

    if (!eventId) {
        throw new Error("Event ID is missing.");
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            journal: { select: { id: true, name: true } },
        },
    });

    if (!event) {
        throw new Error("Event not found.");
    }

    const manager = await ensureJournalManager(event.journalId);

    await prisma.$transaction(async (tx) => {
        await tx.event.delete({ where: { id: eventId } });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "DELETE",
                entity: "Event",
                entityId: eventId,
                metadata: {
                    event: "EVENT_DELETED",
                    journalId: event.journal.id,
                    journalName: event.journal.name,
                    eventTitle: event.title,
                    eventType: event.eventType,
                },
            },
        });
    });

    refreshPages(event.slug);
}
