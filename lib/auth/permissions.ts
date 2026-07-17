import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/generated/prisma";
import {
    requireActionUser,
    requireCurrentUser,
} from "@/lib/auth/current-user";

const ADMIN_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
];

function hasAdministrativeAccess(
    userRoles: Array<{
        role: UserRole;
    }>,
) {
    return userRoles.some((roleRecord) =>
        ADMIN_ROLES.includes(roleRecord.role),
    );
}

function hasRequiredRole(
    userRoles: Array<{
        role: UserRole;
    }>,
    requiredRoles: UserRole[],
) {
    if (hasAdministrativeAccess(userRoles)) {
        return true;
    }

    return userRoles.some((roleRecord) =>
        requiredRoles.includes(roleRecord.role),
    );
}

export async function requireRole(
    role: UserRole,
) {
    const user = await requireCurrentUser();

    const permitted = hasRequiredRole(
        user.roles,
        [role],
    );

    if (!permitted) {
        redirect("/unauthorized");
    }

    return user;
}

export async function requireAnyRole(
    roles: UserRole[],
) {
    const user = await requireCurrentUser();

    const permitted = hasRequiredRole(
        user.roles,
        roles,
    );

    if (!permitted) {
        redirect("/unauthorized");
    }

    return user;
}

export async function requireActionRole(
    role: UserRole,
) {
    const user = await requireActionUser();

    const permitted = hasRequiredRole(
        user.roles,
        [role],
    );

    if (!permitted) {
        throw new Error("Permission denied.");
    }

    return user;
}

export async function requireAnyActionRole(
    roles: UserRole[],
) {
    const user = await requireActionUser();

    const permitted = hasRequiredRole(
        user.roles,
        roles,
    );

    if (!permitted) {
        throw new Error("Permission denied.");
    }

    return user;
}