import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export type CertificateData = {
  certificateNumber: string;
  title: string;
  recipientName: string;
  journalName: string;
  issuedAt: Date;
  verificationUrl: string;
};

const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;

function drawCentredText({
  page,
  font,
  text,
  y,
  size,
  color = rgb(0.08, 0.08, 0.08),
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  y: number;
  size: number;
  color?: ReturnType<typeof rgb>;
}) {
  const textWidth = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
  }).format(value);
}

/**
 * Renders an ambassador certificate as a landscape A4 PDF, mirroring the
 * hand-drawn pdf-lib layout used by lib/payments/generate-receipt.ts.
 * Generated on-demand at download time rather than pre-rendered and
 * stored — always reflects the current certificate data.
 */
export async function generateAmbassadorCertificate(
  data: CertificateData,
): Promise<Uint8Array> {
  const pdfDocument = await PDFDocument.create();

  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDocument.embedFont(StandardFonts.HelveticaOblique);

  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: 16,
    y: 16,
    width: PAGE_WIDTH - 32,
    height: PAGE_HEIGHT - 32,
    borderColor: rgb(0.08, 0.12, 0.2),
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 28,
    y: 28,
    width: PAGE_WIDTH - 56,
    height: PAGE_HEIGHT - 56,
    borderColor: rgb(0.83, 0.63, 0.13),
    borderWidth: 1,
  });

  drawCentredText({
    page,
    font: boldFont,
    text: data.journalName,
    y: PAGE_HEIGHT - 110,
    size: 16,
    color: rgb(0.08, 0.12, 0.2),
  });

  drawCentredText({
    page,
    font: boldFont,
    text: "CERTIFICATE OF ACHIEVEMENT",
    y: PAGE_HEIGHT - 150,
    size: 13,
    color: rgb(0.83, 0.63, 0.13),
  });

  drawCentredText({
    page,
    font: boldFont,
    text: data.title,
    y: PAGE_HEIGHT - 210,
    size: 30,
    color: rgb(0.08, 0.08, 0.08),
  });

  drawCentredText({
    page,
    font: regularFont,
    text: "This certificate is proudly presented to",
    y: PAGE_HEIGHT - 260,
    size: 12,
    color: rgb(0.38, 0.38, 0.38),
  });

  drawCentredText({
    page,
    font: boldFont,
    text: data.recipientName,
    y: PAGE_HEIGHT - 305,
    size: 26,
    color: rgb(0.08, 0.12, 0.2),
  });

  drawCentredText({
    page,
    font: italicFont,
    text: "In recognition of outstanding contribution as a reviewer ambassador",
    y: PAGE_HEIGHT - 345,
    size: 12,
    color: rgb(0.38, 0.38, 0.38),
  });

  drawCentredText({
    page,
    font: regularFont,
    text: `Issued on ${formatDate(data.issuedAt)}`,
    y: 110,
    size: 10,
    color: rgb(0.38, 0.38, 0.38),
  });

  drawCentredText({
    page,
    font: regularFont,
    text: `Certificate No. ${data.certificateNumber}`,
    y: 92,
    size: 10,
    color: rgb(0.38, 0.38, 0.38),
  });

  const qrPngDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    width: 300,
    margin: 0,
  });

  const qrPngBytes = Buffer.from(qrPngDataUrl.split(",")[1] ?? "", "base64");
  const qrImage = await pdfDocument.embedPng(qrPngBytes);
  const qrSize = 80;

  page.drawImage(qrImage, {
    x: PAGE_WIDTH - 70 - qrSize,
    y: 60,
    width: qrSize,
    height: qrSize,
  });

  page.drawText("Scan to verify", {
    x: PAGE_WIDTH - 70 - qrSize,
    y: 50,
    size: 8,
    font: regularFont,
    color: rgb(0.38, 0.38, 0.38),
  });

  pdfDocument.setTitle(`${data.title} — ${data.recipientName}`);
  pdfDocument.setAuthor(data.journalName);
  pdfDocument.setSubject("Ambassador certificate");
  pdfDocument.setCreator(data.journalName);
  pdfDocument.setProducer(data.journalName);
  pdfDocument.setCreationDate(new Date());

  return pdfDocument.save();
}
