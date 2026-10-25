import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { COUNTRIES } from "@/lib/constants/countries";

import {
  AssignJournalRoleForm,
  CreateUserForm,
  RemoveJournalRoleForm,
  ToggleActionAlertsForm,
  ToggleUserStatusForm,
} from "./UserForms";

const JOURNAL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR_IN_CHIEF",
  "MANAGING_EDITOR",
  "SECTION_EDITOR",
  "REVIEWER",
  "AUTHOR",
  "READER",
  "COPYEDITOR",
  "TYPESETTER",
  "PROOFREADER",
  "PUBLISHER",
] as const;

function formatRole(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AdminUsersPage() {
  await requireAnyRole(ADMIN_ROLES);

  const [users, journals] = await Promise.all([
    prisma.user.findMany({
      include: {
        roles: {
          include: {
            journal: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.journal.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const activeCount = users.filter(
    (user) => user.isActive,
  ).length;

  const inactiveCount = users.length - activeCount;

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
          Users and Roles
        </h1>

        <p className="mt-3 text-gray-600">
          Create user accounts and manage journal-specific
          permissions.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Super administrators always receive notifications for
          submissions needing action (new reviews, revisions, and
          similar events). Grant &quot;Action Alerts&quot; to any
          other account that should receive those too.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Users
          </p>

          <p className="mt-2 text-3xl font-bold">
            {users.length}
          </p>
        </article>

        <article className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Active
          </p>

          <p className="mt-2 text-3xl font-bold text-green-900">
            {activeCount}
          </p>
        </article>

        <article className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            Inactive
          </p>

          <p className="mt-2 text-3xl font-bold text-red-900">
            {inactiveCount}
          </p>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Create User
        </h2>

        <CreateUserForm countries={COUNTRIES} />
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Assign Journal Role
        </h2>

        <AssignJournalRoleForm
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
          }))}
          journals={journals.map((journal) => ({
            id: journal.id,
            name: journal.name,
          }))}
          roles={JOURNAL_ROLES}
          formatRole={formatRole}
        />
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          User Directory
        </h2>

        {users.length === 0 ? (
          <p className="mt-5 text-gray-600">
            No users found.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {users.map((user) => (
              <article
                key={user.id}
                className="rounded-xl border p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-semibold">
                      {user.name}
                    </h3>

                    <p className="mt-1 break-all text-gray-600">
                      {user.email}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Created {formatDate(user.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${user.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>

                    {user.receivesActionAlerts && (
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                        Gets action alerts
                      </span>
                    )}

                    <ToggleActionAlertsForm
                      userId={user.id}
                      receivesActionAlerts={user.receivesActionAlerts}
                    />

                    <ToggleUserStatusForm
                      userId={user.id}
                      isActive={user.isActive}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="font-semibold">
                    Journal Roles
                  </h4>

                  {user.roles.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      No journal roles assigned.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {user.roles.map((roleRecord) => (
                        <div
                          key={roleRecord.id}
                          className="flex items-center gap-3 rounded-full border bg-gray-50 px-4 py-2"
                        >
                          <span className="text-sm">
                            {roleRecord.journal.shortName}:{" "}
                            <strong>
                              {formatRole(roleRecord.role)}
                            </strong>
                          </span>

                          <RemoveJournalRoleForm
                            roleRecordId={roleRecord.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
