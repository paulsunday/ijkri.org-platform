import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";

export default async function ReviewsPage() {
  await requireAnyRole(ADMIN_ROLES);

  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">
        Reviews
      </h1>

      <p className="mt-4 text-slate-600">
        Assign reviewers and monitor peer review.
      </p>
    </main>
  );
}
