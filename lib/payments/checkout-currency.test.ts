import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/lib/generated/prisma";

import {
    getOfferedCheckoutCurrencies,
    getSupportedCheckoutCurrencies,
    parseCheckoutCurrency,
    resolveCheckoutPrice,
} from "./checkout-currency";

const d = (value: number | string) => new Prisma.Decimal(value);

const BOTH = ["NGN", "USD"] as const;

afterEach(() => {
    vi.unstubAllEnvs();
});

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

describe("getSupportedCheckoutCurrencies", () => {
    it("defaults to Naira only", () => {
        vi.stubEnv("PAYSTACK_SUPPORTED_CURRENCIES", "");
        expect(getSupportedCheckoutCurrencies()).toEqual(["NGN"]);
    });

    it("reads the configured list", () => {
        vi.stubEnv("PAYSTACK_SUPPORTED_CURRENCIES", "NGN, usd");
        expect(getSupportedCheckoutCurrencies()).toEqual(["NGN", "USD"]);
    });
});

describe("getOfferedCheckoutCurrencies", () => {
    it("hides USD when the merchant only accepts Naira", () => {
        expect(
            getOfferedCheckoutCurrencies({
                baseCurrency: "USD",
                ngnExchangeRate: d(1600),
                supportedCurrencies: ["NGN"],
            }),
        ).toEqual(["NGN"]);
    });

    it("offers nothing when Naira-only and no rate is set", () => {
        expect(
            getOfferedCheckoutCurrencies({
                baseCurrency: "USD",
                ngnExchangeRate: null,
                supportedCurrencies: ["NGN"],
            }),
        ).toEqual([]);
    });

    it("offers both once USD is enabled and a rate is set", () => {
        expect(
            getOfferedCheckoutCurrencies({
                baseCurrency: "USD",
                ngnExchangeRate: d(1600),
                supportedCurrencies: [...BOTH],
            }),
        ).toEqual(["USD", "NGN"]);
    });
});

describe("resolveCheckoutPrice", () => {
    it("charges the base price when the base currency is chosen", () => {
        const price = resolveCheckoutPrice({
            baseAmount: d(97),
            baseCurrency: "USD",
            chosenCurrency: "USD",
            ngnExchangeRate: d(1550),
            supportedCurrencies: [...BOTH],
        });

        expect(price.currency).toBe("USD");
        expect(price.amount.toString()).toBe("97");
        expect(price.exchangeRate).toBeNull();
    });

    it("converts to Naira and rounds up to a whole Naira", () => {
        const price = resolveCheckoutPrice({
            baseAmount: d("2.00"),
            baseCurrency: "USD",
            chosenCurrency: "NGN",
            ngnExchangeRate: d("1550.2500"),
            supportedCurrencies: [...BOTH],
        });

        expect(price.currency).toBe("NGN");
        expect(price.amount.toString()).toBe("3101");
        expect(price.exchangeRate?.toString()).toBe("1550.25");
    });

    it("falls back to Naira when USD is chosen but not accepted", () => {
        const price = resolveCheckoutPrice({
            baseAmount: d(2),
            baseCurrency: "USD",
            chosenCurrency: "USD",
            ngnExchangeRate: d(1600),
            supportedCurrencies: ["NGN"],
        });

        expect(price.currency).toBe("NGN");
        expect(price.amount.toString()).toBe("3200");
    });

    it("refuses when no currency can be charged", () => {
        expect(() =>
            resolveCheckoutPrice({
                baseAmount: d(6),
                baseCurrency: "USD",
                chosenCurrency: null,
                ngnExchangeRate: null,
                supportedCurrencies: ["NGN"],
            }),
        ).toThrow(/isn't available yet/);
    });
});
