import { paystackRequest } from "./paystack";

type InitializePaystackPaymentInput = {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    invoiceId: string;
    userId: string;
};

type InitializePaystackPaymentResponse = {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
};

export async function initializePaystackPayment({
    email,
    amount,
    currency,
    reference,
    callbackUrl,
    invoiceId,
    userId,
}: InitializePaystackPaymentInput) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount must be greater than zero.");
    }

    return paystackRequest<InitializePaystackPaymentResponse>(
        "/transaction/initialize",
        {
            method: "POST",
            body: JSON.stringify({
                email,

                // Paystack expects the amount in the smallest
                // currency unit, such as cents or kobo.
                amount: Math.round(amount * 100),

                currency,
                reference,
                callback_url: callbackUrl,

                metadata: {
                    invoiceId,
                    userId,
                    purpose: "APC",
                },
            }),
        },
    );
}