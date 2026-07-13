import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
    const session = await auth();

    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id,
        },
        include: {
            roles: {
                include: {
                    journal: true,
                },
            },
        },
    });

    if (!user || !user.isActive) {
        return null;
    }

    return user;
}

export async function requireCurrentUser() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    return user;
}

export async function requireActionUser() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("You must be signed in to perform this action.");
    }

    return user;
}