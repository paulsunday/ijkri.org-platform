"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function overrideConflict(formData: FormData) {
  const admin = await requireActionRole("SUPER_ADMIN");

  const conflictId = String(formData.get("conflictId") || "").trim();
  const overrideReason = String(formData.get("overrideReason") || "").trim();

  if (!conflictId) {
    throw new Error("Conflict record ID is missing.");
  }

  if (!overrideReason) {
    throw new Error("Enter a reason for overriding this conflict finding.");
  }

  const conflict = await prisma.conflictOfInterestCheck.findUnique({
    where: { id: conflictId },
    select: { id: true, severity: true, overriddenAt: true },
  });

  if (!conflict) {
    throw new Error("Conflict record not found.");
  }

  if (conflict.severity === "HIGH") {
    throw new Error(
      "High-severity conflicts cannot be overridden — the reviewer must not be assigned.",
    );
  }

  if (conflict.overriddenAt) {
    throw new Error("This conflict finding has already been overridden.");
  }

  await prisma.$transaction([
    prisma.conflictOfInterestCheck.update({
      where: { id: conflictId },
      data: {
        overriddenById: admin.id,
        overriddenAt: new Date(),
        overrideReason,
      },
    }),

    prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entity: "ConflictOfInterestCheck",
        entityId: conflictId,
        metadata: {
          event: "COI_FINDING_OVERRIDDEN",
          overrideReason,
        },
      },
    }),
  ]);

  revalidatePath("/admin/coi-audit");
}
