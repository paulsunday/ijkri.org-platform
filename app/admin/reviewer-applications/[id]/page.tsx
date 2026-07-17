import Link from "next/link";
import { notFound } from "next/navigation";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    approveReviewerApplication,
    markApplicationUnderReview,
    rejectReviewerApplication,
    reopenReviewerApplication,
} from "../actions";

const MANAGER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
];

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatDate(value: Date | null | undefined) {
    if (!value) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

function statusClass(status: string) {
    switch (status) {
        case "PENDING":
            return "border-amber-200 bg-amber-50 text-amber-800";

        case "UNDER_REVIEW":
            return "border-blue-200 bg-blue-50 text-blue-800";

        case "APPROVED":
            return "border-green-200 bg-green-50 text-green-800";

        case "REJECTED":
            return "border-red-200 bg-red-50 text-red-800";

        case "WITHDRAWN":
            return "border-slate-300 bg-slate-100 text-slate-700";

        default:
            return "border-slate-200 bg-slate-50 text-slate-700";
    }
}

export default async function ReviewerApplicationDetailsPage({
    params,
}: PageProps) {
    const manager = await requireAnyRole(
        MANAGER_ROLES,
    );

    const { id } = await params;

    const managerJournalIds = manager.roles
        .filter((role) =>
            MANAGER_ROLES.includes(role.role),
        )
        .map((role) => role.journalId);

    const application =
        await prisma.reviewerApplication.findFirst({
            where: {
                id,
                journalId: {
                    in: managerJournalIds,
                },
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                    },
                },

                applicant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        affiliation: true,
                        country: true,
                        orcid: true,
                        isActive: true,
                        createdAt: true,
                    },
                },

                reviewedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

    if (!application) {
        notFound();
    }

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Link
                    href="/admin/reviewer-applications"
                    className="font-semibold text-blue-700 hover:underline"
                >
                    ← Back to Reviewer Applications
                </Link>

                <span
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${statusClass(
                        application.status,
                    )}`}
                >
                    {formatStatus(application.status)}
                </span>
            </div>

            <header className="rounded-2xl border bg-slate-950 p-7 text-white">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
                    Reviewer Application
                </p>

                <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
                    {application.fullName}
                </h1>

                <p className="mt-3 text-slate-300">
                    {application.email}
                </p>

                <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <HeaderFact
                        label="Journal"
                        value={
                            application.journal.shortName ||
                            application.journal.name
                        }
                    />

                    <HeaderFact
                        label="Submitted"
                        value={formatDate(
                            application.submittedAt,
                        )}
                    />

                    <HeaderFact
                        label="Country"
                        value={application.country}
                    />

                    <HeaderFact
                        label="Primary Field"
                        value={application.primaryField}
                    />
                </div>
            </header>

            <section className="grid gap-8 xl:grid-cols-[1fr_340px]">
                <div className="space-y-8">
                    <ApplicationSection title="Personal Information">
                        <DetailsGrid>
                            <Detail
                                label="Full Name"
                                value={application.fullName}
                            />

                            <Detail
                                label="Email"
                                value={application.email}
                            />

                            <Detail
                                label="Phone"
                                value={
                                    application.phone ||
                                    "Not provided"
                                }
                            />

                            <Detail
                                label="Country"
                                value={application.country}
                            />
                        </DetailsGrid>
                    </ApplicationSection>

                    <ApplicationSection title="Institution and Qualification">
                        <DetailsGrid>
                            <Detail
                                label="Institution"
                                value={application.affiliation}
                            />

                            <Detail
                                label="Department"
                                value={
                                    application.department ||
                                    "Not provided"
                                }
                            />

                            <Detail
                                label="Current Position"
                                value={application.currentPosition}
                            />

                            <Detail
                                label="Highest Qualification"
                                value={
                                    application.highestQualification
                                }
                            />
                        </DetailsGrid>
                    </ApplicationSection>

                    <ApplicationSection title="Research Expertise">
                        <DetailsGrid>
                            <Detail
                                label="Primary Field"
                                value={application.primaryField}
                            />

                            <Detail
                                label="Secondary Fields"
                                value={
                                    application.secondaryFields ||
                                    "Not provided"
                                }
                            />
                        </DetailsGrid>

                        <LongDetail
                            label="Areas of Expertise"
                            value={application.areasOfExpertise}
                        />

                        <LongDetail
                            label="Research Interests"
                            value={
                                application.researchInterests ||
                                "Not provided"
                            }
                        />

                        <LongDetail
                            label="Preferred Manuscript Topics"
                            value={
                                application.preferredTopics ||
                                "Not provided"
                            }
                        />
                    </ApplicationSection>

                    <ApplicationSection title="Research and Review Experience">
                        <DetailsGrid>
                            <Detail
                                label="Research Experience"
                                value={`${application.yearsResearchExperience} years`}
                            />

                            <Detail
                                label="Review Experience"
                                value={`${application.yearsReviewExperience ??
                                    0
                                    } years`}
                            />

                            <Detail
                                label="Publication Count"
                                value={
                                    application.publicationCount !==
                                        null
                                        ? String(
                                            application.publicationCount,
                                        )
                                        : "Not provided"
                                }
                            />

                            <Detail
                                label="Availability"
                                value={
                                    application.availability ||
                                    "Not provided"
                                }
                            />
                        </DetailsGrid>

                        <LongDetail
                            label="Journals Previously Reviewed For"
                            value={
                                application.journalsReviewedFor ||
                                "Not provided"
                            }
                        />
                    </ApplicationSection>

                    <ApplicationSection title="Professional Statement">
                        <p className="whitespace-pre-wrap leading-8 text-slate-700">
                            {application.professionalStatement}
                        </p>
                    </ApplicationSection>

                    <ApplicationSection title="Scholarly Profiles and Supporting Materials">
                        <div className="flex flex-wrap gap-3">
                            <ProfileLink
                                label="ORCID"
                                value={application.orcid}
                                prefix="https://orcid.org/"
                            />

                            <ProfileLink
                                label="Google Scholar"
                                value={application.googleScholarUrl}
                            />

                            <ProfileLink
                                label="ResearchGate"
                                value={application.researchGateUrl}
                            />

                            <ProfileLink
                                label="Professional Profile"
                                value={application.profileUrl}
                            />

                            <ProfileLink
                                label="CV"
                                value={application.cvUrl}
                            />

                            <ProfileLink
                                label="Recent Publication"
                                value={
                                    application.recentPublicationUrl
                                }
                            />
                        </div>

                        <DetailsGrid>
                            <Detail
                                label="Scopus Author ID"
                                value={
                                    application.scopusId ||
                                    "Not provided"
                                }
                            />

                            <Detail
                                label="Web of Science ID"
                                value={
                                    application.webOfScienceId ||
                                    "Not provided"
                                }
                            />
                        </DetailsGrid>
                    </ApplicationSection>

                    <ApplicationSection title="Applicant Declarations">
                        <div className="grid gap-4 md:grid-cols-3">
                            <DeclarationCard
                                label="Conflict Declaration"
                                accepted={
                                    application.conflictDeclaration
                                }
                            />

                            <DeclarationCard
                                label="Reviewer Ethics Agreement"
                                accepted={
                                    application.ethicsAgreement
                                }
                            />

                            <DeclarationCard
                                label="Data Processing Consent"
                                accepted={application.dataConsent}
                            />
                        </div>
                    </ApplicationSection>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-bold">
                            Application Summary
                        </h2>

                        <dl className="mt-5 space-y-4">
                            <SidebarDetail
                                label="Status"
                                value={formatStatus(
                                    application.status,
                                )}
                            />

                            <SidebarDetail
                                label="Submitted"
                                value={formatDate(
                                    application.submittedAt,
                                )}
                            />

                            <SidebarDetail
                                label="Last Updated"
                                value={formatDate(
                                    application.updatedAt,
                                )}
                            />

                            <SidebarDetail
                                label="Reviewed At"
                                value={formatDate(
                                    application.reviewedAt,
                                )}
                            />

                            <SidebarDetail
                                label="Reviewed By"
                                value={
                                    application.reviewedBy?.name ||
                                    "Not assigned"
                                }
                            />
                        </dl>
                    </section>

                    {application.applicant && (
                        <section className="rounded-2xl border bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-bold">
                                Linked User Account
                            </h2>

                            <dl className="mt-5 space-y-4">
                                <SidebarDetail
                                    label="Account Name"
                                    value={application.applicant.name}
                                />

                                <SidebarDetail
                                    label="Account Email"
                                    value={application.applicant.email}
                                />

                                <SidebarDetail
                                    label="Status"
                                    value={
                                        application.applicant.isActive
                                            ? "Active"
                                            : "Inactive"
                                    }
                                />

                                <SidebarDetail
                                    label="Registered"
                                    value={formatDate(
                                        application.applicant.createdAt,
                                    )}
                                />
                            </dl>

                            <Link
                                href={`/admin/users?query=${encodeURIComponent(
                                    application.applicant.email,
                                )}`}
                                className="mt-5 inline-flex font-semibold text-blue-700 hover:underline"
                            >
                                Open User Management →
                            </Link>
                        </section>
                    )}

                    {application.reviewNotes && (
                        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                            <h2 className="text-xl font-bold text-blue-950">
                                Current Review Notes
                            </h2>

                            <p className="mt-4 whitespace-pre-wrap leading-7 text-blue-900">
                                {application.reviewNotes}
                            </p>
                        </section>
                    )}
                </aside>
            </section>

            <section className="rounded-2xl border bg-slate-50 p-6 sm:p-8">
                <h2 className="text-2xl font-bold">
                    Editorial Decision
                </h2>

                <p className="mt-3 text-slate-600">
                    Review the application carefully before
                    changing its status or assigning reviewer
                    access.
                </p>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    {(application.status === "PENDING" ||
                        application.status ===
                        "UNDER_REVIEW") && (
                            <form
                                action={markApplicationUnderReview}
                                className="rounded-xl border border-blue-200 bg-blue-50 p-6"
                            >
                                <input
                                    type="hidden"
                                    name="applicationId"
                                    value={application.id}
                                />

                                <h3 className="text-xl font-bold text-blue-950">
                                    Mark Under Review
                                </h3>

                                <textarea
                                    name="reviewNotes"
                                    rows={5}
                                    defaultValue={
                                        application.reviewNotes || ""
                                    }
                                    placeholder="Add internal evaluation notes..."
                                    className="mt-4 w-full rounded-lg border border-blue-200 bg-white p-4"
                                />

                                <button
                                    type="submit"
                                    className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                >
                                    Mark Application Under Review
                                </button>
                            </form>
                        )}

                    {application.status !== "APPROVED" &&
                        application.status !==
                        "WITHDRAWN" && (
                            <form
                                action={
                                    approveReviewerApplication
                                }
                                className="rounded-xl border border-green-200 bg-green-50 p-6"
                            >
                                <input
                                    type="hidden"
                                    name="applicationId"
                                    value={application.id}
                                />

                                <h3 className="text-xl font-bold text-green-950">
                                    Approve Application
                                </h3>

                                <textarea
                                    name="reviewNotes"
                                    rows={5}
                                    defaultValue={
                                        application.reviewNotes || ""
                                    }
                                    placeholder="State why the applicant is suitable..."
                                    className="mt-4 w-full rounded-lg border border-green-200 bg-white p-4"
                                />

                                <button
                                    type="submit"
                                    className="mt-4 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                                >
                                    Approve and Assign Reviewer Role
                                </button>
                            </form>
                        )}

                    {application.status !== "APPROVED" &&
                        application.status !== "REJECTED" &&
                        application.status !==
                        "WITHDRAWN" && (
                            <form
                                action={
                                    rejectReviewerApplication
                                }
                                className="rounded-xl border border-red-200 bg-red-50 p-6"
                            >
                                <input
                                    type="hidden"
                                    name="applicationId"
                                    value={application.id}
                                />

                                <h3 className="text-xl font-bold text-red-950">
                                    Reject Application
                                </h3>

                                <textarea
                                    name="reviewNotes"
                                    rows={5}
                                    required
                                    placeholder="A rejection reason is required..."
                                    className="mt-4 w-full rounded-lg border border-red-200 bg-white p-4"
                                />

                                <button
                                    type="submit"
                                    className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                                >
                                    Reject Application
                                </button>
                            </form>
                        )}

                    {(application.status === "REJECTED" ||
                        application.status ===
                        "UNDER_REVIEW") && (
                            <form
                                action={reopenReviewerApplication}
                                className="rounded-xl border border-amber-200 bg-amber-50 p-6"
                            >
                                <input
                                    type="hidden"
                                    name="applicationId"
                                    value={application.id}
                                />

                                <h3 className="text-xl font-bold text-amber-950">
                                    Return to Pending
                                </h3>

                                <p className="mt-3 leading-7 text-amber-900">
                                    Reopen this application for a fresh
                                    editorial assessment.
                                </p>

                                <button
                                    type="submit"
                                    className="mt-5 rounded-lg bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400"
                                >
                                    Reopen Application
                                </button>
                            </form>
                        )}
                </div>
            </section>
        </main>
    );
}

function HeaderFact({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-slate-400">{label}</p>
            <p className="mt-1 font-semibold text-white">
                {value}
            </p>
        </div>
    );
}

function ApplicationSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">
                {title}
            </h2>

            <div className="mt-6 space-y-6">
                {children}
            </div>
        </section>
    );
}

function DetailsGrid({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {children}
        </div>
    );
}

function Detail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </p>

            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">
                {value}
            </p>
        </div>
    );
}

function LongDetail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-5">
            <p className="font-bold">{label}</p>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                {value}
            </p>
        </div>
    );
}

function SidebarDetail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
            <dt className="text-sm text-slate-500">
                {label}
            </dt>

            <dd className="mt-1 font-semibold">
                {value}
            </dd>
        </div>
    );
}

function ProfileLink({
    label,
    value,
    prefix,
}: {
    label: string;
    value: string | null;
    prefix?: string;
}) {
    if (!value) {
        return (
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                {label}: Not provided
            </span>
        );
    }

    const href =
        prefix && !value.startsWith("http")
            ? `${prefix}${value}`
            : value;

    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-slate-50"
        >
            {label}
        </a>
    );
}

function DeclarationCard({
    label,
    accepted,
}: {
    label: string;
    accepted: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-5 ${accepted
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
        >
            <p
                className={`font-bold ${accepted
                        ? "text-green-900"
                        : "text-red-900"
                    }`}
            >
                {accepted ? "Accepted" : "Not accepted"}
            </p>

            <p
                className={`mt-2 text-sm ${accepted
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
            >
                {label}
            </p>
        </div>
    );
}