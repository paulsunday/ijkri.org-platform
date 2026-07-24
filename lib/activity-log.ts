import "server-only";

import type { ActivityType, Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

interface LogActivityOptions {
  userId?: string;

  action: ActivityType;

  entity?: string;

  entityId?: string;

  description?: string;

  metadata?: Prisma.InputJsonObject;
}

export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  description,
  metadata,
}: LogActivityOptions): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata: {
        ...(metadata ?? {}),
        ...(description ? { description } : {}),
      },
    },
  });
}
