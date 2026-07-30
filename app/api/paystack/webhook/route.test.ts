import { createHmac } from "crypto";

import { NextRequest } from "next/server";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { Prisma } from "@/lib/generated/prisma";

const SECRET_KEY = "test_secret_key";

const {
    paymentWebhookLogFindUnique,
    paymentWebhookLogCreate,
    paymentWebhookLogUpdate,
    paymentFindFirst,
    verifyPaystackPaymentMock,
    completePaymentMock,
} = vi.hoisted(() => ({
    paymentWebhookLogFindUnique: vi.fn(),
    paymentWebhookLogCreate: vi.fn(),
    paymentWebhookLogUpdate: vi.fn(),
    paymentFindFirst: vi.fn(),
    verifyPaystackPaymentMock: vi.fn(),
    completePaymentMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        paymentWebhookLog: {
            findUnique: paymentWebhookLogFindUnique,
            create: paymentWebhookLogCreate,
            update: paymentWebhookLogUpdate,
        },
        payment: {
            findFirst: paymentFindFirst,
        },
    },
}));

vi.mock("@/lib/payments/verify-payment", () => ({
    verifyPaystackPayment: verifyPaystackPaymentMock,
}));

vi.mock("@/lib/payments/complete-payment", () => ({
    completePayment: completePaymentMock,
}));

const { POST } = await import("./route");

function sign(rawBody: string, secret = SECRET_KEY) {
    return createHmac("sha512", secret)
        .update(rawBody, "utf8")
        .digest("hex");
}

function buildRequest(rawBody: string, signature?: string) {
    const headers = new Headers();

    if (signature !== undefined) {
        headers.set("x-paystack-signature", signature);
    }

    return new NextRequest(
        "http://localhost/api/paystack/webhook",
        {
            method: "POST",
            body: rawBody,
            headers,
        },
    );
}

const basePayment = {
    id: "pay_1",
    userId: "user_1",
    invoiceId: "inv_1",
    status: "PENDING",
    amount: new Prisma.Decimal(100),
    currency: "USD",
    internalReference: "ref_1",
    providerReference: null,
    customerEmail: "author@example.com",
    user: { email: "author@example.com" },
};

const baseVerification = {
    status: true,
    message: "Verification successful",
    data: {
        id: 555,
        domain: "test",
        status: "success",
        reference: "ref_1",
        receipt_number: null,
        amount: 10_000,
        message: null,
        gateway_response: "Successful",
        paid_at: "2026-07-30T10:00:00.000Z",
        created_at: "2026-07-30T09:59:00.000Z",
        channel: "card",
        currency: "USD",
        ip_address: null,
        fees: 150,
        customer: {
            id: 1,
            email: "author@example.com",
            customer_code: "CUS_1",
            first_name: null,
            last_name: null,
            phone: null,
        },
    },
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET_KEY);

    paymentWebhookLogFindUnique.mockResolvedValue(null);

    paymentWebhookLogCreate.mockResolvedValue({
        id: "log_1",
        paymentId: null,
        processed: false,
    });

    paymentWebhookLogUpdate.mockResolvedValue({});
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("POST /api/paystack/webhook", () => {
    it("rejects a body that is not valid JSON", async () => {
        const res = await POST(
            buildRequest("not-json", "irrelevant-signature"),
        );

        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({
            received: false,
            error: "The webhook body is not valid JSON.",
        });
        expect(paymentWebhookLogCreate).not.toHaveBeenCalled();
    });

    it("returns 500 when PAYSTACK_SECRET_KEY is not configured", async () => {
        vi.stubEnv("PAYSTACK_SECRET_KEY", "");

        const rawBody = JSON.stringify({
            event: "charge.success",
            data: { reference: "ref_1" },
        });

        const res = await POST(buildRequest(rawBody, "sig"));

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({
            received: false,
            error: "Payment webhook configuration error.",
        });
        expect(paymentWebhookLogCreate).not.toHaveBeenCalled();
    });

    it("logs and rejects an invalid signature", async () => {
        const rawBody = JSON.stringify({
            event: "charge.success",
            data: { reference: "ref_1" },
        });

        const res = await POST(
            buildRequest(rawBody, "totally-wrong-signature"),
        );

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({
            received: false,
            error: "Invalid webhook signature.",
        });

        expect(paymentWebhookLogCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    provider: "PAYSTACK",
                    signatureValid: false,
                }),
            }),
        );

        expect(paymentWebhookLogUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "log_1" },
                data: expect.objectContaining({
                    errorMessage:
                        "The Paystack webhook signature was invalid.",
                }),
            }),
        );

        expect(verifyPaystackPaymentMock).not.toHaveBeenCalled();
    });

    it("short-circuits when the event was already processed", async () => {
        paymentWebhookLogFindUnique.mockResolvedValue({
            id: "log_1",
            paymentId: "pay_1",
            processed: true,
            signatureValid: true,
            processingAttempts: 1,
        });

        const rawBody = JSON.stringify({
            event: "charge.success",
            data: { reference: "ref_1" },
        });

        const res = await POST(
            buildRequest(rawBody, sign(rawBody)),
        );

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            received: true,
            processed: true,
            duplicate: true,
        });

        expect(paymentWebhookLogCreate).not.toHaveBeenCalled();
        expect(paymentWebhookLogUpdate).not.toHaveBeenCalled();
        expect(verifyPaystackPaymentMock).not.toHaveBeenCalled();
    });

    it("acknowledges and ignores non charge.success events", async () => {
        const rawBody = JSON.stringify({
            event: "charge.failed",
            data: { reference: "ref_1" },
        });

        const res = await POST(
            buildRequest(rawBody, sign(rawBody)),
        );

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            received: true,
            processed: true,
            ignored: true,
            eventType: "charge.failed",
        });

        expect(paymentFindFirst).not.toHaveBeenCalled();
    });

    it("rejects a charge.success event with no transaction reference", async () => {
        const rawBody = JSON.stringify({
            event: "charge.success",
            data: {},
        });

        const res = await POST(
            buildRequest(rawBody, sign(rawBody)),
        );

        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({
            received: false,
            error: "Transaction reference is missing.",
        });
    });

    it("returns 404 when no matching payment record exists", async () => {
        paymentFindFirst.mockResolvedValue(null);

        const rawBody = JSON.stringify({
            event: "charge.success",
            data: { reference: "ref_missing" },
        });

        const res = await POST(
            buildRequest(rawBody, sign(rawBody)),
        );

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            received: false,
            error: "Matching payment was not found.",
        });
        expect(verifyPaystackPaymentMock).not.toHaveBeenCalled();
    });

    it("verifies, completes, and marks the webhook processed on a successful charge", async () => {
        paymentFindFirst.mockResolvedValue(basePayment);
        verifyPaystackPaymentMock.mockResolvedValue(baseVerification);
        completePaymentMock.mockResolvedValue({
            success: true,
            paymentId: "pay_1",
            invoiceId: "inv_1",
            receiptNumber: "RCT-1",
            alreadyProcessed: false,
        });

        const rawBody = JSON.stringify({
            event: "charge.success",
            data: { reference: "ref_1", id: 555 },
        });

        const res = await POST(
            buildRequest(rawBody, sign(rawBody)),
        );

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            received: true,
            processed: true,
            paymentId: "pay_1",
            alreadyProcessed: false,
        });

        expect(verifyPaystackPaymentMock).toHaveBeenCalledWith(
            "ref_1",
        );

        expect(completePaymentMock).toHaveBeenCalledWith(
            expect.objectContaining({
                paymentId: "pay_1",
                providerReference: "ref_1",
                providerStatus: "success",
                paidAmount: 100,
            }),
        );

        expect(paymentWebhookLogUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                where: { id: "log_1" },
                data: expect.objectContaining({
                    processed: true,
                    errorMessage: null,
                }),
            }),
        );
    });

    it("fails closed when the verified amount does not match the expected payment amount", async () => {
        paymentFindFirst.mockResolvedValue(basePayment);
        verifyPaystackPaymentMock.mockResolvedValue({
            ...baseVerification,
            data: {
                ...baseVerification.data,
                amount: 5_000,
            },
        });

        const rawBody = JSON.stringify({
            event: "charge.success",
            data: { reference: "ref_1", id: 555 },
        });

        const res = await POST(
            buildRequest(rawBody, sign(rawBody)),
        );

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({
            received: false,
            error: "Webhook processing failed.",
        });

        expect(completePaymentMock).not.toHaveBeenCalled();

        expect(paymentWebhookLogUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    processed: false,
                    errorMessage:
                        "The verified transaction amount did not match the expected payment amount.",
                }),
            }),
        );
    });

    it("fails closed when the verified customer email does not match the payment owner", async () => {
        paymentFindFirst.mockResolvedValue(basePayment);
        verifyPaystackPaymentMock.mockResolvedValue({
            ...baseVerification,
            data: {
                ...baseVerification.data,
                customer: {
                    ...baseVerification.data.customer,
                    email: "attacker@example.com",
                },
            },
        });

        const rawBody = JSON.stringify({
            event: "charge.success",
            data: { reference: "ref_1", id: 555 },
        });

        const res = await POST(
            buildRequest(rawBody, sign(rawBody)),
        );

        expect(res.status).toBe(500);
        expect(completePaymentMock).not.toHaveBeenCalled();

        expect(paymentWebhookLogUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    processed: false,
                    errorMessage:
                        "The verified customer email did not match the payment owner.",
                }),
            }),
        );
    });
});
