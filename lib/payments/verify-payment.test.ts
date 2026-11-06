import { describe, expect, it } from "vitest";

import { paystackAmountCovers } from "./verify-payment";

describe("paystackAmountCovers", () => {
    it("accepts the exact amount", () => {
        expect(paystackAmountCovers({ amount: 320000 }, 320000)).toBe(true);
    });

    it("accepts an amount that includes fees passed to the customer", () => {
        expect(
            paystackAmountCovers({ amount: 334800, requested_amount: 320000 }, 320000),
        ).toBe(true);
        expect(paystackAmountCovers({ amount: 334800 }, 320000)).toBe(true);
    });

    it("rejects an underpayment", () => {
        expect(paystackAmountCovers({ amount: 300000 }, 320000)).toBe(false);
        expect(
            paystackAmountCovers({ amount: 300000, requested_amount: 320000 }, 320000),
        ).toBe(false);
    });
});
