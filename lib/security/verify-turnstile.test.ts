import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstileToken } from "./verify-turnstile";

function makeFormData(token?: string) {
  const formData = new FormData();

  if (token !== undefined) {
    formData.set("cf-turnstile-response", token);
  }

  return formData;
}

describe("verifyTurnstileToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a no-op outside production when no secret key is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.spyOn(global, "fetch");

    await expect(
      verifyTurnstileToken(makeFormData()),
    ).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed in production when no secret key is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(verifyTurnstileToken(makeFormData())).rejects.toThrow();
  });

  it("rejects when no token was submitted", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

    await expect(
      verifyTurnstileToken(makeFormData()),
    ).rejects.toThrow("complete the verification challenge");
  });

  it("passes when Cloudflare reports success", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    await expect(
      verifyTurnstileToken(makeFormData("valid-token")),
    ).resolves.toBeUndefined();
  });

  it("rejects when Cloudflare reports failure", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }),
        { status: 200 },
      ),
    );

    await expect(
      verifyTurnstileToken(makeFormData("expired-token")),
    ).rejects.toThrow("verification challenge failed");
  });

  it("rejects if the verification request itself fails", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    await expect(
      verifyTurnstileToken(makeFormData("some-token")),
    ).rejects.toThrow("could not be checked");
  });
});
