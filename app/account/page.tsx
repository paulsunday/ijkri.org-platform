import Link from "next/link";

import LogoutButton from "@/components/auth/logout-button";
import { requireCurrentUser } from "@/lib/auth/current-user";

import {
    disconnectOrcid,
    startOrcidConnect,
} from "./orcid/actions";

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

type AccountPageProps = {
    searchParams: Promise<{
        orcidConnected?: string;
        orcidError?: string;
    }>;
};

export default async function AccountPage({
    searchParams,
}: AccountPageProps) {
    const user = await requireCurrentUser();

    const dashboardPath =
        getDashboardPath(user.roles);

    const { orcidConnected, orcidError } =
        await searchParams;

    const isOrcidVerified = Boolean(
        user.orcid && user.orcidVerifiedAt,
    );

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

                {orcidConnected && (
                    <div
                        role="status"
                        className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                    >
                        Your ORCID iD has been verified and
                        connected to your account.
                    </div>
                )}

                {orcidError && (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                    >
                        {orcidError}
                    </div>
                )}

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

                <div className="mt-6 rounded-lg border p-5">
                    <p className="text-sm text-gray-500">
                        ORCID iD
                    </p>

                    {isOrcidVerified ? (
                        <>
                            <p className="mt-2 flex flex-wrap items-center gap-2 font-semibold">
                                <a
                                    href={`https://orcid.org/${user.orcid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-700 hover:underline"
                                >
                                    {user.orcid}
                                </a>

                                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                                    Verified
                                </span>
                            </p>

                            <form
                                action={disconnectOrcid}
                                className="mt-4"
                            >
                                <button
                                    type="submit"
                                    className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                                >
                                    Disconnect ORCID
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <p className="mt-2 text-gray-600">
                                Connect your ORCID iD to
                                verifiably link your identity
                                to your published articles.
                            </p>

                            <form
                                action={startOrcidConnect}
                                className="mt-4"
                            >
                                <button
                                    type="submit"
                                    className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                                >
                                    Connect your ORCID iD
                                </button>
                            </form>
                        </>
                    )}
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