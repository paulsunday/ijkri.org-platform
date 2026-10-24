import type { Prisma, NotificationType } from "@/lib/generated/prisma";

type NotifyStaffActionNeededParams = {
  journalId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  /**
   * User IDs to notify in addition to the staff audience below (e.g. the
   * specific editor tied to the submission), deduplicated against it.
   */
  additionalUserIds?: Array<string | null | undefined>;
};

/**
 * Notifies every SUPER_ADMIN on the journal plus any account a SUPER_ADMIN
 * has opted in via `User.receivesActionAlerts`, so submissions requiring
 * action are never silently missed because the one assigned editor didn't
 * happen to check their dashboard.
 */
export async function notifyStaffActionNeeded(
  tx: Prisma.TransactionClient,
  {
    journalId,
    type,
    title,
    message,
    link,
    additionalUserIds = [],
  }: NotifyStaffActionNeededParams,
): Promise<void> {
  const staff = await tx.user.findMany({
    where: {
      isActive: true,
      OR: [
        { receivesActionAlerts: true },
        {
          roles: {
            some: {
              role: "SUPER_ADMIN",
              journalId,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  const recipientIds = new Set(staff.map((user) => user.id));

  for (const userId of additionalUserIds) {
    if (userId) {
      recipientIds.add(userId);
    }
  }

  if (recipientIds.size === 0) {
    return;
  }

  await tx.notification.createMany({
    data: Array.from(recipientIds).map((userId) => ({
      userId,
      type,
      title,
      message,
      link,
    })),
  });
}
