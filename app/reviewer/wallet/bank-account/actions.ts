"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveBankAccount } from "@/lib/payments/resolve-bank-account";
import { listNigerianBanks } from "@/lib/payments/list-banks";

export async function saveOrUpdatePayoutAccount(formData: FormData) {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);

  const bankCode = String(formData.get("bankCode") || "").trim();
  const accountNumber = String(formData.get("accountNumber") || "").trim();

  if (!bankCode) {
    throw new Error("Select your bank.");
  }

  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error("Enter a valid 10-digit account number.");
  }

  try {
    await enforceRateLimit("bank-resolve", reviewer.id);
  } catch {
    throw new Error("Too many attempts. Please wait a few minutes and try again.");
  }

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { id: true },
  });

  if (!ambassador) {
    throw new Error("Only approved reviewers have a payout account.");
  }

  const banks = await listNigerianBanks();
  const bank = banks.find((entry) => entry.code === bankCode);

  if (!bank) {
    throw new Error("Select a valid bank from the list.");
  }

  let resolution;

  try {
    resolution = await resolveBankAccount({ accountNumber, bankCode });
  } catch (error) {
    logger.error("Bank account resolution failed", error, {
      event: "AMBASSADOR_BANK_RESOLVE_FAILED",
      ambassadorId: ambassador.id,
    });

    throw new Error(
      "Could not verify this bank account. Double-check the details and try again.",
    );
  }

  if (!resolution.status || !resolution.data.account_name) {
    throw new Error(
      "Could not verify this bank account. Double-check the details and try again.",
    );
  }

  await prisma.ambassadorPayoutAccount.upsert({
    where: { ambassadorId: ambassador.id },
    update: {
      bankCode,
      bankName: bank.name,
      accountNumber,
      accountName: resolution.data.account_name,
      paystackRecipientCode: null,
      verifiedAt: new Date(),
    },
    create: {
      ambassadorId: ambassador.id,
      bankCode,
      bankName: bank.name,
      accountNumber,
      accountName: resolution.data.account_name,
      verifiedAt: new Date(),
    },
  });

  revalidatePath("/reviewer/wallet");
  revalidatePath("/reviewer/wallet/bank-account");
}
