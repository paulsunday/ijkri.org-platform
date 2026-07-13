import type { UserRole } from "@/lib/generated/prisma";

export const ADMIN_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
];

export const EDITORIAL_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
];

export const REVIEWER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "REVIEWER",
];

export const AUTHOR_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "AUTHOR",
];

export const COPYEDITOR_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "COPYEDITOR",
];

export const TYPESETTER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "TYPESETTER",
];

export const PROOFREADER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PROOFREADER",
];

export const PUBLISHER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "PUBLISHER",
];