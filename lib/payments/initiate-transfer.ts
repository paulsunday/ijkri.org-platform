import { paystackRequest } from "./paystack";

export type PaystackTransferResponse = {
    status: boolean;
    message: string;
    data: {
        reference: string;
        transfer_code: string;
        id: number;
        status: string;
        amount: number;
        currency: string;
    };
};

/**
 * Initiates a Paystack transfer to a previously-created recipient.
 * `amount` is in the transfer's major currency unit (e.g. Naira); this
 * converts to Paystack's expected minor units (kobo) internally,
 * matching the *100 convention already used for inbound charges in
 * app/api/paystack/webhook/route.ts.
 *
 * Note: Paystack Transfers to Nigerian bank accounts settle in NGN.
 * This platform's wallet balances are denominated in USD (per product
 * decision), so the amount sent here is the wallet's numeric balance,
 * not an FX-converted NGN figure — an administrator must confirm the
 * correct payout amount before approving a withdrawal.
 */
export async function initiateTransfer({
    amount,
    recipientCode,
    reference,
    reason,
}: {
    amount: number;
    recipientCode: string;
    reference: string;
    reason: string;
}): Promise<PaystackTransferResponse> {
    return paystackRequest<PaystackTransferResponse>("/transfer", {
        method: "POST",
        body: JSON.stringify({
            source: "balance",
            amount: Math.round(amount * 100),
            recipient: recipientCode,
            reference,
            reason,
        }),
    });
}
