"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function LogoutButton() {
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleLogout() {
        setIsSigningOut(true);

        await signOut({
            callbackUrl: "/login",
        });
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
    );
}
