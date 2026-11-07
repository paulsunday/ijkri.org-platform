import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import { startToolkitCheckout } from "@/lib/payments/toolkit-checkout";

export const dynamic = "force-dynamic";

/*
 * Unlock button target. A plain POST route (not a server action) keeps
 * working for students whose page was loaded before a new deployment —
 * stale server-action IDs were causing "Application Error" on unlock.
 */
export async function POST(request: NextRequest) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.redirect(
            new URL("/login?callbackUrl=%2Ftoolkit", request.url),
            303,
        );
    }

    let destination: string;

    try {
        const formData = await request.formData();

        destination = await startToolkitCheckout(
            { id: user.id, email: user.email },
            formData.get("currency"),
        );
    } catch (error) {
        logger.error("Toolkit checkout failed", error, {
            event: "TOOLKIT_CHECKOUT_FAILED",
            userId: user.id,
        });

        destination = `/toolkit?payment=error&message=${encodeURIComponent(
            "We couldn't start the payment. Please try again in a moment.",
        )}`;
    }

    // 303 so the browser follows with GET (to Paystack or /toolkit).
    return NextResponse.redirect(new URL(destination, request.url), 303);
}
