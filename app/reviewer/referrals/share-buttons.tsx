"use client";

import { useState } from "react";

export function ShareButtons({ referralLink }: { referralLink: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  }

  const encodedLink = encodeURIComponent(referralLink);
  const shareText = encodeURIComponent(
    "Submit your manuscript to IJKRI using my referral link:",
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>

      {copyFailed && (
        <span className="text-sm text-red-600">
          Could not copy automatically — copy the link manually.
        </span>
      )}

      <a
        href={`https://wa.me/?text=${shareText}%20${encodedLink}`}
        target="_blank"
        rel="noreferrer noopener"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        WhatsApp
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`}
        target="_blank"
        rel="noreferrer noopener"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Facebook
      </a>

      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`}
        target="_blank"
        rel="noreferrer noopener"
        className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
      >
        LinkedIn
      </a>

      <a
        href={`mailto:?subject=${shareText}&body=${encodedLink}`}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
      >
        Email
      </a>
    </div>
  );
}
