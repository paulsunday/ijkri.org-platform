"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import type { UserRole } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "REVIEWER",
    "AUTHOR",
    "READER",
    "COPYEDITOR",
    "TYPESETTER",
    "PROOFREADER",
    "PUBLISHER",
] as const satisfies readonly UserRole[];

type ValidRole = (typeof VALID_ROLES)[number];

function refreshUserPages() {
    revalidatePath("/admin/users");
    revalidatePath("/editor/dashboard");
    revalidatePath("/copyeditor/dashboard");
    revalidatePath("/typesetter/dashboard");
    revalidatePath("/proofreader/dashboard");
    revalidatePath("/reviewer/dashboard");
    revalidatePath("/author/dashboard");
}

async function verifyJournalAdminPermission(
    administratorId: string,
    journalId: string,
) {
    const administrator = await prisma.user.findUnique({
        where: {
            id: administratorId,
        },
        select: {
            roles: {
                select: {
                    role: true,
                    journalId: true,
                },
            },
        },
    });

    if (!administrator) {
        throw new Error("Administrator account not found.");
    }

    const isGlobalAdministrator =
        administrator.roles.some(
            (roleRecord) =>
                roleRecord.role === "SUPER_ADMIN" ||
                roleRecord.role === "ADMIN",
        );

    if (isGlobalAdministrator) {
        return;
    }

    const hasJournalPermission =
        administrator.roles.some(
            (roleRecord) =>
                roleRecord.journalId === journalId &&
                ADMIN_ROLES.includes(roleRecord.role),
        );

    if (!hasJournalPermission) {
        throw new Error(
            "You do not have administrative permission for this journal.",
        );
    }
}

function administratorIsSuperAdmin(
    administrator: Awaited<
        ReturnType<typeof requireAnyActionRole>
    >,
) {
    return administrator.roles.some(
        (roleRecord) =>
            roleRecord.role === "SUPER_ADMIN",
    );
}

export async function createUser(formData: FormData) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const name = String(
        formData.get("name") || "",
    ).trim();

    const email = String(
        formData.get("email") || "",
    )
        .trim()
        .toLowerCase();

    const affiliation = String(
        formData.get("affiliation") || "",
    ).trim();

    const country = String(
        formData.get("country") || "",
    ).trim();

    const phone = String(
        formData.get("phone") || "",
    ).trim();

    if (!name) {
        throw new Error("User name is required.");
    }

    if (!email) {
        throw new Error("Email address is required.");
    }

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        throw new Error(
            "Enter a valid email address.",
        );
    }

    const existingUser =
        await prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                id: true,
            },
        });

    if (existingUser) {
        throw new Error(
            "A user with this email address already exists.",
        );
    }

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name,
                email,
                affiliation: affiliation || null,
                country: country || null,
                phone: phone || null,
                isActive: true,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "CREATE",
                entity: "User",
                entityId: user.id,
                metadata: {
                    event: "USER_CREATED",
                    createdUserId: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
        });
    });

    refreshUserPages();
}

export async function assignJournalRole(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const userId = String(
        formData.get("userId") || "",
    ).trim();

    const journalId = String(
        formData.get("journalId") || "",
    ).trim();

    const roleValue = String(
        formData.get("role") || "",
    ).trim();

    if (!userId) {
        throw new Error("Select a user.");
    }

    if (!journalId) {
        throw new Error("Select a journal.");
    }

    if (
        !VALID_ROLES.includes(
            roleValue as ValidRole,
        )
    ) {
        throw new Error("Select a valid role.");
    }

    const role = roleValue as ValidRole;

    await verifyJournalAdminPermission(
        administrator.id,
        journalId,
    );

    if (
        role === "SUPER_ADMIN" &&
        !administratorIsSuperAdmin(administrator)
    ) {
        throw new Error(
            "Only a super administrator can assign the SUPER_ADMIN role.",
        );
    }

    const [user, journal] = await Promise.all([
        prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
            },
        }),

        prisma.journal.findUnique({
            where: {
                id: journalId,
            },
            select: {
                id: true,
                name: true,
            },
        }),
    ]);

    if (!user) {
        throw new Error("User not found.");
    }

    if (!user.isActive) {
        throw new Error(
            "A role cannot be assigned to an inactive user.",
        );
    }

    if (!journal) {
        throw new Error("Journal not found.");
    }

    await prisma.$transaction(async (tx) => {
        const roleRecord =
            await tx.userJournalRole.upsert({
                where: {
                    userId_journalId_role: {
                        userId,
                        journalId,
                        role,
                    },
                },
                update: {},
                create: {
                    userId,
                    journalId,
                    role,
                },
            });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "CREATE",
                entity: "UserJournalRole",
                entityId: roleRecord.id,
                metadata: {
                    event: "JOURNAL_ROLE_ASSIGNED",
                    targetUserId: user.id,
                    targetUserName: user.name,
                    targetUserEmail: user.email,
                    journalId,
                    journalName: journal.name,
                    role,
                },
            },
        });
    });

    refreshUserPages();
}

export async function removeJournalRole(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const roleRecordId = String(
        formData.get("roleRecordId") || "",
    ).trim();

    if (!roleRecordId) {
        throw new Error(
            "Role record ID is missing.",
        );
    }

    const roleRecord =
        await prisma.userJournalRole.findUnique({
            where: {
                id: roleRecordId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                journal: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

    if (!roleRecord) {
        throw new Error(
            "Role assignment not found.",
        );
    }

    await verifyJournalAdminPermission(
        administrator.id,
        roleRecord.journalId,
    );

    if (
        roleRecord.role === "SUPER_ADMIN" &&
        !administratorIsSuperAdmin(administrator)
    ) {
        throw new Error(
            "Only a super administrator can remove the SUPER_ADMIN role.",
        );
    }

    if (
        roleRecord.userId === administrator.id &&
        ADMIN_ROLES.includes(
            roleRecord.role as
            (typeof ADMIN_ROLES)[number],
        )
    ) {
        throw new Error(
            "You cannot remove your own administrative role.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.userJournalRole.delete({
            where: {
                id: roleRecordId,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "DELETE",
                entity: "UserJournalRole",
                entityId: roleRecordId,
                metadata: {
                    event: "JOURNAL_ROLE_REMOVED",
                    targetUserId: roleRecord.user.id,
                    targetUserName:
                        roleRecord.user.name,
                    targetUserEmail:
                        roleRecord.user.email,
                    journalId:
                        roleRecord.journalId,
                    journalName:
                        roleRecord.journal.name,
                    role: roleRecord.role,
                },
            },
        });
    });

    refreshUserPages();
}

export async function toggleUserStatus(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    const userId = String(
        formData.get("userId") || "",
    ).trim();

    if (!userId) {
        throw new Error("User ID is missing.");
    }

    if (userId === administrator.id) {
        throw new Error(
            "You cannot deactivate your own account.",
        );
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            roles: {
                select: {
                    role: true,
                    journalId: true,
                },
            },
        },
    });

    if (!user) {
        throw new Error("User not found.");
    }

    const targetIsSuperAdmin =
        user.roles.some(
            (roleRecord) =>
                roleRecord.role === "SUPER_ADMIN",
        );

    if (
        targetIsSuperAdmin &&
        !administratorIsSuperAdmin(administrator)
    ) {
        throw new Error(
            "Only a super administrator can change the status of another super administrator.",
        );
    }

    const updatedUser =
        await prisma.$transaction(
            async (tx) => {
                const updated =
                    await tx.user.update({
                        where: {
                            id: userId,
                        },
                        data: {
                            isActive: !user.isActive,
                        },
                    });

                await tx.activityLog.create({
                    data: {
                        userId: administrator.id,
                        action: "UPDATE",
                        entity: "User",
                        entityId: userId,
                        metadata: {
                            event: updated.isActive
                                ? "USER_ACTIVATED"
                                : "USER_DEACTIVATED",
                            targetUserId: user.id,
                            targetUserName: user.name,
                            targetUserEmail: user.email,
                            previousIsActive:
                                user.isActive,
                            isActive:
                                updated.isActive,
                        },
                    },
                });

                return updated;
            },
        );

    if (!updatedUser.isActive) {
        revalidatePath(
            `/admin/users/${updatedUser.id}`,
        );
    }

    refreshUserPages();
}

export async function toggleActionAlerts(
    formData: FormData,
) {
    const administrator =
        await requireAnyActionRole(ADMIN_ROLES);

    if (!administratorIsSuperAdmin(administrator)) {
        throw new Error(
            "Only a super administrator can grant or revoke action-needed alerts.",
        );
    }

    const userId = String(
        formData.get("userId") || "",
    ).trim();

    if (!userId) {
        throw new Error("User ID is missing.");
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            name: true,
            email: true,
            receivesActionAlerts: true,
        },
    });

    if (!user) {
        throw new Error("User not found.");
    }

    await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
            where: {
                id: userId,
            },
            data: {
                receivesActionAlerts:
                    !user.receivesActionAlerts,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "User",
                entityId: userId,
                metadata: {
                    event: updated.receivesActionAlerts
                        ? "USER_ACTION_ALERTS_ENABLED"
                        : "USER_ACTION_ALERTS_DISABLED",
                    targetUserId: user.id,
                    targetUserName: user.name,
                    targetUserEmail: user.email,
                },
            },
        });
    });

    revalidatePath("/admin/users");
}
