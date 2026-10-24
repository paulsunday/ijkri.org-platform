import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const RECENT_LIMIT = 10;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),

    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ unreadCount, notifications });
}
