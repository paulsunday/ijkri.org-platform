"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import type { StaticPageKey } from "@/lib/generated/prisma";

import { STATIC_PAGE_DEFS } from "./page-defs";

function assertValidKey(key: string): asserts key is StaticPageKey {
  if (!STATIC_PAGE_DEFS.some((def) => def.key === key)) {
    throw new Error("Unknown page.");
  }
}

export async function saveStaticPage(formData: FormData) {
  const admin = await requireActionRole("SUPER_ADMIN");

  const key = String(formData.get("key") || "").trim();
  assertValidKey(key);

  const title = String(formData.get("title") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!title) {
    throw new Error("A page title is required.");
  }

  if (!body) {
    throw new Error("Page body text is required.");
  }

  const journal = await prisma.journal.findFirst({
    where: { slug: "IJKRI" },
    select: { id: true },
  });

  if (!journal) {
    throw new Error("The journal configuration could not be found.");
  }

  await prisma.staticPage.upsert({
    where: {
      journalId_key: {
        journalId: journal.id,
        key,
      },
    },
    update: {
      title,
      tagline: tagline || null,
      body,
      updatedById: admin.id,
    },
    create: {
      journalId: journal.id,
      key,
      title,
      tagline: tagline || null,
      body,
      updatedById: admin.id,
    },
  });

  const def = STATIC_PAGE_DEFS.find((item) => item.key === key)!;
  revalidatePath(def.path);
  revalidatePath("/admin/static-pages");

  redirect("/admin/static-pages");
}

export async function resetStaticPage(formData: FormData) {
  await requireActionRole("SUPER_ADMIN");

  const key = String(formData.get("key") || "").trim();
  assertValidKey(key);

  const journal = await prisma.journal.findFirst({
    where: { slug: "IJKRI" },
    select: { id: true },
  });

  if (!journal) {
    throw new Error("The journal configuration could not be found.");
  }

  await prisma.staticPage.deleteMany({
    where: {
      journalId: journal.id,
      key,
    },
  });

  const def = STATIC_PAGE_DEFS.find((item) => item.key === key)!;
  revalidatePath(def.path);
  revalidatePath("/admin/static-pages");

  redirect("/admin/static-pages");
}
