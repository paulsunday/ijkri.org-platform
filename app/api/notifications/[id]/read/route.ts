import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { message: "Notification ID is missing." },
      { status: 400 },
    );
  }

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return NextResponse.json({ unreadCount });
}
