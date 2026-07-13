import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

export default async function AdminSettingsPage() {
  await requireAnyRole(ADMIN_ROLES);

  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">
        Journal Settings
      </h1>

      <p className="mt-4 text-slate-600">
        Configure journals, publisher settings, workflow defaults,
        publication policies, email templates, and system preferences.
      </p>
    </main>
  );
}