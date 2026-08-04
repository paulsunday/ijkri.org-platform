import { beforeEach, describe, expect, it, vi } from "vitest";

const { campaignFindMany } = vi.hoisted(() => ({
  campaignFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    referralCampaign: { findMany: campaignFindMany },
  },
}));

const { resolveActiveCampaignBonus } = await import("./resolve-active-campaign");

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "campaign_1",
    rewardMultiplier: 1,
    reviewBonus: 0,
    submissionBonus: 0,
    publicationBonus: 0,
    referralBonus: 0,
    targetCountry: null,
    targetInstitution: null,
    targetDiscipline: null,
    maxBudget: null,
    spentBudget: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveActiveCampaignBonus", () => {
  it("returns null when no campaign is active", async () => {
    campaignFindMany.mockResolvedValue([]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "REVIEW_REWARD",
      baseAmount: 100,
    });

    expect(result).toBeNull();
  });

  it("applies a multiplier bonus on top of the base amount", async () => {
    campaignFindMany.mockResolvedValue([makeCampaign({ rewardMultiplier: 1.5 })]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "REVIEW_REWARD",
      baseAmount: 100,
    });

    expect(result).toEqual({ campaignId: "campaign_1", bonusAmount: 50 });
  });

  it("adds the type-specific flat bonus on top of the multiplier bonus", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ rewardMultiplier: 1, submissionBonus: 25 }),
    ]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "SUBMISSION_REWARD",
      baseAmount: 100,
    });

    expect(result).toEqual({ campaignId: "campaign_1", bonusAmount: 25 });
  });

  it("skips a campaign whose target country does not match", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ targetCountry: "Kenya", reviewBonus: 10 }),
    ]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "REVIEW_REWARD",
      baseAmount: 100,
      referredCountry: "Nigeria",
    });

    expect(result).toBeNull();
  });

  it("matches a target country case-insensitively", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ targetCountry: "nigeria", reviewBonus: 10 }),
    ]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "REVIEW_REWARD",
      baseAmount: 100,
      referredCountry: "Nigeria",
    });

    expect(result).toEqual({ campaignId: "campaign_1", bonusAmount: 10 });
  });

  it("caps the bonus at the remaining budget instead of skipping entirely", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ reviewBonus: 50, maxBudget: 100, spentBudget: 80 }),
    ]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "REVIEW_REWARD",
      baseAmount: 100,
    });

    expect(result).toEqual({ campaignId: "campaign_1", bonusAmount: 20 });
  });

  it("skips a campaign with no remaining budget", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ reviewBonus: 50, maxBudget: 100, spentBudget: 100 }),
    ]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "REVIEW_REWARD",
      baseAmount: 100,
    });

    expect(result).toBeNull();
  });

  it("falls through to the next matching campaign when the first has zero bonus", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ id: "campaign_zero", rewardMultiplier: 1 }),
      makeCampaign({ id: "campaign_real", reviewBonus: 15 }),
    ]);

    const result = await resolveActiveCampaignBonus({
      journalId: "journal_1",
      rewardType: "REVIEW_REWARD",
      baseAmount: 100,
    });

    expect(result).toEqual({ campaignId: "campaign_real", bonusAmount: 15 });
  });
});
