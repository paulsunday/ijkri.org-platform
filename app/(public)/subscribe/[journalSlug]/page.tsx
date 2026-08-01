import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import { initializeSubscriptionPayment } from "./actions";

type PageProps = {
    params: Promise<{
        journalSlug: string;
    }>;
    searchParams: Promise<{
        payment?: string;
        message?: string;
    }>;
};

function formatDate(value: Date | null) {
    if (!value) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(value);
}

export default async function SubscribePage({
    params,
    searchParams,
}: PageProps) {
    const { journalSlug } = await params;
    const { payment, message } = await searchParams;

    const journal = await prisma.journal.findUnique({
        where: {
            slug: journalSlug,
        },
        select: {
            id: true,
            name: true,
            currency: true,
            subscriptionAmount: true,
            isActive: true,
        },
    });

    if (!journal || !journal.isActive) {
        notFound();
    }

    const user = await getCurrentUser();

    const subscription = user
        ? await prisma.subscription.findFirst({
              where: {
                  journalId: journal.id,
                  userId: user.id,
              },
              orderBy: {
                  createdAt: "desc",
              },
              select: {
                  status: true,
                  expiresAt: true,
              },
          })
        : null;

    const isActiveSubscription =
        subscription?.status === "ACTIVE" &&
        subscription.expiresAt &&
        subscription.expiresAt > new Date();

    return (
        <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
            <div>
                <h1 className="text-3xl font-bold">
                    Subscribe to {journal.name}
                </h1>

                <p className="mt-2 text-gray-600">
                    A subscription gives you full-text access
                    to every article published in this
                    journal.
                </p>
            </div>

            {payment === "success" && (
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                    {message ||
                        "Your payment was verified successfully."}
                </div>
            )}

            {payment === "pending" && (
                <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                    {message ||
                        "Your payment is still being processed."}
                </div>
            )}

            {(payment === "failed" || payment === "error") && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                    {message ||
                        "Your payment could not be completed."}
                </div>
            )}

            <section className="rounded-xl border bg-white p-6">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-xl font-semibold">
                        Reader Subscription
                    </h2>

                    <p className="text-2xl font-bold">
                        {journal.currency}{" "}
                        {journal.subscriptionAmount.toFixed(
                            2,
                        )}
                        <span className="text-sm font-normal text-gray-500">
                            {" "}
                            / month
                        </span>
                    </p>
                </div>

                {isActiveSubscription ? (
                    <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                        Your subscription is active until{" "}
                        {formatDate(subscription.expiresAt)}
                        .
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-600">
                        {subscription?.status === "EXPIRED"
                            ? "Your previous subscription has expired. Renew below to regain access."
                            : "Get unlimited access to full-text PDFs for as long as your subscription is active."}
                    </p>
                )}

                {!user ? (
                    <Link
                        href={`/login?callbackUrl=${encodeURIComponent(
                            `/subscribe/${journalSlug}`,
                        )}`}
                        className="mt-6 block w-full rounded-lg bg-blue-700 px-6 py-3 text-center font-semibold text-white hover:bg-blue-800"
                    >
                        Log in to subscribe
                    </Link>
                ) : (
                    !isActiveSubscription && (
                        <form
                            action={
                                initializeSubscriptionPayment
                            }
                            className="mt-6"
                        >
                            <input
                                type="hidden"
                                name="journalSlug"
                                value={journalSlug}
                            />

                            <button
                                type="submit"
                                className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                                Subscribe now
                            </button>
                        </form>
                    )
                )}
            </section>
        </main>
    );
}
