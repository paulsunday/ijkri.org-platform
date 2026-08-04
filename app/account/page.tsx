import Link from "next/link";

import { Container } from "@/components/layout/container";
import LogoutButton from "@/components/auth/logout-button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { prisma } from "@/lib/prisma";

import {
    disconnectOrcid,
    startOrcidConnect,
    refreshOrcidData,
} from "./orcid/actions";

type OrcidEmploymentOrEducation = {
    organization: string | null;
    role: string | null;
    startYear: string | null;
    endYear: string | null;
};

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

    const orcidProfile = isOrcidVerified
        ? await prisma.orcidProfileSnapshot.findUnique({
            where: { userId: user.id },
        })
        : null;

    return (
        <Container as="main" size="3xl" className="py-8 sm:py-12">
            <div className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
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

                            <div className="mt-4 flex flex-wrap gap-3">
                                <form action={disconnectOrcid}>
                                    <button
                                        type="submit"
                                        className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                                    >
                                        Disconnect ORCID
                                    </button>
                                </form>

                                <form action={refreshOrcidData}>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                                    >
                                        Refresh ORCID Data
                                    </button>
                                </form>
                            </div>

                            {orcidProfile && (
                                <div className="mt-6 space-y-4 border-t pt-6">
                                    {orcidProfile.biography && (
                                        <div>
                                            <p className="text-sm text-gray-500">Biography</p>
                                            <p className="mt-1 whitespace-pre-wrap text-gray-800">
                                                {orcidProfile.biography}
                                            </p>
                                        </div>
                                    )}

                                    {Array.isArray(orcidProfile.employments) &&
                                        orcidProfile.employments.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-500">Employment</p>
                                                <ul className="mt-1 space-y-1 text-gray-800">
                                                    {(orcidProfile.employments as unknown as OrcidEmploymentOrEducation[]).map(
                                                        (employment, index) => (
                                                            <li key={index}>
                                                                {employment.role ?? "Role"} —{" "}
                                                                {employment.organization ?? "Organization"}
                                                                {employment.startYear
                                                                    ? ` (${employment.startYear}–${employment.endYear ?? "present"})`
                                                                    : ""}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                    {Array.isArray(orcidProfile.educations) &&
                                        orcidProfile.educations.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-500">Education</p>
                                                <ul className="mt-1 space-y-1 text-gray-800">
                                                    {(orcidProfile.educations as unknown as OrcidEmploymentOrEducation[]).map(
                                                        (education, index) => (
                                                            <li key={index}>
                                                                {education.role ?? "Degree"} —{" "}
                                                                {education.organization ?? "Institution"}
                                                                {education.startYear
                                                                    ? ` (${education.startYear}–${education.endYear ?? "present"})`
                                                                    : ""}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                    {Array.isArray(orcidProfile.keywords) &&
                                        orcidProfile.keywords.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Research Keywords
                                                </p>
                                                <p className="mt-1 text-gray-800">
                                                    {(orcidProfile.keywords as unknown as string[]).join(", ")}
                                                </p>
                                            </div>
                                        )}

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        <span>{orcidProfile.worksCount} works on ORCID</span>

                                        <a
                                            href={orcidProfile.publicProfileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-blue-700 hover:underline"
                                        >
                                            Public ORCID Profile →
                                        </a>

                                        <span>
                                            Last synced {orcidProfile.syncedAt.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )}
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
        </Container>
    );
}