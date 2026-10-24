import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ unreadCount: 0 });
}
