import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import { markAllNotificationsRead, markNotificationRead } from "./actions";

const NOTIFICATIONS_LIMIT = 100;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function NotificationsPage() {
  const user = await requireCurrentUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATIONS_LIMIT,
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Notifications</h1>

          <p className="mt-3 text-gray-600">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You're all caught up."}
          </p>
        </div>

        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-950 hover:bg-slate-50"
            >
              Mark all as read
            </button>
          </form>
        )}
      </header>

      <section className="rounded-xl border bg-white shadow-sm">
        {notifications.length === 0 ? (
          <p className="p-8 text-center text-gray-600">
            No notifications yet.
          </p>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`flex flex-wrap items-start justify-between gap-4 p-5 ${
                  notification.isRead ? "" : "bg-blue-50/60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
                        aria-hidden="true"
                      />
                    )}

                    <p className="break-words font-semibold">
                      {notification.title}
                    </p>
                  </div>

                  <p className="mt-1 break-words text-sm text-gray-600">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    {formatDate(notification.createdAt)}
                  </p>

                  {notification.link && (
                    <Link
                      href={notification.link}
                      className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>

                {!notification.isRead && (
                  <form action={markNotificationRead}>
                    <input
                      type="hidden"
                      name="notificationId"
                      value={notification.id}
                    />

                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-950 hover:bg-slate-50"
                    >
                      Mark as read
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
