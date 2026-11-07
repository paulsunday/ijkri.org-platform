import Link from "next/link";

import type { UserRole } from "@/lib/generated/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

import {
    GrantAccessForm,
    ReleaseReservationForm,
    ToolkitSettingsForm,
} from "./ResearchToolkitForms";

const MANAGER_ROLES: UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
];

const RESERVATION_STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Active",
    RELEASED: "Released",
    CONVERTED: "Converted",
};

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(value);
}

type ResearchToolkitAdminPageProps = {
    searchParams: Promise<{
        journalId?: string;
    }>;
};

export default async function ResearchToolkitAdminPage({
    searchParams,
}: ResearchToolkitAdminPageProps) {
    const manager = await requireAnyRole(MANAGER_ROLES);

    const { journalId } = await searchParams;

    const managerJournalIds = manager.roles
        .filter((assignment) => MANAGER_ROLES.includes(assignment.role))
        .map((assignment) => assignment.journalId);

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
            toolkitPrice: true,
            topicReservationMonths: true,
        },
        orderBy: {
            name: "asc",
        },
    });

    const selectedJournalId =
        journalId && journals.some((journal) => journal.id === journalId)
            ? journalId
            : journals[0]?.id || null;

    const selectedJournal =
        journals.find((journal) => journal.id === selectedJournalId) ||
        null;

    // Recent unlock attempts, newest first, so a paid attempt that the
    // site failed to record is easy to spot.
    const toolkitPayments = selectedJournalId
        ? await prisma.payment.findMany({
            where: {
                journalId: selectedJournalId,
                purpose: "RESEARCH_TOOLKIT",
            },
            orderBy: { initiatedAt: "desc" },
            take: 30,
            select: {
                id: true,
                status: true,
                amount: true,
                currency: true,
                internalReference: true,
                failureReason: true,
                initiatedAt: true,
                user: { select: { name: true, email: true } },
                toolkitAccess: { select: { grantedAt: true, revokedAt: true } },
            },
        })
        : [];

    const reservations = selectedJournalId
        ? await prisma.topicReservation.findMany({
            where: {
                journalId: selectedJournalId,
            },
            include: {
                topic: {
                    select: {
                        id: true,
                        rawTopicText: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                reservedAt: "desc",
            },
            take: 50,
        })
        : [];

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Journal Administration
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Research Topic Formulation Workbench
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Configure the unlock price and reservation window,
                    and review or manually release student topic
                    reservations.
                </p>
            </header>

            {journals.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        No journal access found
                    </h2>

                    <p className="mt-3 text-slate-600">
                        Your account does not currently have permission
                        to manage the research toolkit.
                    </p>
                </section>
            ) : (
                <>
                    {journals.length > 1 && (
                        <form
                            method="get"
                            className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5"
                        >
                            <div className="min-w-64">
                                <label
                                    htmlFor="journalId"
                                    className="mb-1.5 block text-sm font-semibold"
                                >
                                    Journal
                                </label>

                                <select
                                    id="journalId"
                                    name="journalId"
                                    defaultValue={selectedJournalId || ""}
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

                            <button
                                type="submit"
                                className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                            >
                                Switch journal
                            </button>
                        </form>
                    )}

                    {selectedJournal && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                                        Settings
                                    </p>

                                    <h2 className="mt-3 text-2xl font-bold text-amber-950">
                                        {selectedJournal.name}
                                    </h2>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href="/admin/variable-guides"
                                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                                    >
                                        Variable Guides (SEO)
                                    </Link>

                                    <Link
                                        href="/resources"
                                        className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                                    >
                                        View Public Page
                                    </Link>
                                </div>
                            </div>

                            <div className="mt-6">
                                <ToolkitSettingsForm
                                    journalId={selectedJournal.id}
                                    toolkitPrice={selectedJournal.toolkitPrice.toNumber()}
                                    topicReservationMonths={
                                        selectedJournal.topicReservationMonths
                                    }
                                />
                            </div>
                        </section>
                    )}

                    {selectedJournal ? (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6">
                            <h2 className="text-2xl font-bold">
                                Unlock payments
                            </h2>

                            <p className="mt-1 text-sm text-slate-600">
                                Each row is one checkout attempt. A student
                                may have several. If Paystack shows a
                                successful charge but the student is still
                                locked, open the attempt and click
                                Reconcile, or grant access below.
                            </p>

                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full min-w-[720px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-slate-500">
                                            <th className="py-2 pr-3">Student</th>
                                            <th className="py-2 pr-3">Amount</th>
                                            <th className="py-2 pr-3">Status</th>
                                            <th className="py-2 pr-3">Unlocked?</th>
                                            <th className="py-2 pr-3">Reference</th>
                                            <th className="py-2">Started</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {toolkitPayments.map((payment) => (
                                            <tr key={payment.id} className="border-b align-top">
                                                <td className="py-2 pr-3">
                                                    <Link
                                                        href={`/admin/payments/${payment.id}`}
                                                        className="font-medium underline"
                                                    >
                                                        {payment.user.name || payment.user.email}
                                                    </Link>
                                                    <span className="block text-xs text-slate-500">
                                                        {payment.user.email}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-3">
                                                    {payment.currency} {payment.amount.toFixed(2)}
                                                </td>
                                                <td className="py-2 pr-3">
                                                    {payment.status}
                                                    {payment.failureReason ? (
                                                        <span className="block max-w-xs text-xs text-red-700">
                                                            {payment.failureReason}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="py-2 pr-3">
                                                    {payment.toolkitAccess?.grantedAt &&
                                                    !payment.toolkitAccess.revokedAt
                                                        ? "✅ Yes"
                                                        : "❌ No"}
                                                </td>
                                                <td className="py-2 pr-3 font-mono text-xs">
                                                    {payment.internalReference}
                                                </td>
                                                <td className="py-2">
                                                    {payment.initiatedAt
                                                        ? formatDate(payment.initiatedAt)
                                                        : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-lg font-bold">
                                    Grant toolkit access manually
                                </h3>

                                <p className="mb-3 mt-1 text-sm text-slate-600">
                                    Use after confirming the payment in your
                                    Paystack dashboard (Transactions → search
                                    the student&apos;s email).
                                </p>

                                <GrantAccessForm journalId={selectedJournal.id} />
                            </div>
                        </section>
                    ) : null}

                    <section>
                        <h2 className="text-2xl font-bold">
                            Topic Reservations
                        </h2>

                        {reservations.length === 0 ? (
                            <div className="mt-8 rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                                <h3 className="text-xl font-bold">
                                    No reservations yet
                                </h3>

                                <p className="mt-3 text-slate-600">
                                    Reservations made by students will
                                    appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-8 overflow-x-auto rounded-2xl border bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-left text-slate-500">
                                        <tr>
                                            <th className="p-4">
                                                Topic
                                            </th>
                                            <th className="p-4">
                                                Student
                                            </th>
                                            <th className="p-4">
                                                Status
                                            </th>
                                            <th className="p-4">
                                                Reserved
                                            </th>
                                            <th className="p-4">
                                                Expires
                                            </th>
                                            <th className="p-4" />
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {reservations.map(
                                            (reservation) => (
                                                <tr
                                                    key={reservation.id}
                                                    className="border-t"
                                                >
                                                    <td className="max-w-xs p-4">
                                                        {
                                                            reservation
                                                                .topic
                                                                .rawTopicText
                                                        }
                                                    </td>

                                                    <td className="p-4">
                                                        {
                                                            reservation
                                                                .user
                                                                .name
                                                        }

                                                        <br />

                                                        <span className="text-slate-500">
                                                            {
                                                                reservation
                                                                    .user
                                                                    .email
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="p-4">
                                                        {
                                                            RESERVATION_STATUS_LABEL[
                                                                reservation
                                                                    .status
                                                            ]
                                                        }
                                                    </td>

                                                    <td className="p-4">
                                                        {formatDate(
                                                            reservation.reservedAt,
                                                        )}
                                                    </td>

                                                    <td className="p-4">
                                                        {formatDate(
                                                            reservation.expiresAt,
                                                        )}
                                                    </td>

                                                    <td className="p-4">
                                                        {reservation.status ===
                                                        "ACTIVE" ? (
                                                            <ReleaseReservationForm
                                                                reservationId={
                                                                    reservation.id
                                                                }
                                                            />
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}
