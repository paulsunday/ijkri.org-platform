"use client";

import { useState } from "react";
import type { MarketingAssetType } from "@/lib/generated/prisma";

export function MarketingAssetCard({
  assetType,
  label,
  available,
  isPdf,
  isImage,
  referralLink,
  defaultCaption,
}: {
  assetType: MarketingAssetType;
  label: string;
  available: boolean;
  isPdf: boolean;
  isImage: boolean;
  referralLink: string;
  defaultCaption: string | null;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const imageUrl = `/reviewer/marketing/${assetType}/image`;
  const pdfUrl = `/reviewer/marketing/${assetType}/pdf`;
  const downloadUrl = isPdf ? pdfUrl : imageUrl;

  const caption = (defaultCaption ?? "Submit your manuscript through my referral link:")
    .replaceAll("{link}", referralLink);

  async function handleCopyCaption() {
    try {
      await navigator.clipboard.writeText(`${caption} ${referralLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the caption is still visible to copy manually.
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: label, text: caption, url: referralLink });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
    }
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">{label}</h2>

      {!available ? (
        <p className="mt-3 text-sm text-slate-500">
          Not available yet — the administrator hasn&apos;t uploaded a template
          for this asset.
        </p>
      ) : (
        <>
          {showPreview && isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`${label} preview`}
              className="mt-3 w-full rounded-lg border object-cover"
            />
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {isImage && (
              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                {showPreview ? "Hide Preview" : "Preview"}
              </button>
            )}

            <a
              href={downloadUrl}
              download
              className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
            >
              Download
            </a>

            {typeof navigator !== "undefined" && (
              <button
                type="button"
                onClick={handleShare}
                className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                Share
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyCaption}
              className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              {copied ? "Copied!" : "Copy Caption"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
