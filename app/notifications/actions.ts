"use server";

import { revalidatePath } from "next/cache";

import { requireActionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(formData: FormData) {
  const user = await requireActionUser();

  const notificationId = String(formData.get("notificationId") || "").trim();

  if (!notificationId) {
    throw new Error("Notification ID is missing.");
  }

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireActionUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}
