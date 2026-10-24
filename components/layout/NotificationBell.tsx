"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 45_000;

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  unreadCount: number;
  notifications: NotificationItem[];
};

async function fetchNotifications(): Promise<NotificationsResponse | null> {
  try {
    const response = await fetch("/api/notifications", {
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = await response.json();

    return {
      unreadCount: data.unreadCount ?? 0,
      notifications: data.notifications ?? [],
    };
  } catch {
    // Silently ignore transient network errors; the next poll will retry.
    return null;
  }
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      const result = await fetchNotifications();

      if (active && result) {
        setUnreadCount(result.unreadCount);
        setNotifications(result.notifications);
        setLoaded(true);
      }
    }

    poll();

    const interval = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);

    if (next) {
      const result = await fetchNotifications();

      if (result) {
        setUnreadCount(result.unreadCount);
        setNotifications(result.notifications);
        setLoaded(true);
      }
    }
  }

  async function handleMarkRead(id: string) {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // The next poll reconciles state if this request failed.
    }
  }

  async function handleMarkAllRead() {
    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, isRead: true })),
    );
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      // The next poll reconciles state if this request failed.
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative rounded-lg border border-slate-300 p-2.5 text-slate-800 transition hover:border-slate-950 hover:bg-slate-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-xl border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b p-4">
            <p className="font-semibold">Notifications</p>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <p className="p-6 text-center text-sm text-gray-500">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={notification.isRead ? "" : "bg-blue-50/60"}
                  >
                    <Link
                      href={notification.link || "/notifications"}
                      onClick={() => {
                        setOpen(false);
                        if (!notification.isRead) {
                          handleMarkRead(notification.id);
                        }
                      }}
                      className="block p-4 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-2">
                        {!notification.isRead && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                            aria-hidden="true"
                          />
                        )}

                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">
                            {notification.title}
                          </p>

                          <p className="mt-0.5 line-clamp-2 break-words text-xs text-gray-600">
                            {notification.message}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t p-3 text-center text-sm font-semibold text-blue-700 hover:bg-slate-50"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
