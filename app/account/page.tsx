import LogoutButton from "@/components/auth/logout-button";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function AccountPage() {
    const user = await requireCurrentUser();

    return (
        <main className="mx-auto max-w-3xl p-8">
            <div className="rounded-lg border bg-white p-6">
                <h1 className="text-2xl font-bold">My Account</h1>

                <div className="mt-6 space-y-2">
                    <p>
                        <span className="font-semibold">Name:</span> {user.name}
                    </p>

                    <p>
                        <span className="font-semibold">Email:</span> {user.email}
                    </p>

                    <p>
                        <span className="font-semibold">Status:</span>{" "}
                        {user.isActive ? "Active" : "Inactive"}
                    </p>

                    <p>
                        <span className="font-semibold">Journal roles:</span>{" "}
                        {user.roles.length}
                    </p>
                </div>

                <div className="mt-8">
                    <LogoutButton />
                </div>
            </div>
        </main>
    );
}

