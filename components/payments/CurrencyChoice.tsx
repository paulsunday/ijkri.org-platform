import type { Prisma } from "@/lib/generated/prisma";
import {
    formatCheckoutMoney,
    resolveCheckoutPrice,
    type CheckoutCurrency,
} from "@/lib/payments/checkout-currency";

type CurrencyChoiceProps = {
    baseAmount: Prisma.Decimal;
    baseCurrency: CheckoutCurrency;
    ngnExchangeRate: Prisma.Decimal | null;
    tone?: "light" | "dark";
};

/**
 * Lets the payer choose between the journal's currency and Naira inside
 * a checkout <form>. Renders nothing when only one currency is offered,
 * so the form falls back to the journal's currency.
 */
export default function CurrencyChoice({
    baseAmount,
    baseCurrency,
    ngnExchangeRate,
    tone = "light",
}: CurrencyChoiceProps) {
    if (baseCurrency === "NGN" || !ngnExchangeRate) {
        return null;
    }

    const options = (["USD", "NGN"] as const).map((currency) => ({
        currency,
        label: currency === "NGN" ? "Pay in Naira" : "Pay in US Dollars",
        price: resolveCheckoutPrice({
            baseAmount,
            baseCurrency,
            chosenCurrency: currency,
            ngnExchangeRate,
        }),
    }));

    const cardClass =
        tone === "dark"
            ? "border-slate-600 bg-slate-800 text-white has-[:checked]:border-amber-400 has-[:checked]:bg-slate-700"
            : "border-slate-300 bg-white text-slate-900 has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50";

    return (
        <fieldset className="mb-4">
            <legend
                className={`mb-2 text-sm font-semibold ${
                    tone === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
            >
                Choose payment currency
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
                {options.map((option, index) => (
                    <label
                        key={option.currency}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${cardClass}`}
                    >
                        <input
                            type="radio"
                            name="currency"
                            value={option.currency}
                            defaultChecked={index === 0}
                            className="h-4 w-4"
                        />

                        <span>
                            <span className="block text-sm">
                                {option.label}
                            </span>
                            <span className="block text-lg font-bold">
                                {formatCheckoutMoney(
                                    option.price.amount,
                                    option.currency,
                                )}
                            </span>
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
