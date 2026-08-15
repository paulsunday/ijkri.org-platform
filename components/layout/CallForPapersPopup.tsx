"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

type CallForPapersPopupProps = {
  dismissKey: string;
  title: string;
  message: string;
  buttonText: string;
  buttonUrl: string;
  deadlineLabel: string | null;
};

export default function CallForPapersPopup({
  dismissKey,
  title,
  message,
  buttonText,
  buttonUrl,
  deadlineLabel,
}: CallForPapersPopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;

    try {
      dismissed =
        window.localStorage.getItem(dismissKey) === "1";
    } catch {
      dismissed = false;
    }

    if (dismissed) {
      return;
    }

    const timer = setTimeout(() => setOpen(true), 900);

    return () => clearTimeout(timer);
  }, [dismissKey]);

  useEffect(() => {
    if (!open) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function dismiss() {
    setOpen(false);

    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Ignore storage errors (e.g. private browsing).
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cfp-popup-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dismiss();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_45%)]" />

        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="relative p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Call for Papers
          </p>

          <h2
            id="cfp-popup-title"
            className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {title}
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            {message}
          </p>

          {deadlineLabel && (
            <p className="mt-4 text-sm font-semibold text-amber-400">
              Submission deadline: {deadlineLabel}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={buttonUrl}
              onClick={dismiss}
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {buttonText}
            </Link>

            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-white/25 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
