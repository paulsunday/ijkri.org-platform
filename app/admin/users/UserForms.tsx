"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  assignJournalRole,
  createUser,
  removeJournalRole,
  toggleActionAlerts,
  toggleUserStatus,
  type UserActionState,
} from "./actions";

const IDLE_STATE: UserActionState = { success: false, message: "" };

function ActionBanner({ state }: { state: UserActionState }) {
  if (!state.message) return null;

  return (
    <div
      role={state.success ? "status" : "alert"}
      className={`rounded-lg p-3 text-sm md:col-span-2 ${
        state.success
          ? "bg-green-50 text-green-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </div>
  );
}

export function CreateUserForm({
  countries,
}: {
  countries: readonly string[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createUser,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="mt-6 grid gap-5 md:grid-cols-2"
    >
      <ActionBanner state={state} />

      <div>
        <label
          htmlFor="name"
          className="mb-2 block font-semibold"
        >
          Full Name
        </label>

        <input
          id="name"
          name="name"
          required
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block font-semibold"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="affiliation"
          className="mb-2 block font-semibold"
        >
          Affiliation
        </label>

        <input
          id="affiliation"
          name="affiliation"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="country"
          className="mb-2 block font-semibold"
        >
          Country
        </label>

        <select
          id="country"
          name="country"
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        >
          <option value="">Select country</option>

          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-2 block font-semibold"
        >
          Phone
        </label>

        <input
          id="phone"
          name="phone"
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}

type SelectableUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

type SelectableJournal = {
  id: string;
  name: string;
};

export function AssignJournalRoleForm({
  users,
  journals,
  roles,
  formatRole,
}: {
  users: SelectableUser[];
  journals: SelectableJournal[];
  roles: readonly string[];
  formatRole: (value: string) => string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    assignJournalRole,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="mt-6 grid gap-5 md:grid-cols-3"
    >
      <ActionBanner state={state} />

      <div>
        <label
          htmlFor="userId"
          className="mb-2 block font-semibold"
        >
          User
        </label>

        <select
          id="userId"
          name="userId"
          required
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        >
          <option value="" disabled>
            Select user
          </option>

          {users
            .filter((user) => user.isActive)
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.email}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="journalId"
          className="mb-2 block font-semibold"
        >
          Journal
        </label>

        <select
          id="journalId"
          name="journalId"
          required
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        >
          <option value="" disabled>
            Select journal
          </option>

          {journals.map((journal) => (
            <option key={journal.id} value={journal.id}>
              {journal.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="role"
          className="mb-2 block font-semibold"
        >
          Role
        </label>

        <select
          id="role"
          name="role"
          required
          defaultValue=""
          disabled={pending}
          className="w-full rounded-lg border p-3 disabled:opacity-50"
        >
          <option value="" disabled>
            Select role
          </option>

          {roles.map((role) => (
            <option key={role} value={role}>
              {formatRole(role)}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-700 px-6 py-3 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
        >
          {pending ? "Assigning…" : "Assign Role"}
        </button>
      </div>
    </form>
  );
}

export function ToggleActionAlertsForm({
  userId,
  receivesActionAlerts,
}: {
  userId: string;
  receivesActionAlerts: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    toggleActionAlerts,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />

      {state.message && (
        <div
          role={state.success ? "status" : "alert"}
          className={`mb-2 rounded-lg p-2 text-xs ${
            state.success
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
          receivesActionAlerts
            ? "border-indigo-300 text-indigo-800 hover:bg-indigo-50"
            : "border-slate-300 text-slate-800 hover:bg-slate-50"
        }`}
      >
        {pending
          ? "Updating…"
          : receivesActionAlerts
            ? "Revoke Action Alerts"
            : "Grant Action Alerts"}
      </button>
    </form>
  );
}

export function ToggleUserStatusForm({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    toggleUserStatus,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />

      {state.message && (
        <div
          role={state.success ? "status" : "alert"}
          className={`mb-2 rounded-lg p-2 text-xs ${
            state.success
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
          isActive
            ? "bg-red-700 hover:bg-red-800"
            : "bg-green-700 hover:bg-green-800"
        }`}
      >
        {pending ? "Updating…" : isActive ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}

export function RemoveJournalRoleForm({
  roleRecordId,
}: {
  roleRecordId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    removeJournalRole,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="roleRecordId"
        value={roleRecordId}
      />

      {!state.success && state.message && (
        <div
          role="alert"
          className="mb-1 max-w-xs rounded-lg bg-red-50 p-2 text-xs text-red-800"
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="text-sm font-bold text-red-700 hover:text-red-900 disabled:opacity-50"
        aria-label="Remove role"
      >
        ×
      </button>
    </form>
  );
}
