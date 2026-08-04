import { paystackRequest } from "./paystack";

export type PaystackBank = {
    id: number;
    name: string;
    code: string;
    country: string;
    currency: string;
    type: string;
};

type PaystackBankListResponse = {
    status: boolean;
    message: string;
    data: PaystackBank[];
};

let cachedBanks: PaystackBank[] | null = null;

/**
 * Lists Nigerian banks supported for Paystack transfer recipients.
 * Cached in-memory for the process lifetime since Paystack's bank list
 * changes rarely.
 */
export async function listNigerianBanks(): Promise<PaystackBank[]> {
    if (cachedBanks) {
        return cachedBanks;
    }

    const response = await paystackRequest<PaystackBankListResponse>(
        "/bank?country=nigeria&currency=NGN",
        { method: "GET" },
    );

    cachedBanks = response.data;

    return cachedBanks;
}
