import { ImageResponse } from "next/og";
import QRCode from "qrcode";

import { IMAGE_ASSET_DIMENSIONS } from "./dimensions";
import type { MarketingAssetType } from "@/lib/generated/prisma";

export type FlyerInput = {
  assetType: MarketingAssetType;
  reviewerName: string;
  referralCode: string;
  referralLink: string;
  backgroundImageUrl: string;
};

/**
 * Composites the reviewer's name, referral code, and QR code on top of
 * an admin-uploaded template background, rendered to PNG via next/og's
 * Satori-based ImageResponse (already bundled with Next.js — no new
 * dependency).
 */
export async function generateFlyerImage(input: FlyerInput): Promise<ImageResponse> {
  const dimensions = IMAGE_ASSET_DIMENSIONS[input.assetType];

  if (!dimensions) {
    throw new Error(`${input.assetType} is not an image asset type.`);
  }

  const qrDataUrl = await QRCode.toDataURL(input.referralLink, { width: 260, margin: 0 });

  return new ImageResponse(
    (
      <div
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          display: "flex",
          position: "relative",
          backgroundImage: `url(${input.backgroundImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "32px 40px",
            background: "rgba(15, 23, 42, 0.82)",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{input.reviewerName}</div>
            <div style={{ fontSize: 20, marginTop: 8, color: "#fbbf24" }}>
              Referral code: {input.referralCode}
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            width={140}
            height={140}
            style={{ borderRadius: 8, background: "#fff", padding: 8 }}
            alt="Referral QR code"
          />
        </div>
      </div>
    ),
    { width: dimensions.width, height: dimensions.height },
  );
}
