import type { MarketingAssetType } from "@/lib/generated/prisma";

export const IMAGE_ASSET_DIMENSIONS: Partial<
  Record<MarketingAssetType, { width: number; height: number }>
> = {
  WHATSAPP_FLYER: { width: 1080, height: 1080 },
  FACEBOOK_FLYER: { width: 1200, height: 630 },
  LINKEDIN_BANNER: { width: 1584, height: 396 },
  INSTAGRAM_SQUARE: { width: 1080, height: 1080 },
  TWITTER_BANNER: { width: 1500, height: 500 },
  QR_POSTER: { width: 1080, height: 1350 },
};

/** Asset types rendered as a downloadable PDF instead of a PNG image. */
export const PDF_ASSET_TYPES: MarketingAssetType[] = ["A4_POSTER", "BUSINESS_CARD"];
