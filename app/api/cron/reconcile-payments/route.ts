import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { autoReconcilePaystackPayments } from "@/lib/payments/auto-reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function securelyMatches(
    providedValue: string,
    expectedValue: string,
): boolean {
    const providedBuffer = Buffer.from(providedValue);

    const expectedBuffer = Buffer.from(expectedValue);

    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
}

function isAuthorized(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error("CRON_SECRET is not configured");

        return false;
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return false;
    }

    const suppliedSecret = authorization
        .slice("Bearer ".length)
        .trim();

    return securelyMatches(suppliedSecret, cronSecret);
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            { success: false, error: "Unauthorized." },
            { status: 401, headers: { "Cache-Control": "no-store" } },
        );
    }

    // Daily backstop: any Paystack payment from the last 14 days that
    // Paystack says succeeded but we never completed.
    const result = await autoReconcilePaystackPayments({
        sinceDays: 14,
        limit: 100,
    });

    logger.info("Payment reconciliation cron finished", {
        event: "PAYMENT_RECONCILE_CRON",
        checked: result.checked,
        completed: result.completed.length,
    });

    return NextResponse.json(
        { success: true, ...result },
        { headers: { "Cache-Control": "no-store" } },
    );
}
