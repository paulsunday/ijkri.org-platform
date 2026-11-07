"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import {
    runFormAction,
    type FormActionState,
} from "@/lib/forms/run-form-action";
import { prisma } from "@/lib/prisma";

const MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

const ToolkitSettingsSchema = z.object({
    journalId: z.string().min(1),
    toolkitPrice: z.coerce.number().positive(),
    topicReservationMonths: z.coerce.number().int().min(1).max(36),
});

function refreshPages() {
    revalidatePath("/admin/research-toolkit");
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

export async function updateToolkitSettings(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const data = ToolkitSettingsSchema.parse({
            journalId: formData.get("journalId"),
            toolkitPrice: formData.get("toolkitPrice"),
            topicReservationMonths: formData.get(
                "topicReservationMonths",
            ),
        });

        const manager = await ensureJournalManager(data.journalId);

        await prisma.$transaction(async (tx) => {
            await tx.journal.update({
                where: {
                    id: data.journalId,
                },
                data: {
                    toolkitPrice: data.toolkitPrice,
                    topicReservationMonths:
                        data.topicReservationMonths,
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: manager.id,
                    action: "UPDATE",
                    entity: "Journal",
                    entityId: data.journalId,

                    metadata: {
                        event: "RESEARCH_TOOLKIT_SETTINGS_UPDATED",
                        toolkitPrice: data.toolkitPrice,
                        topicReservationMonths:
                            data.topicReservationMonths,
                    },
                },
            });
        });

        refreshPages();

        return "Settings updated.";
    }, { action: "updateToolkitSettings" });
}

export async function forceReleaseReservation(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const reservationId = String(
            formData.get("reservationId") || "",
        ).trim();

        if (!reservationId) {
            throw new Error("Reservation ID is missing.");
        }

        const reservation =
            await prisma.topicReservation.findUnique({
                where: {
                    id: reservationId,
                },
                include: {
                    topic: {
                        select: {
                            id: true,
                            rawTopicText: true,
                        },
                    },
                },
            });

        if (!reservation) {
            throw new Error("Reservation not found.");
        }

        if (reservation.status !== "ACTIVE") {
            throw new Error(
                "Only an active reservation can be released.",
            );
        }

        const manager = await ensureJournalManager(
            reservation.journalId,
        );

        await prisma.$transaction(async (tx) => {
            await tx.topicReservation.update({
                where: {
                    id: reservation.id,
                },
                data: {
                    status: "RELEASED",
                    releasedAt: new Date(),
                    releaseReason: `Manually released by ${manager.name}.`,
                },
            });

            await tx.notification.create({
                data: {
                    userId: reservation.userId,
                    type: "RESEARCH_TOOLKIT",
                    title: "Topic reservation released",
                    message: `Your reservation for "${reservation.topic.rawTopicText}" was released by a journal administrator.`,
                    link: `/toolkit/${reservation.topic.id}`,
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: manager.id,
                    action: "UPDATE",
                    entity: "TopicReservation",
                    entityId: reservation.id,

                    metadata: {
                        event:
                            "TOPIC_RESERVATION_MANUALLY_RELEASED",
                        topicId: reservation.topic.id,
                    },
                },
            });
        });

        refreshPages();

        return "Reservation released.";
    }, { action: "forceReleaseReservation" });
}

const GrantAccessSchema = z.object({
    journalId: z.string().min(1),
    email: z.string().trim().toLowerCase().email(),
    reason: z.string().trim().max(300).optional(),
});

/**
 * Manually unlocks the toolkit for a student — e.g. when their Paystack
 * payment succeeded but the site didn't record it.
 */
export async function grantToolkitAccess(
    _previousState: FormActionState,
    formData: FormData,
): Promise<FormActionState> {
    return runFormAction(async () => {
        const data = GrantAccessSchema.parse({
            journalId: formData.get("journalId"),
            email: formData.get("email"),
            reason: formData.get("reason") || undefined,
        });

        const manager = await ensureJournalManager(data.journalId);

        const [student, journal] = await Promise.all([
            prisma.user.findFirst({
                where: { email: { equals: data.email, mode: "insensitive" } },
                select: { id: true, name: true, email: true },
            }),
            prisma.journal.findUnique({
                where: { id: data.journalId },
                select: { toolkitPrice: true, currency: true },
            }),
        ]);

        if (!student) {
            throw new Error(`No account uses ${data.email}. Check the spelling.`);
        }

        if (!journal) {
            throw new Error("Journal not found.");
        }

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.toolkitAccess.upsert({
                where: {
                    userId_journalId: {
                        userId: student.id,
                        journalId: data.journalId,
                    },
                },
                create: {
                    userId: student.id,
                    journalId: data.journalId,
                    amount: journal.toolkitPrice,
                    currency: journal.currency,
                    grantedAt: now,
                },
                update: {
                    grantedAt: now,
                    revokedAt: null,
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: manager.id,
                    action: "UPDATE",
                    entity: "ToolkitAccess",
                    entityId: student.id,
                    metadata: {
                        event: "RESEARCH_TOOLKIT_ACCESS_GRANTED_MANUALLY",
                        studentEmail: student.email,
                        reason: data.reason ?? null,
                    },
                },
            });

            await tx.notification.create({
                data: {
                    userId: student.id,
                    type: "RESEARCH_TOOLKIT",
                    title: "Research Toolkit unlocked",
                    message:
                        "Your access to the full Research Topic Formulation Workbench is now active.",
                    link: "/toolkit",
                },
            });
        });

        refreshPages();

        return `Access granted to ${student.name || student.email}. They can refresh /toolkit now.`;
    }, { action: "grantToolkitAccess" });
}
