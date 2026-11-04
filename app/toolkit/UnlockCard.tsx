import CurrencyChoice from "@/components/payments/CurrencyChoice";
import type { Prisma } from "@/lib/generated/prisma";
import {
    getOfferedCheckoutCurrencies,
    PAYMENTS_UNAVAILABLE_MESSAGE,
    type CheckoutCurrency,
} from "@/lib/payments/checkout-currency";

import { initializeToolkitAccess } from "./purchase-actions";

export type ToolkitPricing = {
    toolkitPrice: Prisma.Decimal;
    currency: CheckoutCurrency;
    ngnExchangeRate: Prisma.Decimal | null;
};

/** Paywall call-to-action for the full workbench. */
export default function UnlockCard({
    pricing,
    title = "Unlock the full workbench",
    lockedItems,
}: {
    pricing: ToolkitPricing;
    title?: string;
    lockedItems?: string[];
}) {
    const canPay =
        getOfferedCheckoutCurrencies({
            baseCurrency: pricing.currency,
            ngnExchangeRate: pricing.ngnExchangeRate,
        }).length > 0;

    return (
        <section className="rounded-2xl bg-slate-950 p-6 text-white sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
                One-time payment
            </p>

            <h2 className="mt-2 text-2xl font-bold">{title}</h2>

            <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
                {(
                    lockedItems ?? [
                        "Full objectives plan: every objective, research question and hypothesis",
                        "Proxies with validated scales or secondary-data sources for every variable",
                        "Underpinning theory, conceptual framework and methodology outline",
                        "Edit and regenerate your plan any time",
                        "AI topic suggestions and the gap finder",
                        "Reserve your topic with a timestamped first claim",
                    ]
                ).map((item) => (
                    <li key={item}>🔓 {item}</li>
                ))}
            </ul>

            {canPay ? (
            <form action={initializeToolkitAccess} className="mt-6 max-w-xl">
                <CurrencyChoice
                    baseAmount={pricing.toolkitPrice}
                    baseCurrency={pricing.currency}
                    ngnExchangeRate={pricing.ngnExchangeRate}
                    tone="dark"
                />

                <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
                >
                    Unlock now
                </button>
            </form>
            ) : (
                <p className="mt-6 rounded-lg bg-slate-800 p-3 text-sm text-amber-300">
                    {PAYMENTS_UNAVAILABLE_MESSAGE}
                </p>
            )}
        </section>
    );
}
