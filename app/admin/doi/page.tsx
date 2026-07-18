import { redirect } from "next/navigation";

import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

export default async function AdminDoiRedirectPage() {
    await requireAnyRole(ADMIN_ROLES);

    redirect("/admin/doi-records");
}
