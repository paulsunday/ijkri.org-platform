import { redirect } from "next/navigation";

import { AuthorizationError } from "@/lib/errors";
import type { UserRole } from "@/lib/generated/prisma";

import {
    requireActionUser,
    requireCurrentUser,
} from "@/lib/auth/current-user";

type UserRoleRecord = {
    role: UserRole;
};

type UserWithRoles = {
    roles: UserRoleRecord[];
};

export function hasUserRole(
    userRoles: UserRoleRecord[],
    role: UserRole,
): boolean {
    return userRoles.some((roleRecord) => roleRecord.role === role);
}

export function isSuperAdmin(user: UserWithRoles): boolean {
    return hasUserRole(user.roles, "SUPER_ADMIN");
}

function hasRequiredRole(
    userRoles: UserRoleRecord[],
    requiredRoles: UserRole[],
): boolean {
    /*
     * SUPER_ADMIN inherits every platform permission.
     * Other users must hold at least one requested role.
     */
    if (hasUserRole(userRoles, "SUPER_ADMIN")) {
        return true;
    }

    return userRoles.some((roleRecord) =>
        requiredRoles.includes(roleRecord.role),
    );
}

export async function requireRole(role: UserRole) {
    const user = await requireCurrentUser();

    if (!hasRequiredRole(user.roles, [role])) {
        redirect("/unauthorized");
    }

    return user;
}

export async function requireAnyRole(roles: UserRole[]) {
    const user = await requireCurrentUser();

    if (!hasRequiredRole(user.roles, roles)) {
        redirect("/unauthorized");
    }

    return user;
}

export async function requireActionRole(role: UserRole) {
    const user = await requireActionUser();

    if (!hasRequiredRole(user.roles, [role])) {
        throw new AuthorizationError();
    }

    return user;
}

export async function requireAnyActionRole(roles: UserRole[]) {
    const user = await requireActionUser();

    if (!hasRequiredRole(user.roles, roles)) {
        throw new AuthorizationError();
    }

    return user;
}