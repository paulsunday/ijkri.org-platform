"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { generateAmbassadorSlug } from "@/lib/ambassador/slug";

export async function updateProfileSettings(formData: FormData) {
  const reviewer = await requireAnyActionRole(REVIEWER_ROLES);

  const isPublicProfileEnabled = String(formData.get("isPublicProfileEnabled") || "") === "true";
  const contactEnabled = String(formData.get("contactEnabled") || "") === "true";

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { id: true, slug: true },
  });

  if (!ambassador) {
    throw new Error("Only approved reviewers can enable a public profile.");
  }

  const slug =
    ambassador.slug ??
    (isPublicProfileEnabled ? await generateAmbassadorSlug(reviewer.name) : null);

  await prisma.$transaction([
    prisma.reviewerAmbassador.update({
      where: { id: ambassador.id },
      data: {
        isPublicProfileEnabled,
        contactEnabled,
        slug: slug ?? undefined,
      },
    }),

    prisma.activityLog.create({
      data: {
        userId: reviewer.id,
        action: "UPDATE",
        entity: "ReviewerAmbassador",
        entityId: ambassador.id,
        metadata: {
          event: "AMBASSADOR_PROFILE_SETTINGS_UPDATED",
          isPublicProfileEnabled,
          contactEnabled,
        },
      },
    }),
  ]);

  revalidatePath("/reviewer/referrals/profile-settings");
  revalidatePath("/reviewer/referrals");

  if (slug) {
    revalidatePath(`/ambassador/${slug}`);
  }
}
