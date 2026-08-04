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

const { resolveReferralCode, resolveAmbassadorByReviewerId } = await import(
  "./resolve-referral"
);

describe("resolveReferralCode", () => {
  it("resolves an active ambassador code", async () => {
    findUniqueMock.mockResolvedValue({
      id: "amb_1",
      userId: "user_1",
      status: "ACTIVE",
    });

    const result = await resolveReferralCode("IJKRI-RF-ABC123");

    expect(result).toEqual({ reviewerId: "user_1", ambassadorId: "amb_1" });
  });

  it("returns null for an unknown code without throwing", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(resolveReferralCode("NOT-REAL")).resolves.toBeNull();
  });

  it("returns null for a suspended ambassador's code", async () => {
    findUniqueMock.mockResolvedValue({
      id: "amb_2",
      userId: "user_2",
      status: "SUSPENDED",
    });

    await expect(resolveReferralCode("IJKRI-RF-SUSP01")).resolves.toBeNull();
  });

  it("returns null for empty/whitespace input without querying the database", async () => {
    await expect(resolveReferralCode("")).resolves.toBeNull();
    await expect(resolveReferralCode("   ")).resolves.toBeNull();
    await expect(resolveReferralCode(undefined)).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});

describe("resolveAmbassadorByReviewerId", () => {
  it("returns null when no reviewerId is supplied", async () => {
    await expect(resolveAmbassadorByReviewerId(null)).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null for a suspended ambassador", async () => {
    findUniqueMock.mockResolvedValue({
      id: "amb_3",
      userId: "user_3",
      status: "SUSPENDED",
    });

    await expect(
      resolveAmbassadorByReviewerId("user_3"),
    ).resolves.toBeNull();
  });
});
