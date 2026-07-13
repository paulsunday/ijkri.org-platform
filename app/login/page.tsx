"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError("Invalid email or password.");
            return;
        }

        router.push("/");
        router.refresh();
    }

    return (
        <main className="mx-auto mt-20 max-w-md rounded-lg border p-8">
            <h1 className="mb-6 text-2xl font-bold">
                Sign in
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">

                <input
                    className="w-full rounded border p-2"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    className="w-full rounded border p-2"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                    <p className="text-red-600">
                        {error}
                    </p>
                )}

                <button
                    disabled={loading}
                    className="w-full rounded bg-black py-2 text-white"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>

            </form>
        </main>
    );
}