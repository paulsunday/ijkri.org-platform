import type { Prisma } from "@/lib/generated/prisma";

export type CheckoutCurrency = "USD" | "NGN";

/**
 * Reads the payer's chosen currency from a checkout form. Anything
 * other than "NGN" falls back to the journal's own currency.
 */
export function parseCheckoutCurrency(
    value: FormDataEntryValue | null,
): CheckoutCurrency | null {
    const normalized = String(value ?? "").trim().toUpperCase();

    if (normalized === "NGN" || normalized === "USD") {
        return normalized;
    }

    return null;
}

export type CheckoutPrice = {
    amount: Prisma.Decimal;
    currency: CheckoutCurrency;
    exchangeRate: Prisma.Decimal | null;
};

export const PAYMENTS_UNAVAILABLE_MESSAGE =
    "Online payment isn't available yet. Please try again later or contact the journal.";

/**
 * Currencies the Paystack merchant account can actually accept, from
 * PAYSTACK_SUPPORTED_CURRENCIES (e.g. "NGN,USD"). Defaults to Naira
 * only — the account's state until Paystack approves USD.
 */
export function getSupportedCheckoutCurrencies(): CheckoutCurrency[] {
    const configured = (process.env.PAYSTACK_SUPPORTED_CURRENCIES || "NGN")
        .split(",")
        .map((value) => parseCheckoutCurrency(value))
        .filter((value): value is CheckoutCurrency => value !== null);

    return configured.length > 0 ? configured : ["NGN"];
}

/**
 * The currencies a payer can actually be offered for this journal:
 * supported by the merchant AND priceable (Naira needs a rate unless
 * the journal is priced in Naira).
 */
export function getOfferedCheckoutCurrencies({
    baseCurrency,
    ngnExchangeRate,
    supportedCurrencies = getSupportedCheckoutCurrencies(),
}: {
    baseCurrency: CheckoutCurrency;
    ngnExchangeRate: Prisma.Decimal | null;
    supportedCurrencies?: CheckoutCurrency[];
}): CheckoutCurrency[] {
    const hasRate = Boolean(ngnExchangeRate && ngnExchangeRate.greaterThan(0));

    return (["USD", "NGN"] as const).filter((currency) => {
        if (!supportedCurrencies.includes(currency)) return false;
        if (currency === baseCurrency) return true;

        return currency === "NGN" && hasRate;
    });
}

/**
 * Converts a journal price into the currency the payer picked.
 * Paying in the journal's own currency needs no conversion; paying in
 * Naira multiplies by the journal's admin-set NGN exchange rate. If the
 * chosen currency can't be offered, falls back to one that can.
 */
export function resolveCheckoutPrice({
    baseAmount,
    baseCurrency,
    chosenCurrency,
    ngnExchangeRate,
    supportedCurrencies,
}: {
    baseAmount: Prisma.Decimal;
    baseCurrency: CheckoutCurrency;
    chosenCurrency: CheckoutCurrency | null;
    ngnExchangeRate: Prisma.Decimal | null;
    supportedCurrencies?: CheckoutCurrency[];
}): CheckoutPrice {
    const offered = getOfferedCheckoutCurrencies({
        baseCurrency,
        ngnExchangeRate,
        supportedCurrencies,
    });

    if (offered.length === 0) {
        throw new Error(PAYMENTS_UNAVAILABLE_MESSAGE);
    }

    const currency =
        chosenCurrency && offered.includes(chosenCurrency)
            ? chosenCurrency
            : offered.includes(baseCurrency)
              ? baseCurrency
              : offered[0];

    if (currency === baseCurrency) {
        return { amount: baseAmount, currency, exchangeRate: null };
    }

    // Only NGN conversion is offered, and only with a rate (checked above).
    const rate = ngnExchangeRate as Prisma.Decimal;

    return {
        // Round up to the next whole Naira so we never undercharge.
        amount: baseAmount.mul(rate).ceil(),
        currency: "NGN",
        exchangeRate: rate,
    };
}

export function formatCheckoutMoney(
    amount: Prisma.Decimal | number,
    currency: string,
) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        minimumFractionDigits: currency === "NGN" ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(typeof amount === "number" ? amount : amount.toNumber());
}
