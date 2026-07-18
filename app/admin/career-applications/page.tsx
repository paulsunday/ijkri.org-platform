import Link from "next/link";

import type {
    CareerApplicationStatus,
    CareerPosition,
    UserRole,
} from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    approveCareerApplication,
    markCareerApplicationUnderReview,
    rejectCareerApplication,
    reopenCareerApplication,
    scheduleCareerInterview,
    shortlistCareerApplication,
} from "./actions";

const MANAGER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
];

const STATUS_OPTIONS: Array<{
    value: CareerApplicationStatus;
    label: string;
}> = [
        { value: "PENDING", label: "Pending" },
        { value: "UNDER_REVIEW", label: "Under Review" },
        { value: "SHORTLISTED", label: "Shortlisted" },
        {
            value: "INTERVIEW_SCHEDULED",
            label: "Interview Scheduled",
        },
        { value: "APPROVED", label: "Approved" },
        { value: "REJECTED", label: "Rejected" },
        { value: "WITHDRAWN", label: "Withdrawn" },
    ];

const POSITION_OPTIONS: Array<{
    value: CareerPosition;
    label: string;
}> = [
        {
            value: "EDITOR_IN_CHIEF",
            label: "Editor-in-Chief",
        },
        {
            value: "MANAGING_EDITOR",
            label: "Managing Editor",
        },
        {
            value: "SECTION_EDITOR",
            label: "Section Editor",
        },
        {
            value: "REVIEWER",
            label: "Reviewer",
        },
        {
            value: "COPYEDITOR",
            label: "Copyeditor",
        },
        {
            value: "PROOFREADER",
            label: "Proofreader",
        },
        {
            value: "TYPESETTER",
            label: "Typesetter",
        },
        {
            value: "EDITORIAL_ASSISTANT",
            label: "Editorial Assistant",
        },
    ];

type CareerApplicationsPageProps = {
    searchParams: Promise<{
        journalId?: string;
        status?: string;
        position?: string;
        query?: string;
        sort?: string;
    }>;
};

function formatEnum(value: string) {
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
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);
}

function formatDateTime(
    value: Date | null | undefined,
) {
    if (!value) {
        return "Not scheduled";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

function statusClass(
    status: CareerApplicationStatus,
) {
    switch (status) {
        case "PENDING":
            return "border-slate-200 bg-slate-100 text-slate-800";

        case "UNDER_REVIEW":
            return "border-blue-200 bg-blue-50 text-blue-800";

        case "SHORTLISTED":
            return "border-purple-200 bg-purple-50 text-purple-800";

        case "INTERVIEW_SCHEDULED":
            return "border-orange-200 bg-orange-50 text-orange-800";

        case "APPROVED":
            return "border-green-200 bg-green-50 text-green-800";

        case "REJECTED":
            return "border-red-200 bg-red-50 text-red-800";

        case "WITHDRAWN":
            return "border-slate-300 bg-slate-200 text-slate-700";
    }
}

export default async function CareerApplicationsPage({
    searchParams,
}: CareerApplicationsPageProps) {
    const manager = await requireAnyRole(
        MANAGER_ROLES,
    );

    const {
        journalId,
        status,
        position,
        query,
        sort,
    } = await searchParams;

    const managerJournalIds = manager.roles
        .filter((assignment) =>
            MANAGER_ROLES.includes(
                assignment.role,
            ),
        )
        .map(
            (assignment) =>
                assignment.journalId,
        );

    const journals = await prisma.journal.findMany({
        where: {
            id: {
                in: managerJournalIds,
            },
        },

        select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
        },

        orderBy: {
            name: "asc",
        },
    });

    const selectedJournalId =
        journalId &&
            journals.some(
                (journal) =>
                    journal.id === journalId,
            )
            ? journalId
            : journals[0]?.id || null;

    const selectedStatus =
        STATUS_OPTIONS.some(
            (option) =>
                option.value === status,
        )
            ? (status as CareerApplicationStatus)
            : null;

    const selectedPosition =
        POSITION_OPTIONS.some(
            (option) =>
                option.value === position,
        )
            ? (position as CareerPosition)
            : null;

    const searchQuery =
        query?.trim() || "";

    const sortDirection =
        sort === "oldest" ? "asc" : "desc";

    const applications = selectedJournalId
        ? await prisma.careerApplication.findMany({
            where: {
                journalId: selectedJournalId,

                ...(selectedStatus
                    ? {
                        status: selectedStatus,
                    }
                    : {}),

                ...(selectedPosition
                    ? {
                        position:
                            selectedPosition,
                    }
                    : {}),

                ...(searchQuery
                    ? {
                        OR: [
                            {
                                fullName: {
                                    contains:
                                        searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                email: {
                                    contains:
                                        searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                affiliation: {
                                    contains:
                                        searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                country: {
                                    contains:
                                        searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                areasOfExpertise: {
                                    contains:
                                        searchQuery,
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
                submittedAt:
                    sortDirection,
            },
        })
        : [];

    const groupedCounts =
        selectedJournalId
            ? await prisma.careerApplication.groupBy({
                by: ["status"],

                where: {
                    journalId:
                        selectedJournalId,
                },

                _count: {
                    _all: true,
                },
            })
            : [];

    function countStatus(
        targetStatus: CareerApplicationStatus,
    ) {
        return (
            groupedCounts.find(
                (entry) =>
                    entry.status === targetStatus,
            )?._count._all ?? 0
        );
    }

    const totalApplications =
        groupedCounts.reduce(
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
            label: "Shortlisted",
            value: countStatus(
                "SHORTLISTED",
            ),
        },
        {
            label: "Interviews",
            value: countStatus(
                "INTERVIEW_SCHEDULED",
            ),
        },
        {
            label: "Approved",
            value: countStatus(
                "APPROVED",
            ),
        },
        {
            label: "Rejected",
            value: countStatus(
                "REJECTED",
            ),
        },
    ];

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Recruitment Administration
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Career Applications
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Review applicants, shortlist
                    qualified candidates, schedule
                    interviews and approve or reject
                    editorial and production appointments.
                </p>
            </header>

            {journals.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        No journal access found
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Your account does not currently
                        have permission to manage career
                        applications.
                    </p>
                </section>
            ) : (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
                        {statistics.map(
                            (statistic) => (
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
                            ),
                        )}
                    </section>

                    <section className="rounded-2xl border bg-white p-6 shadow-sm">
                        <form
                            method="get"
                            className="grid gap-5 xl:grid-cols-[220px_1fr_220px_220px_150px_auto]"
                        >
                            <FilterSelect
                                label="Journal"
                                name="journalId"
                                defaultValue={
                                    selectedJournalId || ""
                                }
                                options={journals.map(
                                    (journal) => ({
                                        value: journal.id,
                                        label:
                                            journal.shortName ||
                                            journal.name,
                                    }),
                                )}
                            />

                            <div>
                                <label
                                    htmlFor="query"
                                    className="mb-2 block text-sm font-semibold"
                                >
                                    Search
                                </label>

                                <input
                                    id="query"
                                    name="query"
                                    type="search"
                                    defaultValue={searchQuery}
                                    placeholder="Name, email, institution, country or expertise"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                />
                            </div>

                            <FilterSelect
                                label="Status"
                                name="status"
                                defaultValue={
                                    selectedStatus || ""
                                }
                                includeAll
                                options={STATUS_OPTIONS}
                            />

                            <FilterSelect
                                label="Position"
                                name="position"
                                defaultValue={
                                    selectedPosition || ""
                                }
                                includeAll
                                options={POSITION_OPTIONS}
                            />

                            <FilterSelect
                                label="Sort"
                                name="sort"
                                defaultValue={
                                    sortDirection === "asc"
                                        ? "oldest"
                                        : "newest"
                                }
                                options={[
                                    {
                                        value: "newest",
                                        label: "Newest",
                                    },
                                    {
                                        value: "oldest",
                                        label: "Oldest",
                                    },
                                ]}
                            />

                            <div className="flex items-end gap-3">
                                <button
                                    type="submit"
                                    className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                                >
                                    Apply
                                </button>

                                <Link
                                    href={
                                        selectedJournalId
                                            ? `/admin/career-applications?journalId=${selectedJournalId}`
                                            : "/admin/career-applications"
                                    }
                                    className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                                >
                                    Reset
                                </Link>
                            </div>
                        </form>
                    </section>

                    <section className="space-y-6">
                        {applications.length === 0 ? (
                            <div className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                                <h2 className="text-xl font-bold">
                                    No applications found
                                </h2>

                                <p className="mt-3 text-slate-600">
                                    No career applications match
                                    the current journal, search or
                                    filter selection.
                                </p>
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
                                                <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700">
                                                    {formatEnum(
                                                        application.position,
                                                    )}
                                                </p>

                                                <h2 className="mt-2 text-2xl font-bold">
                                                    {
                                                        application.fullName
                                                    }
                                                </h2>

                                                <p className="mt-1 text-slate-600">
                                                    {application.email}
                                                </p>

                                                <p className="mt-2 text-sm text-slate-500">
                                                    {application.affiliation ||
                                                        "Institution not provided"}

                                                    {" • "}

                                                    {
                                                        application.country
                                                    }
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full border px-4 py-2 text-sm font-bold ${statusClass(
                                                    application.status,
                                                )}`}
                                            >
                                                {formatEnum(
                                                    application.status,
                                                )}
                                            </span>
                                        </div>

                                        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                                            <SummaryItem
                                                label="Journal"
                                                value={
                                                    application.journal
                                                        .shortName ||
                                                    application.journal
                                                        .name
                                                }
                                            />

                                            <SummaryItem
                                                label="Qualification"
                                                value={
                                                    application.highestQualification
                                                }
                                            />

                                            <SummaryItem
                                                label="Experience"
                                                value={`${application.yearsExperience} years`}
                                            />

                                            <SummaryItem
                                                label="Publications"
                                                value={
                                                    application.publicationCount !==
                                                        null
                                                        ? String(
                                                            application.publicationCount,
                                                        )
                                                        : "Not provided"
                                                }
                                            />

                                            <SummaryItem
                                                label="Submitted"
                                                value={formatDate(
                                                    application.submittedAt,
                                                )}
                                            />
                                        </div>

                                        <div className="mt-6 grid gap-6 lg:grid-cols-2">
                                            <ContentPanel
                                                title="Professional statement"
                                                text={
                                                    application.professionalStatement
                                                }
                                            />

                                            <ContentPanel
                                                title="Areas of expertise"
                                                text={
                                                    application.areasOfExpertise ||
                                                    "Not provided"
                                                }
                                            />
                                        </div>

                                        <details className="mt-6 rounded-xl border">
                                            <summary className="cursor-pointer p-5 font-bold">
                                                View Full Application
                                            </summary>

                                            <div className="space-y-8 border-t p-5">
                                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                                    <SummaryItem
                                                        label="Phone"
                                                        value={
                                                            application.phone ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Department"
                                                        value={
                                                            application.department ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Current Position"
                                                        value={
                                                            application.currentPosition ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Field of Study"
                                                        value={
                                                            application.fieldOfStudy ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Availability"
                                                        value={
                                                            application.availability ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Compensation Expectation"
                                                        value={
                                                            application.salaryExpectation ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="ORCID"
                                                        value={
                                                            application.orcid ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Scopus ID"
                                                        value={
                                                            application.scopusId ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Web of Science ID"
                                                        value={
                                                            application.webOfScienceId ||
                                                            "Not provided"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Interview"
                                                        value={formatDateTime(
                                                            application.interviewDate,
                                                        )}
                                                    />

                                                    <SummaryItem
                                                        label="Reviewed By"
                                                        value={
                                                            application.reviewedBy
                                                                ?.name ||
                                                            "Not assigned"
                                                        }
                                                    />

                                                    <SummaryItem
                                                        label="Reviewed At"
                                                        value={formatDateTime(
                                                            application.reviewedAt,
                                                        )}
                                                    />
                                                </div>

                                                <ContentPanel
                                                    title="Professional Skills"
                                                    text={
                                                        application.professionalSkills ||
                                                        "Not provided"
                                                    }
                                                />

                                                {application.reviewNotes && (
                                                    <ContentPanel
                                                        title="Internal Review Notes"
                                                        text={
                                                            application.reviewNotes
                                                        }
                                                    />
                                                )}

                                                <div className="flex flex-wrap gap-3">
                                                    <ExternalLink
                                                        label="Google Scholar"
                                                        href={
                                                            application.googleScholarUrl
                                                        }
                                                    />

                                                    <ExternalLink
                                                        label="ResearchGate"
                                                        href={
                                                            application.researchGateUrl
                                                        }
                                                    />

                                                    <ExternalLink
                                                        label="LinkedIn"
                                                        href={
                                                            application.linkedinUrl
                                                        }
                                                    />

                                                    <ExternalLink
                                                        label="CV"
                                                        href={
                                                            application.cvUrl
                                                        }
                                                    />

                                                    <ExternalLink
                                                        label="Cover Letter"
                                                        href={
                                                            application.coverLetterUrl
                                                        }
                                                    />

                                                    <ExternalLink
                                                        label="Certificates"
                                                        href={
                                                            application.certificatesUrl
                                                        }
                                                    />

                                                    <ExternalLink
                                                        label="Portfolio"
                                                        href={
                                                            application.portfolioUrl
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <DeclarationCard
                                                        label="Information declaration"
                                                        accepted={
                                                            application.declarationAccepted
                                                        }
                                                    />

                                                    <DeclarationCard
                                                        label="Data processing consent"
                                                        accepted={
                                                            application.consentAccepted
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </details>

                                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                                            {application.status !==
                                                "APPROVED" &&
                                                application.status !==
                                                "REJECTED" &&
                                                application.status !==
                                                "WITHDRAWN" && (
                                                    <form
                                                        action={
                                                            markCareerApplicationUnderReview
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

                                                        <ActionTextarea
                                                            id={`review-${application.id}`}
                                                            label="Review note"
                                                            defaultValue={
                                                                application.reviewNotes ||
                                                                ""
                                                            }
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
                                                "REJECTED" &&
                                                application.status !==
                                                "WITHDRAWN" && (
                                                    <form
                                                        action={
                                                            shortlistCareerApplication
                                                        }
                                                        className="rounded-xl border border-purple-200 bg-purple-50 p-5"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="applicationId"
                                                            value={
                                                                application.id
                                                            }
                                                        />

                                                        <ActionTextarea
                                                            id={`shortlist-${application.id}`}
                                                            label="Shortlisting note"
                                                            defaultValue={
                                                                application.reviewNotes ||
                                                                ""
                                                            }
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="mt-4 rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
                                                        >
                                                            Shortlist Applicant
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
                                                            scheduleCareerInterview
                                                        }
                                                        className="rounded-xl border border-orange-200 bg-orange-50 p-5"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="applicationId"
                                                            value={
                                                                application.id
                                                            }
                                                        />

                                                        <label
                                                            htmlFor={`interview-${application.id}`}
                                                            className="font-bold text-orange-950"
                                                        >
                                                            Interview date and time
                                                        </label>

                                                        <input
                                                            id={`interview-${application.id}`}
                                                            name="interviewDate"
                                                            type="datetime-local"
                                                            required
                                                            className="mt-3 w-full rounded-lg border border-orange-200 bg-white p-3"
                                                        />

                                                        <ActionTextarea
                                                            id={`interview-note-${application.id}`}
                                                            label="Interview note"
                                                            defaultValue={
                                                                application.reviewNotes ||
                                                                ""
                                                            }
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="mt-4 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
                                                        >
                                                            Schedule Interview
                                                        </button>
                                                    </form>
                                                )}

                                            {application.status !==
                                                "APPROVED" &&
                                                application.status !==
                                                "WITHDRAWN" && (
                                                    <form
                                                        action={
                                                            approveCareerApplication
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

                                                        <ActionTextarea
                                                            id={`approve-${application.id}`}
                                                            label="Approval note"
                                                            defaultValue={
                                                                application.reviewNotes ||
                                                                ""
                                                            }
                                                        />

                                                        <button
                                                            type="submit"
                                                            className="mt-4 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                                                        >
                                                            Approve Application
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
                                                            rejectCareerApplication
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

                                                        <ActionTextarea
                                                            id={`reject-${application.id}`}
                                                            label="Rejection reason"
                                                            required
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
                                                "UNDER_REVIEW" ||
                                                application.status ===
                                                "SHORTLISTED" ||
                                                application.status ===
                                                "INTERVIEW_SCHEDULED") && (
                                                    <form
                                                        action={
                                                            reopenCareerApplication
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
                                                            Reopen Application
                                                        </p>

                                                        <p className="mt-2 text-sm leading-6 text-amber-900">
                                                            Return this application to
                                                            pending status and clear the
                                                            current interview and review
                                                            information.
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
                </>
            )}
        </main>
    );
}

function FilterSelect({
    label,
    name,
    defaultValue,
    options,
    includeAll = false,
}: {
    label: string;
    name: string;
    defaultValue: string;
    options: Array<{
        value: string;
        label: string;
    }>;
    includeAll?: boolean;
}) {
    return (
        <div>
            <label
                htmlFor={name}
                className="mb-2 block text-sm font-semibold"
            >
                {label}
            </label>

            <select
                id={name}
                name={name}
                defaultValue={defaultValue}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
            >
                {includeAll && (
                    <option value="">
                        All {label.toLowerCase()}s
                    </option>
                )}

                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function SummaryItem({
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

function ContentPanel({
    title,
    text,
}: {
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-5">
            <h3 className="font-bold">
                {title}
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                {text}
            </p>
        </div>
    );
}

function ExternalLink({
    label,
    href,
}: {
    label: string;
    href: string | null;
}) {
    if (!href) {
        return null;
    }

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
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
                }`}
        >
            <p className="font-bold">
                {accepted
                    ? "Accepted"
                    : "Not accepted"}
            </p>

            <p className="mt-2 text-sm">
                {label}
            </p>
        </div>
    );
}

function ActionTextarea({
    id,
    label,
    defaultValue = "",
    required = false,
}: {
    id: string;
    label: string;
    defaultValue?: string;
    required?: boolean;
}) {
    return (
        <div className="mt-4">
            <label
                htmlFor={id}
                className="font-bold"
            >
                {label}
            </label>

            <textarea
                id={id}
                name="reviewNotes"
                rows={4}
                required={required}
                defaultValue={defaultValue}
                className="mt-3 w-full rounded-lg border bg-white p-3"
            />
        </div>
    );
}
