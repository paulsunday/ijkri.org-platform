import { paystackRequest } from "./paystack";

export type PaystackTransferRecipientResponse = {
    status: boolean;
    message: string;
    data: {
        recipient_code: string;
        type: string;
        name: string;
        details: {
            account_number: string;
            account_name: string | null;
            bank_code: string;
            bank_name: string;
        };
    };
};

export async function createTransferRecipient({
    name,
    accountNumber,
    bankCode,
}: {
    name: string;
    accountNumber: string;
    bankCode: string;
}): Promise<PaystackTransferRecipientResponse> {
    return paystackRequest<PaystackTransferRecipientResponse>(
        "/transferrecipient",
        {
            method: "POST",
            body: JSON.stringify({
                type: "nuban",
                name,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: "NGN",
            }),
        },
    );
}
