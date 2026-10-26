import { logger } from "@/lib/logger";

const TURNSTILE_FIELD_NAME = "cf-turnstile-response";
const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

/**
 * Verifies a Cloudflare Turnstile token server-side. Throws a generic
 * error on failure so the caller's existing error-handling path (toast,
 * form error, etc.) just works without special-casing.
 *
 * If TURNSTILE_SECRET_KEY is not configured, this is a no-op in
 * development so local work isn't blocked by a missing Cloudflare
 * account; production must have it configured.
 */
export async function verifyTurnstileToken(
  formData: FormData,
): Promise<void> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      logger.error(
        "TURNSTILE_SECRET_KEY is not configured in production",
      );

      throw new Error(
        "This form cannot accept submissions right now. Please try again later.",
      );
    }

    return;
  }

  const token = formData.get(TURNSTILE_FIELD_NAME);

  if (typeof token !== "string" || !token) {
    throw new Error(
      "Please complete the verification challenge before submitting.",
    );
  }

  let result: TurnstileVerifyResponse;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    result = await response.json();
  } catch (error) {
    logger.error("Turnstile verification request failed", error, {
      event: "TURNSTILE_VERIFY_REQUEST_FAILED",
    });

    throw new Error(
      "The verification challenge could not be checked. Please try again.",
    );
  }

  if (!result.success) {
    logger.warn("Turnstile verification failed", {
      event: "TURNSTILE_VERIFY_FAILED",
      errorCodes: result["error-codes"] ?? [],
    });

    throw new Error(
      "The verification challenge failed. Please reload the page and try again.",
    );
  }
}
