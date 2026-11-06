import { paystackRequest } from "./paystack";

export type PaystackVerificationResponse = {
    status: boolean;
    message: string;

    data: {
        id: number;
        domain: string;
        status: string;
        reference: string;
        receipt_number: string | null;
        amount: number;
        /** The amount we asked for, before any fees passed to the customer. */
        requested_amount?: number | null;
        message: string | null;
        gateway_response: string;
        paid_at: string | null;
        created_at: string;
        channel: string | null;
        currency: string;
        ip_address: string | null;
        fees: number | null;

        customer: {
            id: number;
            email: string;
            customer_code: string;
            first_name: string | null;
            last_name: string | null;
            phone: string | null;
        };

        metadata?: {
            invoiceId?: string;
            userId?: string;
            purpose?: string;
            [key: string]: unknown;
        } | null;
    };
};

/**
 * Whether a verified Paystack transaction paid for the expected amount.
 *
 * When the merchant passes transaction fees to customers, Paystack's
 * `amount` is the price plus fees, so an exact match wrongly rejects
 * real payments. Accept when what we requested matches, or when the
 * amount charged covers the price. (completePayment() separately
 * refuses any underpayment.)
 */
export function paystackAmountCovers(
    transaction: { amount: number; requested_amount?: number | null },
    expectedMinorUnits: number,
): boolean {
    if (
        typeof transaction.requested_amount === "number" &&
        transaction.requested_amount === expectedMinorUnits &&
        transaction.amount >= expectedMinorUnits
    ) {
        return true;
    }

    return transaction.amount >= expectedMinorUnits;
}

export async function verifyPaystackPayment(
    reference: string,
) {
    const safeReference = encodeURIComponent(reference);

    return paystackRequest<PaystackVerificationResponse>(
        `/transaction/verify/${safeReference}`,
        {
            method: "GET",
        },
    );
}