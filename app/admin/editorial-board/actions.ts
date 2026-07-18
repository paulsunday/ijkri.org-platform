"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

const EditorialBoardSchema = z.object({
    journalId: z.string().min(1),

    name: z.string().trim().min(3).max(200),

    title: z.string().trim().optional(),

    role: z.string().trim().min(2).max(100),

    affiliation: z.string().trim().optional(),

    country: z.string().trim().optional(),

    email: z
        .string()
        .trim()
        .email()
        .optional()
        .or(z.literal("")),

    photoUrl: z.string().trim().optional(),

    bio: z.string().trim().optional(),

    sortOrder: z.coerce.number().int().default(0),
});

function refreshPages() {
    revalidatePath("/admin/editorial-board");
    revalidatePath("/editorial-board");
}
function normalize(
    formData: FormData,
) {
    return EditorialBoardSchema.parse({
        journalId: formData.get("journalId"),

        name: formData.get("name"),

        title: formData.get("title"),

        role: formData.get("role"),

        affiliation: formData.get("affiliation"),

        country: formData.get("country"),

        email: formData.get("email"),

        photoUrl: formData.get("photoUrl"),

        bio: formData.get("bio"),

        sortOrder: formData.get("sortOrder"),
    });
}

async function ensureJournalManager(
    journalId: string,
) {
    const user =
        await requireAnyActionRole([
            ...MANAGER_ROLES,
        ]);

    const access =
        await prisma.userJournalRole.findFirst({
            where: {
                userId: user.id,
                journalId,

                role: {
                    in: [...MANAGER_ROLES],
                },
            },
        });

    if (!access) {
        throw new Error(
            "Permission denied.",
        );
    }

    return user;
}

export async function createEditorialBoardMember(
    formData: FormData,
) {
    const data = normalize(formData);

    const manager = await ensureJournalManager(
        data.journalId,
    );

    const journal = await prisma.journal.findUnique({
        where: {
            id: data.journalId,
        },

        select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
        },
    });

    if (!journal) {
        throw new Error(
            "The selected journal could not be found.",
        );
    }

    if (!journal.isActive) {
        throw new Error(
            "Editorial board members cannot be added to an inactive journal.",
        );
    }

    const normalizedEmail =
        data.email?.trim().toLowerCase() || null;

    const normalizedPhotoUrl =
        data.photoUrl?.trim() || null;

    if (normalizedPhotoUrl) {
        try {
            new URL(normalizedPhotoUrl);
        } catch {
            throw new Error(
                "Enter a valid photo URL.",
            );
        }
    }

    const duplicateMember =
        await prisma.editorialBoardMember.findFirst({
            where: {
                journalId: data.journalId,

                OR: [
                    {
                        name: {
                            equals: data.name,
                            mode: "insensitive",
                        },
                    },

                    ...(normalizedEmail
                        ? [
                            {
                                email: {
                                    equals: normalizedEmail,
                                    mode: "insensitive" as const,
                                },
                            },
                        ]
                        : []),
                ],
            },

            select: {
                id: true,
                name: true,
                email: true,
            },
        });

    if (duplicateMember) {
        throw new Error(
            "An editorial board member with this name or email already exists for the selected journal.",
        );
    }

    await prisma.$transaction(async (tx) => {
        const member =
            await tx.editorialBoardMember.create({
                data: {
                    journalId: data.journalId,
                    name: data.name,
                    title: data.title?.trim() || null,
                    role: data.role,
                    affiliation:
                        data.affiliation?.trim() || null,
                    country:
                        data.country?.trim() || null,
                    email: normalizedEmail,
                    photoUrl: normalizedPhotoUrl,
                    bio: data.bio?.trim() || null,
                    sortOrder: data.sortOrder,
                },
            });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "CREATE",
                entity: "EditorialBoardMember",
                entityId: member.id,

                metadata: {
                    event:
                        "EDITORIAL_BOARD_MEMBER_CREATED",
                    journalId: journal.id,
                    journalName: journal.name,
                    memberName: member.name,
                    memberRole: member.role,
                    memberEmail: member.email,
                    sortOrder: member.sortOrder,
                },
            },
        });
    });

    refreshPages();
}
export async function updateEditorialBoardMember(
    formData: FormData,
) {
    const memberId = String(
        formData.get("memberId") || "",
    ).trim();

    if (!memberId) {
        throw new Error(
            "Editorial board member ID is missing.",
        );
    }

    const data = normalize(formData);

    const manager = await ensureJournalManager(
        data.journalId,
    );

    const existingMember =
        await prisma.editorialBoardMember.findUnique({
            where: {
                id: memberId,
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        isActive: true,
                    },
                },
            },
        });

    if (!existingMember) {
        throw new Error(
            "Editorial board member not found.",
        );
    }

    if (
        existingMember.journalId !==
        data.journalId
    ) {
        throw new Error(
            "The selected journal does not match this editorial board member.",
        );
    }

    if (!existingMember.journal.isActive) {
        throw new Error(
            "Editorial board members cannot be updated for an inactive journal.",
        );
    }

    const normalizedEmail =
        data.email?.trim().toLowerCase() || null;

    const normalizedPhotoUrl =
        data.photoUrl?.trim() || null;

    if (normalizedPhotoUrl) {
        try {
            new URL(normalizedPhotoUrl);
        } catch {
            throw new Error(
                "Enter a valid photo URL.",
            );
        }
    }

    const duplicateMember =
        await prisma.editorialBoardMember.findFirst({
            where: {
                journalId: data.journalId,

                id: {
                    not: memberId,
                },

                OR: [
                    {
                        name: {
                            equals: data.name,
                            mode: "insensitive",
                        },
                    },

                    ...(normalizedEmail
                        ? [
                            {
                                email: {
                                    equals: normalizedEmail,
                                    mode: "insensitive" as const,
                                },
                            },
                        ]
                        : []),
                ],
            },

            select: {
                id: true,
            },
        });

    if (duplicateMember) {
        throw new Error(
            "Another editorial board member with this name or email already exists for the selected journal.",
        );
    }

    await prisma.$transaction(async (tx) => {
        const updatedMember =
            await tx.editorialBoardMember.update({
                where: {
                    id: memberId,
                },

                data: {
                    name: data.name,
                    title: data.title?.trim() || null,
                    role: data.role,
                    affiliation:
                        data.affiliation?.trim() || null,
                    country:
                        data.country?.trim() || null,
                    email: normalizedEmail,
                    photoUrl: normalizedPhotoUrl,
                    bio: data.bio?.trim() || null,
                    sortOrder: data.sortOrder,
                },
            });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "EditorialBoardMember",
                entityId: updatedMember.id,

                metadata: {
                    event:
                        "EDITORIAL_BOARD_MEMBER_UPDATED",
                    journalId:
                        existingMember.journal.id,
                    journalName:
                        existingMember.journal.name,
                    memberName:
                        updatedMember.name,
                    memberRole:
                        updatedMember.role,
                    memberEmail:
                        updatedMember.email,
                    sortOrder:
                        updatedMember.sortOrder,
                },
            },
        });
    });

    refreshPages();
}

export async function deleteEditorialBoardMember(
    formData: FormData,
) {
    const memberId = String(
        formData.get("memberId") || "",
    ).trim();

    if (!memberId) {
        throw new Error(
            "Editorial board member ID is missing.",
        );
    }

    const member =
        await prisma.editorialBoardMember.findUnique({
            where: {
                id: memberId,
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

    if (!member) {
        throw new Error(
            "Editorial board member not found.",
        );
    }

    const manager = await ensureJournalManager(
        member.journalId,
    );

    await prisma.$transaction(async (tx) => {
        await tx.editorialBoardMember.delete({
            where: {
                id: memberId,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "DELETE",
                entity: "EditorialBoardMember",
                entityId: memberId,

                metadata: {
                    event:
                        "EDITORIAL_BOARD_MEMBER_DELETED",
                    journalId: member.journal.id,
                    journalName: member.journal.name,
                    memberName: member.name,
                    memberRole: member.role,
                    memberEmail: member.email,
                },
            },
        });
    });

    refreshPages();
}
