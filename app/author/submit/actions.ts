"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

export async function submitManuscript(formData: FormData) {
  const author = await requireAnyActionRole(AUTHOR_ROLES);

  const title = String(formData.get("title") || "").trim();
  const abstract = String(formData.get("abstract") || "").trim();
  const manuscriptType = String(
    formData.get("manuscriptType") || "",
  ).trim();

  if (!title) {
    throw new Error("Please enter the manuscript title.");
  }

  if (!abstract) {
    throw new Error("Please enter the abstract.");
  }

  if (!manuscriptType) {
    throw new Error("Please select the manuscript type.");
  }

  let journal = await prisma.journal.findUnique({
    where: {
      slug: "ijari",
    },
  });

  if (!journal) {
    const tenant = await prisma.tenant.upsert({
      where: {
        slug: "innovare-academic-publishing",
      },
      update: {},
      create: {
        name: "Innovare Academic Publishing",
        slug: "innovare-academic-publishing",
        isActive: true,
      },
    });

    journal = await prisma.journal.create({
      data: {
        tenantId: tenant.id,
        name: "International Journal of Advanced Research and Innovation",
        shortName: "IJARI",
        slug: "ijari",
        contactEmail: "editor@ijari.org",
        description:
          "A peer-reviewed academic journal for advanced research and innovation.",
        isActive: true,
      },
    });
  }

  await prisma.submission.create({
    data: {
      journalId: journal.id,
      authorId: author.id,
      title,
      abstract,
      manuscriptType,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/author/submit");
}