import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/generated/prisma";
import { requireActionUser, requireCurrentUser } from "@/lib/auth/current-user";

export async function requireRole(role: UserRole) {
    const user = await requireCurrentUser();

    const hasRole = user.roles.some((r) => r.role === role);

    if (!hasRole) {
        redirect("/unauthorized");
    }

    return user;
}

export async function requireAnyRole(roles: UserRole[]) {
    const user = await requireCurrentUser();

    const hasRole = user.roles.some((r) => roles.includes(r.role));

    if (!hasRole) {
        redirect("/unauthorized");
    }

    return user;
}

export async function requireActionRole(role: UserRole) {
    const user = await requireActionUser();

    const hasRole = user.roles.some((r) => r.role === role);

    if (!hasRole) {
        throw new Error("Permission denied.");
    }

    return user;
}

export async function requireAnyActionRole(roles: UserRole[]) {
    const user = await requireActionUser();

    const hasRole = user.roles.some((r) => roles.includes(r.role));

    if (!hasRole) {
        throw new Error("Permission denied.");
    }

    return user;
}