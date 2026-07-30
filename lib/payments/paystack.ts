const PAYSTACK_BASE_URL = "https://api.paystack.co";

type PaystackErrorResponse = {
    status?: boolean;
    message?: string;
};

export async function paystackRequest<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
        throw new Error(
            "PAYSTACK_SECRET_KEY is not configured.",
        );
    }

    const response = await fetch(
        `${PAYSTACK_BASE_URL}${endpoint}`,
        {
            ...options,
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
                ...options.headers,
            },
            cache: "no-store",
        },
    );

    const body = (await response.json()) as
        | T
        | PaystackErrorResponse;

    if (!response.ok) {
        const errorBody = body as PaystackErrorResponse;

        throw new Error(
            errorBody.message ??
            `Paystack request failed with status ${response.status}.`,
        );
    }

    return body as T;
}