import { describe, expect, it } from "vitest";

import { Prisma } from "@/lib/generated/prisma";

import {
    parseCheckoutCurrency,
    resolveCheckoutPrice,
} from "./checkout-currency";

const d = (value: number | string) => new Prisma.Decimal(value);

describe("parseCheckoutCurrency", () => {
    it("accepts USD and NGN in any case", () => {
        expect(parseCheckoutCurrency("ngn")).toBe("NGN");
        expect(parseCheckoutCurrency(" USD ")).toBe("USD");
    });

    it("returns null for missing or unknown values", () => {
        expect(parseCheckoutCurrency(null)).toBeNull();
        expect(parseCheckoutCurrency("EUR")).toBeNull();
    });
});

describe("resolveCheckoutPrice", () => {
    it("charges the base price when the base currency is chosen", () => {
        const price = resolveCheckoutPrice({
            baseAmount: d(97),
            baseCurrency: "USD",
            chosenCurrency: "USD",
            ngnExchangeRate: d(1550),
        });

        expect(price.currency).toBe("USD");
        expect(price.amount.toString()).toBe("97");
        expect(price.exchangeRate).toBeNull();
    });

    it("falls back to the base currency when nothing was chosen", () => {
        const price = resolveCheckoutPrice({
            baseAmount: d(2),
            baseCurrency: "USD",
            chosenCurrency: null,
            ngnExchangeRate: null,
        });

        expect(price.currency).toBe("USD");
    });

    it("converts to Naira and rounds up to a whole Naira", () => {
        const price = resolveCheckoutPrice({
            baseAmount: d("2.00"),
            baseCurrency: "USD",
            chosenCurrency: "NGN",
            ngnExchangeRate: d("1550.2500"),
        });

        expect(price.currency).toBe("NGN");
        expect(price.amount.toString()).toBe("3101");
        expect(price.exchangeRate?.toString()).toBe("1550.25");
    });

    it("refuses Naira when no exchange rate is set", () => {
        expect(() =>
            resolveCheckoutPrice({
                baseAmount: d(6),
                baseCurrency: "USD",
                chosenCurrency: "NGN",
                ngnExchangeRate: null,
            }),
        ).toThrow(/Naira payments are not available/);
    });
});
