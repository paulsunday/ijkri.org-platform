import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";

const TYPE_LABELS: Record<string, string> = {
  SEMINAR: "Seminar",
  WEBINAR: "Webinar",
  WORKSHOP: "Workshop",
  CONFERENCE: "Conference",
  EDITORIAL_SESSION: "Editorial Session",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export const metadata: Metadata = {
  title: "Academic Events",
  description:
    "Seminars, webinars, workshops, and editorial sessions hosted or promoted by IJKRI.",
  alternates: {
    canonical: "/events",
  },
};

const PAST_EVENTS_LIMIT = 12;

export default async function EventsPage() {
  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const now = new Date();

  const [upcomingEvents, pastEvents] = journal
    ? await Promise.all([
        prisma.event.findMany({
          where: {
            journalId: journal.id,
            isPublished: true,
            OR: [
              { startsAt: { gte: now } },
              { status: { in: ["UPCOMING", "ONGOING"] } },
            ],
          },
          orderBy: { startsAt: "asc" },
        }),
        prisma.event.findMany({
          where: {
            journalId: journal.id,
            isPublished: true,
            startsAt: { lt: now },
            status: { in: ["COMPLETED", "CANCELLED"] },
          },
          orderBy: { startsAt: "desc" },
          take: PAST_EVENTS_LIMIT,
        }),
      ])
    : [[], []];

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Academic Events
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Seminars, webinars, and workshops
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Research seminars, editorial webinars, and methodology
            workshops hosted or promoted by IJKRI.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <h2 className="text-2xl font-bold text-slate-950">
          Upcoming &amp; Ongoing
        </h2>

        {upcomingEvents.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-slate-600">
              No upcoming events are scheduled right now. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {pastEvents.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-950">
              Past Events
            </h2>

            <div className="mt-6 space-y-5">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} isPast />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function EventCard({
  event,
  isPast = false,
}: {
  event: {
    slug: string;
    title: string;
    eventType: string;
    startsAt: Date;
    speakerName: string | null;
    speakerTitle: string | null;
    description: string;
  };
  isPast?: boolean;
}) {
  return (
    <article
      className={
        isPast
          ? "rounded-2xl border border-slate-200 bg-white p-6 opacity-80 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
              {TYPE_LABELS[event.eventType] || event.eventType}
            </span>

            <span className="text-sm font-semibold text-slate-600">
              {formatDateTime(event.startsAt)}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-bold text-slate-950">
            {event.title}
          </h3>

          {event.speakerName && (
            <p className="mt-1 text-sm text-slate-600">
              {event.speakerName}
              {event.speakerTitle ? `, ${event.speakerTitle}` : ""}
            </p>
          )}

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            {event.description.length > 200
              ? `${event.description.slice(0, 200)}…`
              : event.description}
          </p>
        </div>
      </div>

      <Link
        href={`/events/${event.slug}`}
        className="mt-4 inline-flex font-semibold text-amber-700 hover:text-amber-900"
      >
        View details →
      </Link>
    </article>
  );
}
