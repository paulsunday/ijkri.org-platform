import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import type { MarketingAssetType } from "@/lib/generated/prisma";

export type PosterInput = {
  assetType: Extract<MarketingAssetType, "A4_POSTER" | "BUSINESS_CARD">;
  reviewerName: string;
  referralCode: string;
  referralLink: string;
  backgroundImageUrl: string;
};

const SIZES: Record<PosterInput["assetType"], { width: number; height: number }> = {
  A4_POSTER: { width: 595.28, height: 841.89 },
  BUSINESS_CARD: { width: 252, height: 144 }, // 3.5in x 2in at 72dpi
};

/**
 * Renders the printable A4 poster / referral business card as a PDF,
 * embedding the admin-uploaded template as a background image — same
 * structural pattern as lib/ambassador/generate-certificate.ts.
 */
export async function generatePosterPdf(input: PosterInput): Promise<Uint8Array> {
  const size = SIZES[input.assetType];

  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([size.width, size.height]);

  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);

  const backgroundResponse = await fetch(input.backgroundImageUrl);
  const backgroundBytes = new Uint8Array(await backgroundResponse.arrayBuffer());

  const contentType = backgroundResponse.headers.get("content-type") ?? "";
  const backgroundImage = contentType.includes("png")
    ? await pdfDocument.embedPng(backgroundBytes)
    : await pdfDocument.embedJpg(backgroundBytes);

  page.drawImage(backgroundImage, { x: 0, y: 0, width: size.width, height: size.height });

  const isBusinessCard = input.assetType === "BUSINESS_CARD";
  const bandHeight = isBusinessCard ? 44 : 110;

  page.drawRectangle({
    x: 0,
    y: 0,
    width: size.width,
    height: bandHeight,
    color: rgb(0.06, 0.09, 0.16),
    opacity: 0.85,
  });

  const nameSize = isBusinessCard ? 10 : 20;
  const codeSize = isBusinessCard ? 7 : 14;

  page.drawText(input.reviewerName, {
    x: 16,
    y: bandHeight - nameSize - 10,
    size: nameSize,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Referral code: ${input.referralCode}`, {
    x: 16,
    y: 12,
    size: codeSize,
    font: regularFont,
    color: rgb(0.98, 0.75, 0.14),
  });

  const qrDataUrl = await QRCode.toDataURL(input.referralLink, { margin: 0 });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");
  const qrImage = await pdfDocument.embedPng(qrBytes);
  const qrSize = isBusinessCard ? 34 : 84;

  page.drawImage(qrImage, {
    x: size.width - qrSize - 16,
    y: (bandHeight - qrSize) / 2,
    width: qrSize,
    height: qrSize,
  });

  pdfDocument.setTitle(`${input.assetType} — ${input.reviewerName}`);
  pdfDocument.setCreationDate(new Date());

  return pdfDocument.save();
}
