import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/lib/generated/prisma";

import { generateManuscriptDisplayId } from "./generate-display-id";

function makeTx(lastNumber: number) {
  return {
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([{ lastNumber }]),
  } as unknown as Prisma.TransactionClient;
}

describe("generateManuscriptDisplayId", () => {
  it("formats the display ID as SLUG-YYYY-NNN with zero-padding", async () => {
    const tx = makeTx(7);
    const currentYear = new Date().getUTCFullYear();

    const displayId = await generateManuscriptDisplayId(
      tx,
      "IJKRI",
      "journal_1",
    );

    expect(displayId).toBe(`IJKRI-${currentYear}-007`);
  });

  it("does not pad beyond 3 digits once past 999", async () => {
    const tx = makeTx(1042);

    const displayId = await generateManuscriptDisplayId(
      tx,
      "IJKRI",
      "journal_1",
    );

    expect(displayId).toContain("-1042");
  });

  it("attempts to seed the sequence row before incrementing it", async () => {
    const tx = makeTx(1);

    await generateManuscriptDisplayId(tx, "IJKRI", "journal_1");

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("throws if the sequence update returns no row", async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([]),
    } as unknown as Prisma.TransactionClient;

    await expect(
      generateManuscriptDisplayId(tx, "IJKRI", "journal_1"),
    ).rejects.toThrow(
      "Could not allocate the next manuscript sequence number.",
    );
  });
});
