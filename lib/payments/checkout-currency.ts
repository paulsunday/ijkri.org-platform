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

/**
 * Converts a journal price into the currency the payer picked.
 * Paying in the journal's own currency needs no conversion; paying in
 * Naira multiplies by the journal's admin-set NGN exchange rate.
 */
export function resolveCheckoutPrice({
    baseAmount,
    baseCurrency,
    chosenCurrency,
    ngnExchangeRate,
}: {
    baseAmount: Prisma.Decimal;
    baseCurrency: CheckoutCurrency;
    chosenCurrency: CheckoutCurrency | null;
    ngnExchangeRate: Prisma.Decimal | null;
}): CheckoutPrice {
    const currency = chosenCurrency ?? baseCurrency;

    if (currency === baseCurrency) {
        return { amount: baseAmount, currency, exchangeRate: null };
    }

    if (currency !== "NGN") {
        throw new Error(`Payments in ${currency} are not supported.`);
    }

    if (!ngnExchangeRate || ngnExchangeRate.lessThanOrEqualTo(0)) {
        throw new Error(
            "Naira payments are not available yet. Please pay in USD or contact the journal.",
        );
    }

    return {
        // Round up to the next whole Naira so we never undercharge.
        amount: baseAmount.mul(ngnExchangeRate).ceil(),
        currency: "NGN",
        exchangeRate: ngnExchangeRate,
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
