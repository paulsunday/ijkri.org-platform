import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireActionRoleMock,
  journalFindFirst,
  campaignFindUnique,
  campaignCreate,
  campaignDelete,
  campaignUpdate,
  transactionMock,
  activityLogCreate,
} = vi.hoisted(() => ({
  requireActionRoleMock: vi.fn(),
  journalFindFirst: vi.fn(),
  campaignFindUnique: vi.fn(),
  campaignCreate: vi.fn(),
  campaignDelete: vi.fn(),
  campaignUpdate: vi.fn(),
  transactionMock: vi.fn(),
  activityLogCreate: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireActionRole: requireActionRoleMock,
}));

vi.mock("@/lib/storage/blob", () => ({
  uploadJournalFile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    journal: { findFirst: journalFindFirst },
    referralCampaign: {
      findUnique: campaignFindUnique,
      create: campaignCreate,
      delete: campaignDelete,
      update: campaignUpdate,
    },
    activityLog: { create: activityLogCreate },
    $transaction: transactionMock,
  },
}));

const { createCampaign, deleteCampaign } = await import("./actions");

beforeEach(() => {
  vi.clearAllMocks();
  journalFindFirst.mockResolvedValue({ id: "journal_1", tenantId: "tenant_1" });
});

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("referral campaign permission enforcement", () => {
  it("createCampaign rejects a non-Super-Admin caller before touching the database", async () => {
    requireActionRoleMock.mockRejectedValue(new Error("Forbidden"));

    await expect(
      createCampaign(
        formData({
          name: "Test Campaign",
          startDate: "2026-01-01",
          endDate: "2026-02-01",
        }),
      ),
    ).rejects.toThrow("Forbidden");

    expect(campaignCreate).not.toHaveBeenCalled();
  });

  it("createCampaign succeeds for a Super Admin and redirects to the new campaign", async () => {
    requireActionRoleMock.mockResolvedValue({ id: "admin_1" });

    transactionMock.mockImplementation(async (callback) =>
      callback({
        referralCampaign: { create: campaignCreate.mockResolvedValue({ id: "campaign_1" }) },
        activityLog: { create: activityLogCreate },
      }),
    );

    await expect(
      createCampaign(
        formData({
          name: "Test Campaign",
          startDate: "2026-01-01",
          endDate: "2026-02-01",
        }),
      ),
    ).rejects.toThrow("REDIRECT"); // our mocked redirect() throws to halt execution

    expect(campaignCreate).toHaveBeenCalled();
  });

  it("deleteCampaign rejects a campaign that is not in DRAFT status", async () => {
    requireActionRoleMock.mockResolvedValue({ id: "admin_1" });
    campaignFindUnique.mockResolvedValue({ status: "ACTIVE", name: "Live Campaign" });

    await expect(deleteCampaign(formData({ campaignId: "campaign_1" }))).rejects.toThrow(
      /only a draft campaign/i,
    );

    expect(campaignDelete).not.toHaveBeenCalled();
  });

  it("deleteCampaign succeeds for a DRAFT campaign", async () => {
    requireActionRoleMock.mockResolvedValue({ id: "admin_1" });
    campaignFindUnique.mockResolvedValue({ status: "DRAFT", name: "Draft Campaign" });
    transactionMock.mockResolvedValue(undefined);

    await expect(
      deleteCampaign(formData({ campaignId: "campaign_1" })),
    ).resolves.toBeUndefined();

    expect(transactionMock).toHaveBeenCalled();
  });
});
