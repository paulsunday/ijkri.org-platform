import { paystackRequest } from "./paystack";

export type PaystackAccountResolution = {
    status: boolean;
    message: string;
    data: {
        account_number: string;
        account_name: string;
        bank_id: number;
    };
};

/**
 * Verifies that a bank account number belongs to the given bank code
 * before it can be saved as a payout destination.
 */
export async function resolveBankAccount({
    accountNumber,
    bankCode,
}: {
    accountNumber: string;
    bankCode: string;
}): Promise<PaystackAccountResolution> {
    const params = new URLSearchParams({
        account_number: accountNumber,
        bank_code: bankCode,
    });

    return paystackRequest<PaystackAccountResolution>(
        `/bank/resolve?${params.toString()}`,
        { method: "GET" },
    );
}
