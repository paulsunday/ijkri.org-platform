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