import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

const TYPE_LABELS: Record<string, string> = {
  SEMINAR: "Seminar",
  WEBINAR: "Webinar",
  WORKSHOP: "Workshop",
  CONFERENCE: "Conference",
  EDITORIAL_SESSION: "Editorial Session",
};

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

async function getEvent(slug: string) {
  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!journal) {
    return null;
  }

  const event = await prisma.event.findUnique({
    where: {
      journalId_slug: {
        journalId: journal.id,
        slug,
      },
    },
  });

  if (!event || !event.isPublished) {
    return null;
  }

  return event;
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return { title: "Event Not Found" };
  }

  return {
    title: event.title,
    description: event.description.slice(0, 160),
    alternates: {
      canonical: `/events/${event.slug}`,
    },
  };
}

export default async function EventDetailPage({
  params,
}: EventPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  const hasCompleted =
    event.status === "COMPLETED" ||
    event.status === "CANCELLED" ||
    (event.endsAt ? event.endsAt < new Date() : event.startsAt < new Date());

  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
          <Link
            href="/events"
            className="text-sm font-semibold text-amber-400 hover:text-amber-300"
          >
            ← Back to Events
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
              {TYPE_LABELS[event.eventType] || event.eventType}
            </span>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-200">
              {STATUS_LABELS[event.status] || event.status}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {event.title}
          </h1>

          <p className="mt-4 text-lg font-semibold text-slate-200">
            {formatDateTime(event.startsAt)}
            {event.endsAt &&
              ` — ${formatDateTime(event.endsAt)}`}
          </p>

          {event.speakerName && (
            <p className="mt-2 text-slate-300">
              {event.speakerName}
              {event.speakerTitle ? `, ${event.speakerTitle}` : ""}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <div className="whitespace-pre-wrap leading-8 text-slate-700">
          {event.description}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          {event.registrationUrl && !hasCompleted && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Register →
            </a>
          )}

          {event.recordingUrl && (
            <a
              href={event.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:border-slate-950"
            >
              Watch recording →
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
