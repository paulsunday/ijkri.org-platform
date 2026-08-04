import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import type { MarketingAssetType } from "@/lib/generated/prisma";

import { uploadMarketingTemplate } from "./actions";

const ASSET_TYPES: { value: MarketingAssetType; label: string }[] = [
  { value: "WHATSAPP_FLYER", label: "WhatsApp Flyer" },
  { value: "FACEBOOK_FLYER", label: "Facebook Flyer" },
  { value: "LINKEDIN_BANNER", label: "LinkedIn Banner" },
  { value: "INSTAGRAM_SQUARE", label: "Instagram Square Post" },
  { value: "TWITTER_BANNER", label: "X (Twitter) Banner" },
  { value: "A4_POSTER", label: "Printable A4 Poster" },
  { value: "QR_POSTER", label: "QR Code Poster" },
  { value: "BUSINESS_CARD", label: "Referral Business Card" },
];

export default async function MarketingTemplatesPage() {
  await requireAnyRole(ADMIN_ROLES);

  const journal = await prisma.journal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const activeTemplates = journal
    ? await prisma.marketingTemplate.findMany({
      where: { journalId: journal.id, isActive: true },
    })
    : [];

  const templateByType = new Map(
    activeTemplates.map((template) => [template.assetType, template]),
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Marketing Templates</h1>

      <p className="mt-2 max-w-2xl text-slate-600">
        Upload a background image for each promotional asset. Reviewers&apos;
        name, referral code, and QR code are composited on top automatically
        when they download it. Uploading a new template replaces the current
        one for that asset type (the previous one is kept, marked inactive,
        for audit).
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {ASSET_TYPES.map((asset) => {
          const current = templateByType.get(asset.value);

          return (
            <div key={asset.value} className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">{asset.label}</h2>

              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.backgroundImageUrl}
                  alt={asset.label}
                  className="mt-3 h-32 w-full rounded-lg border object-cover"
                />
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  No template uploaded yet — this asset is unavailable to
                  reviewers until one is uploaded.
                </p>
              )}

              <form
                action={uploadMarketingTemplate}
                encType="multipart/form-data"
                className="mt-4 space-y-3"
              >
                <input type="hidden" name="assetType" value={asset.value} />

                <input
                  type="file"
                  name="background"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="w-full rounded-lg border p-2 text-sm"
                />

                <input
                  type="text"
                  name="defaultCaption"
                  placeholder="Default share caption (use {code} and {link})"
                  defaultValue={current?.defaultCaption ?? ""}
                  className="w-full rounded-lg border p-2 text-sm"
                />

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                >
                  {current ? "Replace Template" : "Upload Template"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
