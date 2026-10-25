
import Link from "next/link";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    CreateBoardMemberForm,
    DeleteBoardMemberForm,
    UpdateBoardMemberForm,
} from "./BoardMemberForms";

const MANAGER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
];

const BOARD_ROLES = [
    "Editor-in-Chief",
    "Managing Editor",
    "Associate Editor",
    "Section Editor",
    "Editorial Board Member",
    "Advisory Board Member",
    "Technical Editor",
    "Copy Editor",
    "Language Editor",
    "Statistics Editor",
];

type EditorialBoardPageProps = {
    searchParams: Promise<{
        journalId?: string;
        query?: string;
        role?: string;
    }>;
};

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);
}

function getInitials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export default async function EditorialBoardAdminPage({
    searchParams,
}: EditorialBoardPageProps) {
    const manager = await requireAnyRole(
        MANAGER_ROLES,
    );

    const { journalId, query, role } =
        await searchParams;

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

    const selectedJournal =
        journals.find(
            (journal) =>
                journal.id === selectedJournalId,
        ) || null;

    const searchQuery =
        query?.trim() || "";

    const selectedRole =
        role?.trim() || "";

    const members = selectedJournalId
        ? await prisma.editorialBoardMember.findMany({
            where: {
                journalId: selectedJournalId,

                ...(selectedRole
                    ? {
                        role: selectedRole,
                    }
                    : {}),

                ...(searchQuery
                    ? {
                        OR: [
                            {
                                name: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                title: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                            {
                                role: {
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
                                email: {
                                    contains: searchQuery,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                    : {}),
            },

            orderBy: [
                {
                    sortOrder: "asc",
                },
                {
                    role: "asc",
                },
                {
                    name: "asc",
                },
            ],
        })
        : [];

    const totalMembers = selectedJournalId
        ? await prisma.editorialBoardMember.count({
            where: {
                journalId: selectedJournalId,
            },
        })
        : 0;

    const roleCounts = selectedJournalId
        ? await prisma.editorialBoardMember.groupBy({
            by: ["role"],

            where: {
                journalId: selectedJournalId,
            },

            _count: {
                _all: true,
            },

            orderBy: {
                role: "asc",
            },
        })
        : [];

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Journal Administration
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Editorial Board Management
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Add, update, organise and remove editorial
                    board members displayed on the public journal
                    website.
                </p>
            </header>

            {journals.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        No journal access found
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Your account does not currently have
                        permission to manage an editorial board.
                    </p>
                </section>
            ) : (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatisticCard
                            label="Total Members"
                            value={totalMembers}
                        />

                        <StatisticCard
                            label="Board Roles"
                            value={roleCounts.length}
                        />

                        <StatisticCard
                            label="Current Results"
                            value={members.length}
                        />

                        <StatisticCard
                            label="Journal Status"
                            value={
                                selectedJournal?.isActive
                                    ? "Active"
                                    : "Inactive"
                            }
                        />
                    </section>

                    <section className="rounded-2xl border bg-white p-6">
                        <form
                            method="get"
                            className="grid gap-5 lg:grid-cols-[240px_1fr_240px_auto]"
                        >
                            <div>
                                <label
                                    htmlFor="journalId"
                                    className="mb-2 block text-sm font-semibold"
                                >
                                    Journal
                                </label>

                                <select
                                    id="journalId"
                                    name="journalId"
                                    defaultValue={
                                        selectedJournalId || ""
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                >
                                    {journals.map((journal) => (
                                        <option
                                            key={journal.id}
                                            value={journal.id}
                                        >
                                            {journal.shortName ||
                                                journal.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="query"
                                    className="mb-2 block text-sm font-semibold"
                                >
                                    Search members
                                </label>

                                <input
                                    id="query"
                                    name="query"
                                    type="search"
                                    defaultValue={searchQuery}
                                    placeholder="Name, affiliation, country, email or role"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="role"
                                    className="mb-2 block text-sm font-semibold"
                                >
                                    Board role
                                </label>

                                <select
                                    id="role"
                                    name="role"
                                    defaultValue={selectedRole}
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                                >
                                    <option value="">
                                        All roles
                                    </option>

                                    {BOARD_ROLES.map(
                                        (boardRole) => (
                                            <option
                                                key={boardRole}
                                                value={boardRole}
                                            >
                                                {boardRole}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

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
                                            ? `/admin/editorial-board?journalId=${selectedJournalId}`
                                            : "/admin/editorial-board"
                                    }
                                    className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                                >
                                    Reset
                                </Link>
                            </div>
                        </form>
                    </section>

                    {selectedJournal && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                                        Add Board Member
                                    </p>

                                    <h2 className="mt-3 text-2xl font-bold text-amber-950">
                                        {selectedJournal.name}
                                    </h2>
                                </div>

                                <Link
                                    href="/editorial-board"
                                    className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                                >
                                    View Public Page
                                </Link>
                            </div>

                            <CreateBoardMemberForm
                                journalId={selectedJournal.id}
                            />
                        </section>
                    )}

                    <section>
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    Current Board Members
                                </h2>

                                <p className="mt-2 text-slate-600">
                                    Members are displayed by their
                                    numerical order and then by role.
                                </p>
                            </div>

                            {roleCounts.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {roleCounts.map((entry) => (
                                        <span
                                            key={entry.role}
                                            className="rounded-full border bg-white px-3 py-2 text-sm text-slate-700"
                                        >
                                            {entry.role || "Unassigned"}:{" "}
                                            <strong>
                                                {entry._count._all}
                                            </strong>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {members.length === 0 ? (
                            <div className="mt-8 rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                                <h3 className="text-xl font-bold">
                                    No members found
                                </h3>

                                <p className="mt-3 text-slate-600">
                                    Add the first editorial board member or
                                    change the current filters.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-8 space-y-6">
                                {members.map((member) => (
                                    <article
                                        key={member.id}
                                        className="rounded-2xl border bg-white p-6 shadow-sm"
                                    >
                                        <div className="grid gap-7 xl:grid-cols-[180px_1fr]">
                                            <div>
                                                {member.photoUrl ? (
                                                    <img
                                                        src={member.photoUrl}
                                                        alt={member.name}
                                                        className="h-44 w-full rounded-2xl border object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-44 w-full items-center justify-center rounded-2xl bg-slate-950 text-4xl font-bold text-amber-400">
                                                        {getInitials(
                                                            member.name,
                                                        )}
                                                    </div>
                                                )}

                                                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-center">
                                                    <p className="text-sm text-slate-500">
                                                        Display order
                                                    </p>

                                                    <p className="mt-1 text-xl font-bold">
                                                        {member.sortOrder}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-bold uppercase tracking-wider text-amber-700">
                                                            {member.role ||
                                                                "Editorial Board Member"}
                                                        </p>

                                                        <h3 className="mt-2 text-2xl font-bold">
                                                            {member.name}
                                                        </h3>

                                                        {member.title && (
                                                            <p className="mt-1 text-slate-600">
                                                                {member.title}
                                                            </p>
                                                        )}

                                                        <p className="mt-3 text-sm text-slate-500">
                                                            {member.affiliation ||
                                                                "Affiliation not provided"}

                                                            {member.country
                                                                ? ` • ${member.country}`
                                                                : ""}
                                                        </p>
                                                    </div>

                                                    <div className="text-right text-sm text-slate-500">
                                                        <p>
                                                            Added{" "}
                                                            {formatDate(
                                                                member.createdAt,
                                                            )}
                                                        </p>

                                                        <p className="mt-1">
                                                            Updated{" "}
                                                            {formatDate(
                                                                member.updatedAt,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {member.email && (
                                                    <p className="mt-4 font-semibold text-blue-700">
                                                        {member.email}
                                                    </p>
                                                )}

                                                {member.bio && (
                                                    <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-700">
                                                        {member.bio}
                                                    </p>
                                                )}

                                                <details className="mt-6 rounded-xl border">
                                                    <summary className="cursor-pointer p-5 font-bold">
                                                        Edit Board Member
                                                    </summary>

                                                    <UpdateBoardMemberForm
                                                        member={member}
                                                    />
                                                </details>

                                                <DeleteBoardMemberForm
                                                    memberId={member.id}
                                                />
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}

function StatisticCard({
    label,
    value,
}: {
    label: string;
    value: number | string;
}) {
    return (
        <article className="rounded-xl border bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold">
                {value}
            </p>
        </article>
    );
}

