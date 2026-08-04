import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";
import { IMAGE_ASSET_DIMENSIONS, PDF_ASSET_TYPES } from "@/lib/marketing/dimensions";
import type { MarketingAssetType } from "@/lib/generated/prisma";

import { MarketingAssetCard } from "./marketing-asset-card";

const ASSET_LABELS: Record<MarketingAssetType, string> = {
  WHATSAPP_FLYER: "WhatsApp Flyer",
  FACEBOOK_FLYER: "Facebook Flyer",
  LINKEDIN_BANNER: "LinkedIn Banner",
  INSTAGRAM_SQUARE: "Instagram Square Post",
  TWITTER_BANNER: "X (Twitter) Banner",
  A4_POSTER: "Printable A4 Poster",
  QR_POSTER: "QR Code Poster",
  BUSINESS_CARD: "Referral Business Card",
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export default async function MarketingResourcesPage() {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { referralCode: true, journalId: true },
  });

  const templates = ambassador
    ? await prisma.marketingTemplate.findMany({
      where: { journalId: ambassador.journalId, isActive: true },
      select: { assetType: true, defaultCaption: true },
    })
    : [];

  const activeTemplateTypes = new Set(templates.map((template) => template.assetType));
  const captionByType = new Map(templates.map((t) => [t.assetType, t.defaultCaption]));

  const referralLink = ambassador
    ? `${getAppUrl()}/author/submit?ref=${ambassador.referralCode}`
    : "";

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">Marketing Resources</h1>
              <p className="mt-2 text-slate-600">
                Download promotional materials with your referral code already
                built in.
              </p>
            </div>

            {ambassador && (
              <a
                href="/reviewer/marketing/qr-code"
                download
                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Generate QR Code
              </a>
            )}
          </div>

          {!ambassador ? (
            <div className="rounded-xl border bg-white p-8 shadow-sm text-slate-600">
              Your ambassador profile has not been set up yet.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {(Object.keys(ASSET_LABELS) as MarketingAssetType[]).map((assetType) => (
                <MarketingAssetCard
                  key={assetType}
                  assetType={assetType}
                  label={ASSET_LABELS[assetType]}
                  available={activeTemplateTypes.has(assetType)}
                  isPdf={PDF_ASSET_TYPES.includes(assetType)}
                  isImage={assetType in IMAGE_ASSET_DIMENSIONS}
                  referralLink={referralLink}
                  defaultCaption={captionByType.get(assetType) ?? null}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
