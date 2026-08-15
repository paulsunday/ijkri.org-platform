import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

const SUBSCRIBER_DISPLAY_LIMIT = 200;

type NewsletterAdminPageProps = {
    searchParams: Promise<{
        journalId?: string;
    }>;
};

export default async function NewsletterAdminPage({
    searchParams,
}: NewsletterAdminPageProps) {
    const administrator = await requireAnyRole(ADMIN_ROLES);

    const isSuperAdmin = administrator.roles.some(
        (roleRecord) => roleRecord.role === "SUPER_ADMIN",
    );

    const { journalId: journalIdParam } = await searchParams;

    const permittedJournalIds = Array.from(
        new Set(
            administrator.roles
                .filter((roleRecord) =>
                    ADMIN_ROLES.includes(roleRecord.role),
                )
                .map((roleRecord) => roleRecord.journalId),
        ),
    );

    const journals = await prisma.journal.findMany({
        where: isSuperAdmin
            ? {}
            : { id: { in: permittedJournalIds } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, shortName: true },
    });

    const selectedJournalId =
        journalIdParam &&
            journals.some((journal) => journal.id === journalIdParam)
            ? journalIdParam
            : journals[0]?.id || null;

    const [activeCount, unsubscribedCount, subscribers] =
        selectedJournalId
            ? await Promise.all([
                prisma.newsletterSubscriber.count({
                    where: {
                        journalId: selectedJournalId,
                        unsubscribedAt: null,
                    },
                }),
                prisma.newsletterSubscriber.count({
                    where: {
                        journalId: selectedJournalId,
                        unsubscribedAt: { not: null },
                    },
                }),
                prisma.newsletterSubscriber.findMany({
                    where: {
                        journalId: selectedJournalId,
                        unsubscribedAt: null,
                    },
                    orderBy: { subscribedAt: "desc" },
                    take: SUBSCRIBER_DISPLAY_LIMIT,
                    select: { id: true, email: true, subscribedAt: true },
                }),
            ])
            : [0, 0, []];

    return (
        <main className="space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Journal Administration
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Newsletter Subscribers
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                    Visitors who opted in to the IJKRI Research Update
                    email list. This list is read-only here — subscribers
                    manage their own status through the subscribe and
                    unsubscribe links.
                </p>
            </header>

            {journals.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        No journal access found
                    </h2>
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

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <StatisticCard
                            label="Active Subscribers"
                            value={activeCount}
                        />

                        <StatisticCard
                            label="Unsubscribed"
                            value={unsubscribedCount}
                        />

                        <StatisticCard
                            label="Total"
                            value={activeCount + unsubscribedCount}
                        />
                    </section>

                    <section className="rounded-2xl border bg-white p-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <h2 className="text-xl font-bold">
                                Active Subscribers
                            </h2>

                            {activeCount > SUBSCRIBER_DISPLAY_LIMIT && (
                                <p className="text-sm text-slate-500">
                                    Showing the {SUBSCRIBER_DISPLAY_LIMIT}{" "}
                                    most recent of {activeCount}.
                                </p>
                            )}
                        </div>

                        {subscribers.length === 0 ? (
                            <p className="mt-6 text-slate-600">
                                No active subscribers yet.
                            </p>
                        ) : (
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-slate-500">
                                            <th className="pb-3 font-semibold">
                                                Email
                                            </th>

                                            <th className="pb-3 font-semibold">
                                                Subscribed
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {subscribers.map((subscriber) => (
                                            <tr key={subscriber.id}>
                                                <td className="py-3 font-medium text-slate-900">
                                                    {subscriber.email}
                                                </td>

                                                <td className="py-3 text-slate-600">
                                                    {formatDate(
                                                        subscriber.subscribedAt,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
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

function StatisticCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <article className="rounded-xl border bg-slate-50 p-5">
            <p className="text-sm text-slate-500">{label}</p>

            <p className="mt-2 text-3xl font-bold">{value}</p>
        </article>
    );
}
