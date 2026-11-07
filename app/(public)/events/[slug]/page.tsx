import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CurrencyChoice from "@/components/payments/CurrencyChoice";
import { getCurrentUser } from "@/lib/auth/current-user";
import { autoReconcilePaystackPayments } from "@/lib/payments/auto-reconcile";
import {
  getOfferedCheckoutCurrencies,
  PAYMENTS_UNAVAILABLE_MESSAGE,
} from "@/lib/payments/checkout-currency";
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
  searchParams: Promise<{ payment?: string; message?: string }>;
};

async function getEvent(slug: string) {
  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, currency: true, ngnExchangeRate: true },
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

  return { ...event, journal };
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
  searchParams,
}: EventPageProps) {
  const { slug } = await params;
  const { payment: paymentStatus, message: paymentMessage } =
    await searchParams;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  // Paid events confirm registration once the fee is paid; a super admin
  // can make an event free.
  const viewer = await getCurrentUser();

  const findRegistration = () =>
    viewer
      ? prisma.eventRegistration.findFirst({
          where: {
            eventId: event.id,
            OR: [{ userId: viewer.id }, { email: viewer.email.toLowerCase() }],
          },
          select: { id: true, status: true },
        })
      : Promise.resolve(null);

  let registration = await findRegistration();

  // Self-heal a paid registration that wasn't recorded.
  if (registration && registration.status !== "CONFIRMED" && viewer) {
    const { completed } = await autoReconcilePaystackPayments({
      where: { userId: viewer.id, eventRegistrationId: registration.id },
      sinceDays: 60,
      limit: 3,
    });

    if (completed.length > 0) {
      registration = await findRegistration();
    }
  }

  const isRegistered = registration?.status === "CONFIRMED";

  const canPay =
    event.fee.greaterThan(0) &&
    getOfferedCheckoutCurrencies({
      baseCurrency: event.journal.currency,
      ngnExchangeRate: event.journal.ngnExchangeRate,
    }).length > 0;

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
          {event.registrationUrl && isRegistered && !hasCompleted && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Join the event →
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

        {!hasCompleted && (
          <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6">
            {paymentMessage ? (
              <p
                role="status"
                className={`mb-4 rounded-lg p-3 text-sm ${
                  paymentStatus === "error"
                    ? "bg-red-50 text-red-800"
                    : "bg-green-50 text-green-800"
                }`}
              >
                {paymentMessage.slice(0, 300)}
              </p>
            ) : null}

            {isRegistered ? (
              <p className="font-semibold text-slate-900">
                You&apos;re registered! Check your inbox for a confirmation
                email.
                {event.registrationUrl
                  ? " Use the “Join the event” button above to attend."
                  : ""}
              </p>
            ) : !event.isPaid ? (
              <>
                <h2 className="text-lg font-bold text-slate-950">
                  Register for this event
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  This event is free.
                </p>

                {!viewer ? (
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
                    className="mt-5 inline-block rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    Log in to register →
                  </Link>
                ) : (
                  <form
                    method="post"
                    action={`/events/${event.slug}/checkout`}
                    className="mt-5"
                  >
                    <button
                      type="submit"
                      className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
                    >
                      Register for free →
                    </button>
                  </form>
                )}
              </>
            ) : !event.fee.greaterThan(0) ? (
              <p className="font-semibold text-slate-900">
                Registration opens soon.
              </p>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-950">
                  Register for this event
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Registration fee: {event.journal.currency}{" "}
                  {event.fee.toFixed(2)}. Your place is confirmed as soon
                  as payment succeeds.
                </p>

                {!viewer ? (
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
                    className="mt-5 inline-block rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    Log in to register →
                  </Link>
                ) : canPay ? (
                  <form
                    method="post"
                    action={`/events/${event.slug}/checkout`}
                    className="mt-5 max-w-xl"
                  >
                    <CurrencyChoice
                      baseAmount={event.fee}
                      baseCurrency={event.journal.currency}
                      ngnExchangeRate={event.journal.ngnExchangeRate}
                    />

                    <button
                      type="submit"
                      className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
                    >
                      Pay &amp; register →
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    {PAYMENTS_UNAVAILABLE_MESSAGE}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
