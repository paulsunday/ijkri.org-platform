import Link from "next/link";
import { prisma } from "@/lib/prisma";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

type ActivityLogPageProps = {
    searchParams: Promise<{
        action?: string;
        entity?: string;
        q?: string;
    }>;
};

const ACTIVITY_ACTIONS = [
    "LOGIN",
    "LOGOUT",
    "CREATE",
    "UPDATE",
    "DELETE",
    "SUBMIT_MANUSCRIPT",
    "ASSIGN_REVIEWER",
    "SUBMIT_REVIEW",
    "MAKE_DECISION",
    "PUBLISH_ARTICLE",
    "REGISTER_DOI",
] as const;

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(value);
}

function formatValue(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

function actionClass(action: string) {
    switch (action) {
        case "CREATE":
            return "bg-green-100 text-green-800";

        case "UPDATE":
            return "bg-blue-100 text-blue-800";

        case "DELETE":
            return "bg-red-100 text-red-800";

        case "LOGIN":
        case "LOGOUT":
            return "bg-gray-100 text-gray-800";

        case "SUBMIT_MANUSCRIPT":
        case "SUBMIT_REVIEW":
            return "bg-purple-100 text-purple-800";

        case "ASSIGN_REVIEWER":
            return "bg-indigo-100 text-indigo-800";

        case "MAKE_DECISION":
            return "bg-orange-100 text-orange-800";

        case "PUBLISH_ARTICLE":
            return "bg-emerald-100 text-emerald-800";

        case "REGISTER_DOI":
            return "bg-cyan-100 text-cyan-800";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

function metadataToEntries(metadata: unknown) {
    if (
        !metadata ||
        typeof metadata !== "object" ||
        Array.isArray(metadata)
    ) {
        return [];
    }

    return Object.entries(metadata).filter(
        ([, value]) =>
            value !== null &&
            value !== undefined &&
            value !== "",
    );
}

function displayMetadataValue(value: unknown) {
    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    try {
        return JSON.stringify(value);
    } catch {
        return "Unable to display";
    }
}

export default async function ActivityLogPage({
    searchParams,
}: ActivityLogPageProps) {
    await requireAnyRole(ADMIN_ROLES);
    const {
        action = "",
        entity = "",
        q = "",
    } = await searchParams;

    const selectedAction = action.trim();
    const selectedEntity = entity.trim();
    const searchQuery = q.trim();

    const logs = await prisma.activityLog.findMany({
        where: {
            ...(selectedAction
                ? {
                    action: selectedAction as
                        | "LOGIN"
                        | "LOGOUT"
                        | "CREATE"
                        | "UPDATE"
                        | "DELETE"
                        | "SUBMIT_MANUSCRIPT"
                        | "ASSIGN_REVIEWER"
                        | "SUBMIT_REVIEW"
                        | "MAKE_DECISION"
                        | "PUBLISH_ARTICLE"
                        | "REGISTER_DOI",
                }
                : {}),

            ...(selectedEntity
                ? {
                    entity: selectedEntity,
                }
                : {}),

            ...(searchQuery
                ? {
                    OR: [
                        {
                            entity: {
                                contains: searchQuery,
                                mode: "insensitive",
                            },
                        },
                        {
                            entityId: {
                                contains: searchQuery,
                                mode: "insensitive",
                            },
                        },
                    ],
                }
                : {}),
        },

        orderBy: {
            createdAt: "desc",
        },

        take: 250,
    });

    const userIds = Array.from(
        new Set(
            logs
                .map((log) => log.userId)
                .filter(
                    (userId): userId is string =>
                        Boolean(userId),
                ),
        ),
    );

    const users =
        userIds.length > 0
            ? await prisma.user.findMany({
                where: {
                    id: {
                        in: userIds,
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            })
            : [];

    const userMap = new Map(
        users.map((user) => [user.id, user]),
    );

    const entityOptions = Array.from(
        new Set(
            logs
                .map((log) => log.entity)
                .filter(
                    (value): value is string =>
                        Boolean(value),
                ),
        ),
    ).sort();

    const createCount = logs.filter(
        (log) => log.action === "CREATE",
    ).length;

    const updateCount = logs.filter(
        (log) => log.action === "UPDATE",
    ).length;

    const deleteCount = logs.filter(
        (log) => log.action === "DELETE",
    ).length;

    const publicationCount = logs.filter(
        (log) =>
            log.action === "PUBLISH_ARTICLE" ||
            log.action === "REGISTER_DOI",
    ).length;

    return (
        <main className="mx-auto max-w-7xl space-y-8 px-6 py-12">
            <header>
                <Link
                    href="/admin"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to admin dashboard
                </Link>

                <h1 className="mt-4 text-4xl font-bold">
                    Activity Log
                </h1>

                <p className="mt-3 text-gray-600">
                    Review important administrative, editorial,
                    production and publication activities.
                </p>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Displayed Records
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                        {logs.length}
                    </p>
                </article>

                <article className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <p className="text-sm text-green-700">
                        Created
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-900">
                        {createCount}
                    </p>
                </article>

                <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-sm text-blue-700">
                        Updated
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-900">
                        {updateCount}
                    </p>
                </article>

                <article className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm text-red-700">
                        Deleted
                    </p>

                    <p className="mt-2 text-3xl font-bold text-red-900">
                        {deleteCount}
                    </p>
                </article>

                <article className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                    <p className="text-sm text-purple-700">
                        Publication Actions
                    </p>

                    <p className="mt-2 text-3xl font-bold text-purple-900">
                        {publicationCount}
                    </p>
                </article>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Filter Activities
                </h2>

                <form
                    action="/admin/activity-log"
                    method="GET"
                    className="mt-6 grid gap-5 md:grid-cols-3"
                >
                    <div>
                        <label
                            htmlFor="action"
                            className="mb-2 block font-semibold"
                        >
                            Action
                        </label>

                        <select
                            id="action"
                            name="action"
                            defaultValue={selectedAction}
                            className="w-full rounded-lg border p-3"
                        >
                            <option value="">All actions</option>

                            {ACTIVITY_ACTIONS.map(
                                (activityAction) => (
                                    <option
                                        key={activityAction}
                                        value={activityAction}
                                    >
                                        {formatValue(activityAction)}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="entity"
                            className="mb-2 block font-semibold"
                        >
                            Entity
                        </label>

                        <select
                            id="entity"
                            name="entity"
                            defaultValue={selectedEntity}
                            className="w-full rounded-lg border p-3"
                        >
                            <option value="">All entities</option>

                            {entityOptions.map(
                                (entityOption) => (
                                    <option
                                        key={entityOption}
                                        value={entityOption}
                                    >
                                        {entityOption}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="q"
                            className="mb-2 block font-semibold"
                        >
                            Search
                        </label>

                        <input
                            id="q"
                            name="q"
                            defaultValue={searchQuery}
                            placeholder="Entity or record ID..."
                            className="w-full rounded-lg border p-3"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3 md:col-span-3">
                        <button
                            type="submit"
                            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                        >
                            Apply Filters
                        </button>

                        <Link
                            href="/admin/activity-log"
                            className="rounded-lg border border-gray-400 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Clear Filters
                        </Link>
                    </div>
                </form>
            </section>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                    Recent Activity
                </h2>

                {logs.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-6">
                        <p className="font-semibold text-yellow-900">
                            No activity records found
                        </p>

                        <p className="mt-2 text-sm text-yellow-800">
                            Change or clear the current filters.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-5">
                        {logs.map((log) => {
                            const user = log.userId
                                ? userMap.get(log.userId)
                                : null;

                            const metadataEntries =
                                metadataToEntries(log.metadata);

                            return (
                                <article
                                    key={log.id}
                                    className="rounded-xl border p-6"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${actionClass(
                                                        log.action,
                                                    )}`}
                                                >
                                                    {formatValue(log.action)}
                                                </span>

                                                {log.entity && (
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                                        {log.entity}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-4 font-semibold">
                                                {user
                                                    ? user.name
                                                    : "System activity"}
                                            </p>

                                            {user && (
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {user.email}
                                                </p>
                                            )}
                                        </div>

                                        <p className="text-sm text-gray-500">
                                            {formatDate(log.createdAt)}
                                        </p>
                                    </div>

                                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Entity
                                            </p>

                                            <p className="font-medium">
                                                {log.entity || "Not specified"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Entity ID
                                            </p>

                                            <p className="break-all font-mono text-sm">
                                                {log.entityId || "Not specified"}
                                            </p>
                                        </div>
                                    </div>

                                    {metadataEntries.length > 0 && (
                                        <div className="mt-5 rounded-lg bg-gray-50 p-5">
                                            <h3 className="font-semibold">
                                                Activity Details
                                            </h3>

                                            <dl className="mt-4 grid gap-4 md:grid-cols-2">
                                                {metadataEntries.map(
                                                    ([key, value]) => (
                                                        <div key={key}>
                                                            <dt className="text-sm text-gray-500">
                                                                {formatValue(key)}
                                                            </dt>

                                                            <dd className="mt-1 break-all text-sm font-medium">
                                                                {displayMetadataValue(
                                                                    value,
                                                                )}
                                                            </dd>
                                                        </div>
                                                    ),
                                                )}
                                            </dl>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}

                {logs.length === 250 && (
                    <p className="mt-6 text-center text-sm text-gray-500">
                        Showing the latest 250 matching records.
                    </p>
                )}
            </section>
        </main>
    );
}