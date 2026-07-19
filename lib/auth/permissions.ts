import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/generated/prisma";
import {
    requireActionUser,
    requireCurrentUser,
} from "@/lib/auth/current-user";

type UserRoleRecord = {
    role: UserRole;
};

export function hasUserRole(
    userRoles: UserRoleRecord[],
    role: UserRole,
): boolean {
    return userRoles.some(
        (roleRecord) => roleRecord.role === role,
    );
}

export function isSuperAdmin(
    user: {
        roles: UserRoleRecord[];
    },
): boolean {
    return hasUserRole(
        user.roles,
        "SUPER_ADMIN",
    );
}

function hasRequiredRole(
    userRoles: UserRoleRecord[],
    requiredRoles: UserRole[],
): boolean {
    /*
     * SUPER_ADMIN inherits every platform role.
     * Other roles must match one of the requested roles.
     */
    if (
        hasUserRole(
            userRoles,
            "SUPER_ADMIN",
        )
    ) {
        return true;
    }

    return userRoles.some(
        (roleRecord) =>
            requiredRoles.includes(
                roleRecord.role,
            ),
    );
}

export async function requireRole(
    role: UserRole,
) {
    const user =
        await requireCurrentUser();

    const permitted =
        hasRequiredRole(
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
    const user =
        await requireCurrentUser();

    const permitted =
        hasRequiredRole(
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
    const user =
        await requireActionUser();

    const permitted =
        hasRequiredRole(
            user.roles,
            [role],
        );

    if (!permitted) {
        throw new Error(
            "Permission denied.",
        );
    }

    return user;
}

export async function requireAnyActionRole(
    roles: UserRole[],
) {
    const user =
        await requireActionUser();

    const permitted =
        hasRequiredRole(
            user.roles,
            roles,
        );

    if (!permitted) {
        throw new Error(
            "Permission denied.",
        );
    }

    return user;
}