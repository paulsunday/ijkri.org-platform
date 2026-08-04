import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
}));

beforeEach(() => {
  findUniqueMock.mockReset();
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewerAmbassador: {
      findUnique: findUniqueMock,
    },
  },
}));

const { generateReferralCode } = await import("./referral-code");

describe("generateReferralCode", () => {
  it("matches the SHORTNAME-RF-XXXXXX format", async () => {
    findUniqueMock.mockResolvedValue(null);

    const code = await generateReferralCode("IJKRI");

    expect(code).toMatch(/^IJKRI-RF-[0-9A-F]{6}$/);
  });

  it("retries on collision and returns the next unique code", async () => {
    findUniqueMock
      .mockResolvedValueOnce({ id: "existing-1" })
      .mockResolvedValueOnce(null);

    const code = await generateReferralCode("IJKRI");

    expect(findUniqueMock).toHaveBeenCalledTimes(2);
    expect(code).toMatch(/^IJKRI-RF-[0-9A-F]{6}$/);
  });

  it("throws after exhausting all retry attempts", async () => {
    findUniqueMock.mockResolvedValue({ id: "always-taken" });

    await expect(generateReferralCode("IJKRI")).rejects.toThrow(
      /unique referral code/i,
    );
  });

  it("strips non-alphanumeric characters from the journal short name", async () => {
    findUniqueMock.mockResolvedValue(null);

    const code = await generateReferralCode("ij-kri!");

    expect(code.startsWith("IJKRI-RF-")).toBe(true);
  });
});
