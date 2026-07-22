type UserRoleItem = {
    role: string;
};

export function getRoleLandingPage(
    roles: UserRoleItem[],
): string {
    const roleNames = roles.map(
        (item) => item.role,
    );

    if (
        roleNames.includes("SUPER_ADMIN") ||
        roleNames.includes("ADMIN")
    ) {
        return "/admin";
    }

    if (
        roleNames.includes("EDITOR_IN_CHIEF") ||
        roleNames.includes("MANAGING_EDITOR") ||
        roleNames.includes("SECTION_EDITOR")
    ) {
        return "/editor/dashboard";
    }

    if (roleNames.includes("COPYEDITOR")) {
        return "/copyeditor/dashboard";
    }

    if (roleNames.includes("TYPESETTER")) {
        return "/typesetter/dashboard";
    }

    if (roleNames.includes("PROOFREADER")) {
        return "/proofreader/dashboard";
    }

    if (roleNames.includes("REVIEWER")) {
        return "/reviewer/dashboard";
    }

    if (roleNames.includes("AUTHOR")) {
        return "/author/dashboard";
    }

    return "/account";
}