import type { UserRole } from "@/lib/generated/prisma";

const ROLE_PRIORITY: Array<{
    role: UserRole;
    destination: string;
}> = [
        {
            role: "SUPER_ADMIN",
            destination: "/admin",
        },
        {
            role: "ADMIN",
            destination: "/admin",
        },
        {
            role: "PUBLISHER",
            destination: "/admin",
        },
        {
            role: "EDITOR_IN_CHIEF",
            destination: "/editor/dashboard",
        },
        {
            role: "MANAGING_EDITOR",
            destination: "/editor/dashboard",
        },
        {
            role: "SECTION_EDITOR",
            destination: "/editor/dashboard",
        },
        {
            role: "REVIEWER",
            destination: "/reviewer/dashboard",
        },
        {
            role: "COPYEDITOR",
            destination: "/copyeditor/dashboard",
        },
        {
            role: "TYPESETTER",
            destination: "/typesetter/dashboard",
        },
        {
            role: "PROOFREADER",
            destination: "/proofreader/dashboard",
        },
        {
            role: "AUTHOR",
            destination: "/account",
        },
        {
            role: "READER",
            destination: "/account",
        },
    ];

export function getRoleLandingPage(
    roles: Array<{
        role: UserRole;
    }>,
) {
    const userRoles = new Set(
        roles.map((roleRecord) => roleRecord.role),
    );

    const matchingRoute = ROLE_PRIORITY.find(
        ({ role }) => userRoles.has(role),
    );

    return matchingRoute?.destination || "/account";
}