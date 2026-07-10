"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitManuscript(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const abstract = String(formData.get("abstract") || "").trim();
  const manuscriptType = String(formData.get("manuscriptType") || "").trim();

  if (!title) throw new Error("Please enter the manuscript title.");
  if (!abstract) throw new Error("Please enter the abstract.");
  if (!manuscriptType) throw new Error("Please select the manuscript type.");

  let journal = await prisma.journal.findFirst({
    where: { slug: "ijari" },
  });

  if (!journal) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "innovare-academic-publishing" },
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

  const author = await prisma.user.upsert({
    where: { email: "demo-author@ijari.org" },
    update: {},
    create: {
      name: "Demo Author",
      email: "demo-author@ijari.org",
      passwordHash: null,
    },
  });

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