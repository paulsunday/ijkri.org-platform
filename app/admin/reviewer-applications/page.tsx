import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    approveReviewerApplication,
    markApplicationUnderReview,
    rejectReviewerApplication,
    reopenReviewerApplication,
} from "./actions";

const REVIEWER_APPLICATION_MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
] as const;

type ReviewerApplicationsPageProps = {
    searchParams: Promise<{
        status?: string;
        query?: string;
    }>;
};

function formatStatus(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

function formatDate(
    value: Date | null | undefined,
) {
    if (!value) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(value);
}

function statusClass(status: string) {
    switch (status) {
        case "PENDING":
            return "bg-yellow-100 text-yellow-800";

        case "UNDER_REVIEW":
            return "bg-blue-100 text-blue-800";

        case "APPROVED":
            return "bg-green-100 text-green-800";

        case "REJECTED":
            return "bg-red-100 text-red-800";

        case "WITHDRAWN":
            return "bg-slate-200 text-slate-700";

        default:
            return "bg-slate-100 text-slate-700";
    }
}

export default async function ReviewerApplicationsPage({
    searchParams,
}: ReviewerApplicationsPageProps) {
    const manager = await requireAnyRole([
        ...REVIEWER_APPLICATION_MANAGER_ROLES,
    ]);

    const { status, query } =
        await searchParams;

    const managerJournalIds =
        manager.roles
            .filter((role) =>
                REVIEWER_APPLICATION_MANAGER_ROLES.includes(
                    role.role as
                    (typeof REVIEWER_APPLICATION_MANAGER_ROLES)[number],
                ),
            )
            .map((role) => role.journalId);

    const validStatuses = [
        "PENDING",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
    ];

    const selectedStatus =
        status &&
            validStatuses.includes(
                status.toUpperCase(),
            )
            ? status.toUpperCase()
            : null;

    const searchQuery =
        query?.trim() || "";

    const applications =
        await prisma.reviewerApplication.findMany({
            where: {
                journalId: {
                    in: managerJournalIds,
                },

                ...(selectedStatus
                    ? {
                        status: selectedStatus as
                            | "PENDING"
                            | "UNDER_REVIEW"
                            | "APPROVED"
                            | "REJECTED"
                            | "WITHDRAWN",
                    }
                    : {}),

                ...(searchQuery
                    ? {
                        OR: [
                            {
                                fullName: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                email: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                affiliation: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                country: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                primaryField: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                areasOfExpertise: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                    : {}),
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
                        isActive: true,
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

            orderBy: {
                submittedAt: "desc",
            },
        });

    const counts =
        await prisma.reviewerApplication.groupBy({
            by: ["status"],

            where: {
                journalId: {
                    in: managerJournalIds,
                },
            },

            _count: {
                _all: true,
            },
        });

    function countStatus(
        statusName: string,
    ) {
        return (
            counts.find(
                (entry) =>
                    entry.status === statusName,
            )?._count._all ?? 0
        );
    }

    const totalApplications =
        counts.reduce(
            (total, entry) =>
                total + entry._count._all,
            0,
        );

    const statistics = [
        {
            label: "Total Applications",
            value: totalApplications,
        },
        {
            label: "Pending",
            value: countStatus("PENDING"),
        },
        {
            label: "Under Review",
            value: countStatus(
                "UNDER_REVIEW",
            ),
        },
        {
            label: "Approved",
            value: countStatus("APPROVED"),
        },
        {
            label: "Rejected",
            value: countStatus("REJECTED"),
        },
    ];

    return (
        <main className="p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Reviewer Recruitment
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Reviewer Applications
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Review applicant qualifications,
                    research expertise, publication
                    profiles and reviewer declarations
                    before assigning journal reviewer
                    access.
                </p>
            </header>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {statistics.map((statistic) => (
                    <article
                        key={statistic.label}
                        className="rounded-xl border bg-slate-50 p-5"
                    >
                        <p className="text-sm text-slate-500">
                            {statistic.label}
                        </p>

                        <p className="mt-2 text-3xl font-bold">
                            {statistic.value}
                        </p>
                    </article>
                ))}
            </section>

            <section className="mt-8 rounded-xl border bg-white p-5">
                <form
                    method="get"
                    className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"
                >
                    <div>
                        <label
                            htmlFor="query"
                            className="mb-2 block text-sm font-semibold"
                        >
                            Search applications
                        </label>

                        <input
                            id="query"
                            name="query"
                            type="search"
                            defaultValue={searchQuery}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3"
                            placeholder="Name, email, institution, country or expertise"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="status"
                            className="mb-2 block text-sm font-semibold"
                        >
                            Status
                        </label>

                        <select
                            id="status"
                            name="status"
                            defaultValue={
                                selectedStatus || ""
                            }
                            className="w-full rounded-lg border border-slate-300 px-4 py-3"
                        >
                            <option value="">
                                All statuses
                            </option>

                            <option value="PENDING">
                                Pending
                            </option>

                            <option value="UNDER_REVIEW">
                                Under Review
                            </option>

                            <option value="APPROVED">
                                Approved
                            </option>

                            <option value="REJECTED">
                                Rejected
                            </option>

                            <option value="WITHDRAWN">
                                Withdrawn
                            </option>
                        </select>
                    </div>

                    <div className="flex items-end gap-3">
                        <button
                            type="submit"
                            className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                        >
                            Apply Filters
                        </button>

                        <Link
                            href="/admin/reviewer-applications"
                            className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                        >
                            Reset
                        </Link>
                    </div>
                </form>
            </section>

            <section className="mt-8 space-y-6">
                {applications.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-slate-50 p-10 text-center text-slate-600">
                        No reviewer applications match
                        the selected filters.
                    </div>
                ) : (
                    applications.map(
                        (application) => (
                            <article
                                key={application.id}
                                className="rounded-2xl border bg-white p-6 shadow-sm"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold">
                                            {application.fullName}
                                        </h2>

                                        <p className="mt-1 text-slate-600">
                                            {application.email}
                                        </p>

                                        <p className="mt-2 text-sm text-slate-500">
                                            {
                                                application.affiliation
                                            }
                                            {" · "}
                                            {application.country}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
                                            application.status,
                                        )}`}
                                    >
                                        {formatStatus(
                                            application.status,
                                        )}
                                    </span>
                                </div>

                                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Journal
                                        </p>

                                        <p className="font-semibold">
                                            {application.journal
                                                .shortName ||
                                                application.journal
                                                    .name}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Primary field
                                        </p>

                                        <p className="font-semibold">
                                            {
                                                application.primaryField
                                            }
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Current position
                                        </p>

                                        <p className="font-semibold">
                                            {
                                                application.currentPosition
                                            }
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Highest qualification
                                        </p>

                                        <p className="font-semibold">
                                            {
                                                application.highestQualification
                                            }
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Research experience
                                        </p>

                                        <p className="font-semibold">
                                            {
                                                application.yearsResearchExperience
                                            }{" "}
                                            years
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Review experience
                                        </p>

                                        <p className="font-semibold">
                                            {application.yearsReviewExperience ??
                                                0}{" "}
                                            years
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Publications
                                        </p>

                                        <p className="font-semibold">
                                            {application.publicationCount ??
                                                "Not specified"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Submitted
                                        </p>

                                        <p className="font-semibold">
                                            {formatDate(
                                                application.submittedAt,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                                    <div className="rounded-xl bg-slate-50 p-5">
                                        <h3 className="font-bold">
                                            Areas of expertise
                                        </h3>

                                        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                                            {
                                                application.areasOfExpertise
                                            }
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-5">
                                        <h3 className="font-bold">
                                            Professional statement
                                        </h3>

                                        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                                            {
                                                application.professionalStatement
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Link
                                        href={`/admin/reviewer-applications/${application.id}`}
                                        className="inline-flex rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                                    >
                                        View Full Application
                                    </Link>

                                    {application.applicant && (
                                        <Link
                                            href={`/admin/users?query=${encodeURIComponent(
                                                application.applicant
                                                    .email,
                                            )}`}
                                            className="inline-flex rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            View Linked User
                                        </Link>
                                    )}
                                </div>

                                <details className="mt-6 rounded-xl border">
                                    <summary className="cursor-pointer p-5 font-bold">
                                        Quick application preview
                                    </summary>

                                    <div className="border-t p-5">
                                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                            <Detail
                                                label="Phone"
                                                value={
                                                    application.phone ||
                                                    "Not provided"
                                                }
                                            />

                                            <Detail
                                                label="Department"
                                                value={
                                                    application.department ||
                                                    "Not provided"
                                                }
                                            />

                                            <Detail
                                                label="Secondary fields"
                                                value={
                                                    application.secondaryFields ||
                                                    "Not provided"
                                                }
                                            />

                                            <Detail
                                                label="Research interests"
                                                value={
                                                    application.researchInterests ||
                                                    "Not provided"
                                                }
                                            />

                                            <Detail
                                                label="Preferred topics"
                                                value={
                                                    application.preferredTopics ||
                                                    "Not provided"
                                                }
                                            />

                                            <Detail
                                                label="Availability"
                                                value={
                                                    application.availability ||
                                                    "Not provided"
                                                }
                                            />

                                            <Detail
                                                label="ORCID"
                                                value={
                                                    application.orcid ||
                                                    "Not provided"
                                                }
                                            />

                                            <Detail
                                                label="Scopus ID"
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

                                            <Detail
                                                label="Previously reviewed for"
                                                value={
                                                    application.journalsReviewedFor ||
                                                    "Not provided"
                                                }
                                            />
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-3">
                                            {application.googleScholarUrl && (
                                                <ExternalLink
                                                    href={
                                                        application.googleScholarUrl
                                                    }
                                                    label="Google Scholar"
                                                />
                                            )}

                                            {application.researchGateUrl && (
                                                <ExternalLink
                                                    href={
                                                        application.researchGateUrl
                                                    }
                                                    label="ResearchGate"
                                                />
                                            )}

                                            {application.profileUrl && (
                                                <ExternalLink
                                                    href={
                                                        application.profileUrl
                                                    }
                                                    label="Professional Profile"
                                                />
                                            )}

                                            {application.cvUrl && (
                                                <ExternalLink
                                                    href={
                                                        application.cvUrl
                                                    }
                                                    label="View CV"
                                                />
                                            )}

                                            {application.recentPublicationUrl && (
                                                <ExternalLink
                                                    href={
                                                        application.recentPublicationUrl
                                                    }
                                                    label="Recent Publication"
                                                />
                                            )}
                                        </div>

                                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                                            <DeclarationStatus
                                                label="Conflict declaration"
                                                accepted={
                                                    application.conflictDeclaration
                                                }
                                            />

                                            <DeclarationStatus
                                                label="Ethics agreement"
                                                accepted={
                                                    application.ethicsAgreement
                                                }
                                            />

                                            <DeclarationStatus
                                                label="Data consent"
                                                accepted={
                                                    application.dataConsent
                                                }
                                            />
                                        </div>

                                        {application.reviewNotes && (
                                            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
                                                <p className="font-bold text-blue-950">
                                                    Review notes
                                                </p>

                                                <p className="mt-2 whitespace-pre-wrap text-blue-900">
                                                    {
                                                        application.reviewNotes
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {application.reviewedBy && (
                                            <p className="mt-5 text-sm text-slate-500">
                                                Reviewed by{" "}
                                                <strong>
                                                    {
                                                        application.reviewedBy
                                                            .name
                                                    }
                                                </strong>

                                                {application.reviewedAt
                                                    ? ` on ${formatDate(
                                                        application.reviewedAt,
                                                    )}`
                                                    : ""}
                                            </p>
                                        )}
                                    </div>
                                </details>

                                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                                    {(application.status ===
                                        "PENDING" ||
                                        application.status ===
                                        "UNDER_REVIEW") && (
                                            <form
                                                action={
                                                    markApplicationUnderReview
                                                }
                                                className="rounded-xl border border-blue-200 bg-blue-50 p-5"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="applicationId"
                                                    value={
                                                        application.id
                                                    }
                                                />

                                                <label
                                                    htmlFor={`under-review-${application.id}`}
                                                    className="font-bold text-blue-950"
                                                >
                                                    Internal review note
                                                </label>

                                                <textarea
                                                    id={`under-review-${application.id}`}
                                                    name="reviewNotes"
                                                    rows={4}
                                                    defaultValue={
                                                        application.reviewNotes ||
                                                        ""
                                                    }
                                                    className="mt-3 w-full rounded-lg border border-blue-200 bg-white p-3"
                                                />

                                                <button
                                                    type="submit"
                                                    className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                                                >
                                                    Mark Under Review
                                                </button>
                                            </form>
                                        )}

                                    {application.status !==
                                        "APPROVED" &&
                                        application.status !==
                                        "WITHDRAWN" && (
                                            <form
                                                action={
                                                    approveReviewerApplication
                                                }
                                                className="rounded-xl border border-green-200 bg-green-50 p-5"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="applicationId"
                                                    value={
                                                        application.id
                                                    }
                                                />

                                                <label
                                                    htmlFor={`approve-${application.id}`}
                                                    className="font-bold text-green-950"
                                                >
                                                    Approval note
                                                </label>

                                                <textarea
                                                    id={`approve-${application.id}`}
                                                    name="reviewNotes"
                                                    rows={4}
                                                    defaultValue={
                                                        application.reviewNotes ||
                                                        ""
                                                    }
                                                    className="mt-3 w-full rounded-lg border border-green-200 bg-white p-3"
                                                    placeholder="State why the applicant is suitable."
                                                />

                                                <button
                                                    type="submit"
                                                    className="mt-4 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                                                >
                                                    Approve and Assign Reviewer Role
                                                </button>
                                            </form>
                                        )}

                                    {application.status !==
                                        "APPROVED" &&
                                        application.status !==
                                        "REJECTED" &&
                                        application.status !==
                                        "WITHDRAWN" && (
                                            <form
                                                action={
                                                    rejectReviewerApplication
                                                }
                                                className="rounded-xl border border-red-200 bg-red-50 p-5"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="applicationId"
                                                    value={
                                                        application.id
                                                    }
                                                />

                                                <label
                                                    htmlFor={`reject-${application.id}`}
                                                    className="font-bold text-red-950"
                                                >
                                                    Rejection reason
                                                </label>

                                                <textarea
                                                    id={`reject-${application.id}`}
                                                    name="reviewNotes"
                                                    rows={4}
                                                    required
                                                    className="mt-3 w-full rounded-lg border border-red-200 bg-white p-3"
                                                />

                                                <button
                                                    type="submit"
                                                    className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                                                >
                                                    Reject Application
                                                </button>
                                            </form>
                                        )}

                                    {(application.status ===
                                        "REJECTED" ||
                                        application.status ===
                                        "UNDER_REVIEW") && (
                                            <form
                                                action={
                                                    reopenReviewerApplication
                                                }
                                                className="rounded-xl border border-amber-200 bg-amber-50 p-5"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="applicationId"
                                                    value={
                                                        application.id
                                                    }
                                                />

                                                <p className="font-bold text-amber-950">
                                                    Reopen application
                                                </p>

                                                <p className="mt-2 text-sm leading-6 text-amber-900">
                                                    Return this application
                                                    to pending status for a
                                                    new review.
                                                </p>

                                                <button
                                                    type="submit"
                                                    className="mt-4 rounded-lg bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400"
                                                >
                                                    Return to Pending
                                                </button>
                                            </form>
                                        )}
                                </div>
                            </article>
                        ),
                    )
                )}
            </section>
        </main>
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
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-1 whitespace-pre-wrap font-semibold">
                {value}
            </p>
        </div>
    );
}

function ExternalLink({
    href,
    label,
}: {
    href: string;
    label: string;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
            {label}
        </a>
    );
}

function DeclarationStatus({
    label,
    accepted,
}: {
    label: string;
    accepted: boolean;
}) {
    return (
        <div
            className={`rounded-lg border p-4 ${accepted
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
                }`}
        >
            <p className="font-semibold">
                {accepted
                    ? "Accepted"
                    : "Not accepted"}
            </p>

            <p className="mt-1 text-sm">
                {label}
            </p>
        </div>
    );
}