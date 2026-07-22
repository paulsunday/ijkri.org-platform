import Link from "next/link";

import LogoutButton from "@/components/auth/logout-button";
import { requireCurrentUser } from "@/lib/auth/current-user";

function getDashboardPath(
    roles: {
        role: string;
    }[],
) {
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

    return null;
}

export default async function AccountPage() {
    const user = await requireCurrentUser();

    const dashboardPath =
        getDashboardPath(user.roles);

    return (
        <main className="mx-auto max-w-3xl p-8">
            <div className="rounded-xl border bg-white p-8 shadow-sm">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                        Account
                    </p>

                    <h1 className="mt-2 text-3xl font-bold">
                        My Account
                    </h1>

                    <p className="mt-2 text-gray-600">
                        View your account information and continue to your workspace.
                    </p>
                </div>

                <div className="mt-8 grid gap-5 rounded-lg bg-gray-50 p-5 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">
                            Name
                        </p>

                        <p className="font-semibold">
                            {user.name}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Email
                        </p>

                        <p className="font-semibold">
                            {user.email}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Account status
                        </p>

                        <p className="font-semibold">
                            {user.isActive
                                ? "Active"
                                : "Inactive"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Journal roles
                        </p>

                        <p className="font-semibold">
                            {user.roles.length}
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                    {dashboardPath && (
                        <Link
                            href={dashboardPath}
                            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                        >
                            Go to Dashboard
                        </Link>
                    )}

                    <LogoutButton />
                </div>
            </div>
        </main>
    );
}