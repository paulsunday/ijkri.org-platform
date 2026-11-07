import Link from "next/link";

import CurrencyChoice from "@/components/payments/CurrencyChoice";
import type { Prisma } from "@/lib/generated/prisma";
import {
    getOfferedCheckoutCurrencies,
    PAYMENTS_UNAVAILABLE_MESSAGE,
    type CheckoutCurrency,
} from "@/lib/payments/checkout-currency";

/** Shown in place of the full text for readers without access. */
export default function ArticlePaywall({
    slug,
    journalSlug,
    isLoggedIn,
    price,
    currency,
    ngnExchangeRate,
    message,
    messageIsError,
}: {
    slug: string;
    journalSlug: string;
    isLoggedIn: boolean;
    price: Prisma.Decimal;
    currency: CheckoutCurrency;
    ngnExchangeRate: Prisma.Decimal | null;
    message?: string;
    messageIsError?: boolean;
}) {
    const canPay =
        price.greaterThan(0) &&
        getOfferedCheckoutCurrencies({ baseCurrency: currency, ngnExchangeRate })
            .length > 0;

    return (
        <section className="article-paywall rounded-xl border-2 border-amber-300 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-amber-950">
                Read the full article
            </h2>

            <p className="mt-2 text-amber-900">
                Get the full text and PDF of this article with a one-time
                purchase, or with a journal subscription.
            </p>

            {message ? (
                <p
                    role="status"
                    className={`mt-4 rounded-lg p-3 text-sm ${
                        messageIsError
                            ? "bg-red-50 text-red-800"
                            : "bg-green-50 text-green-800"
                    }`}
                >
                    {message}
                </p>
            ) : null}

            {!isLoggedIn ? (
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href={`/login?callbackUrl=${encodeURIComponent(`/articles/${slug}`)}`}
                        className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                    >
                        Log in to buy this article
                    </Link>
                    <Link
                        href="/register"
                        className="rounded-lg border border-amber-400 px-6 py-3 font-semibold text-amber-950 hover:bg-amber-100"
                    >
                        Create a free account
                    </Link>
                </div>
            ) : canPay ? (
                <form
                    method="post"
                    action={`/articles/${slug}/checkout`}
                    className="mt-6 max-w-xl"
                >
                    <CurrencyChoice
                        baseAmount={price}
                        baseCurrency={currency}
                        ngnExchangeRate={ngnExchangeRate}
                    />

                    <button
                        type="submit"
                        className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                    >
                        Buy this article
                    </button>
                </form>
            ) : (
                <p className="mt-6 text-sm text-amber-900">
                    {PAYMENTS_UNAVAILABLE_MESSAGE}
                </p>
            )}

            <p className="mt-4 text-sm text-amber-900">
                Reading regularly?{" "}
                <Link href={`/subscribe/${journalSlug}`} className="font-semibold underline">
                    Subscribe for full access to every article
                </Link>
                .
            </p>
        </section>
    );
}
