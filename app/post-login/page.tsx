import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getRoleLandingPage } from "@/lib/auth/role-redirect";

export default async function PostLoginPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const destination = getRoleLandingPage(
        user.roles,
    );

    redirect(destination);
}