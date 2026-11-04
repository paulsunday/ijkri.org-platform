import type { Prisma } from "@/lib/generated/prisma";
import {
    formatCheckoutMoney,
    getOfferedCheckoutCurrencies,
    PAYMENTS_UNAVAILABLE_MESSAGE,
    resolveCheckoutPrice,
    type CheckoutCurrency,
} from "@/lib/payments/checkout-currency";

type CurrencyChoiceProps = {
    baseAmount: Prisma.Decimal;
    baseCurrency: CheckoutCurrency;
    ngnExchangeRate: Prisma.Decimal | null;
    tone?: "light" | "dark";
};

const LABEL: Record<CheckoutCurrency, string> = {
    USD: "Pay in US Dollars",
    NGN: "Pay in Naira",
};

/**
 * Shows the price(s) inside a checkout <form>, offering only currencies
 * the Paystack account accepts and the journal can price. With one
 * option it shows that price; with two, a choice.
 */
export default function CurrencyChoice({
    baseAmount,
    baseCurrency,
    ngnExchangeRate,
    tone = "light",
}: CurrencyChoiceProps) {
    const dark = tone === "dark";

    const offered = getOfferedCheckoutCurrencies({
        baseCurrency,
        ngnExchangeRate,
    });

    /*
     * A Naira-only Paystack account can't charge dollars, but payers who
     * think in dollars still get a "Pay in US Dollars" option: it shows
     * the dollar price and goes on to Paystack, which charges the Naira
     * equivalent (the server falls back to NGN for an unsupported USD).
     */
    const currencies: CheckoutCurrency[] =
        baseCurrency === "USD" &&
        !offered.includes("USD") &&
        offered.includes("NGN")
            ? ["USD", "NGN"]
            : offered;

    const options = currencies.map((currency) => {
        const charged = resolveCheckoutPrice({
            baseAmount,
            baseCurrency,
            chosenCurrency: currency,
            ngnExchangeRate,
        });

        return {
            currency,
            // What the payer sees for this option.
            displayAmount: currency === "USD" ? baseAmount : charged.amount,
            // Set when Paystack will charge a different currency.
            chargedNote:
                charged.currency !== currency
                    ? `Charged as ${formatCheckoutMoney(charged.amount, charged.currency)} at checkout`
                    : null,
            price: charged,
        };
    });

    // Default to the option that is charged as shown.
    const defaultIndex = Math.max(
        0,
        options.findIndex((option) => !option.chargedNote),
    );

    if (options.length === 0) {
        return (
            <p
                className={`mb-4 rounded-lg p-3 text-sm ${
                    dark
                        ? "bg-slate-800 text-amber-300"
                        : "bg-amber-50 text-amber-900"
                }`}
            >
                {PAYMENTS_UNAVAILABLE_MESSAGE}
            </p>
        );
    }

    if (options.length === 1) {
        const [only] = options;

        return (
            <div className="mb-4">
                <input type="hidden" name="currency" value={only.currency} />

                <p
                    className={`text-2xl font-bold ${
                        dark ? "text-white" : "text-slate-900"
                    }`}
                >
                    {formatCheckoutMoney(only.price.amount, only.currency)}
                </p>
            </div>
        );
    }

    const cardClass = dark
        ? "border-slate-600 bg-slate-800 text-white has-[:checked]:border-amber-400 has-[:checked]:bg-slate-700"
        : "border-slate-300 bg-white text-slate-900 has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50";

    return (
        <fieldset className="mb-4">
            <legend
                className={`mb-2 text-sm font-semibold ${
                    dark ? "text-slate-200" : "text-slate-700"
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
                            defaultChecked={index === defaultIndex}
                            className="h-4 w-4"
                        />

                        <span>
                            <span className="block text-sm">
                                {LABEL[option.currency]}
                            </span>
                            <span className="block text-lg font-bold">
                                {formatCheckoutMoney(
                                    option.displayAmount,
                                    option.currency,
                                )}
                            </span>
                            {option.chargedNote ? (
                                <span
                                    className={`block text-xs ${
                                        dark ? "text-slate-400" : "text-slate-500"
                                    }`}
                                >
                                    {option.chargedNote}
                                </span>
                            ) : null}
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
