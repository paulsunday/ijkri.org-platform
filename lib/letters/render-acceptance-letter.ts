import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

export type AcceptanceLetterData = {
  manuscriptDisplayId: string;
  manuscriptTitle: string;
  authorName: string;
  journalName: string;
  journalIssn?: string | null;
  publisherName?: string | null;
  decisionDate: Date;
  editorName?: string | null;
  /**
   * Defaults to the journal-wide DOI placeholder until a real DOI
   * is assigned at publication time.
   */
  doi?: string | null;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 56;
const DOI_PLACEHOLDER = "DOI********";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function drawWrappedText({
  page,
  font,
  text,
  x,
  y,
  size,
  maxWidth,
  lineHeight,
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  y: number;
  size: number;
  maxWidth: number;
  lineHeight: number;
}): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidth = font.widthOfTextAtSize(candidate, size);

    if (candidateWidth <= maxWidth || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
  });

  return y - lines.length * lineHeight;
}

/**
 * Renders a letter of acceptance as a PDF, modeled on the existing
 * invoice/receipt renderers (pdf-lib directly, no headless browser —
 * cheaper and faster on a serverless Hobby plan).
 */
export async function renderAcceptanceLetterPdf(
  data: AcceptanceLetterData,
): Promise<Uint8Array> {
  const pdfDocument = await PDFDocument.create();

  const regularFont = await pdfDocument.embedFont(
    StandardFonts.Helvetica,
  );
  const boldFont = await pdfDocument.embedFont(
    StandardFonts.HelveticaBold,
  );
  const italicFont = await pdfDocument.embedFont(
    StandardFonts.HelveticaOblique,
  );

  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 100,
    width: PAGE_WIDTH,
    height: 100,
    color: rgb(0.08, 0.12, 0.2),
  });

  page.drawText(data.journalName, {
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 48,
    size: 16,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  if (data.journalIssn) {
    page.drawText(`ISSN: ${data.journalIssn}`, {
      x: PAGE_MARGIN,
      y: PAGE_HEIGHT - 70,
      size: 10,
      font: regularFont,
      color: rgb(0.86, 0.9, 0.96),
    });
  }

  let y = PAGE_HEIGHT - 140;

  page.drawText("LETTER OF ACCEPTANCE", {
    x: PAGE_MARGIN,
    y,
    size: 14,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.2),
  });

  y -= 28;

  page.drawText(formatDate(data.decisionDate), {
    x: PAGE_MARGIN,
    y,
    size: 10,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 30;

  y = drawWrappedText({
    page,
    font: regularFont,
    text: `Dear ${data.authorName},`,
    x: PAGE_MARGIN,
    y,
    size: 11,
    maxWidth: contentWidth,
    lineHeight: 16,
  });

  y -= 18;

  const bodyParagraph1 =
    `We are pleased to inform you that your manuscript, titled ` +
    `"${data.manuscriptTitle}" (Manuscript ID: ${data.manuscriptDisplayId}), ` +
    `has been accepted for publication in ${data.journalName} following ` +
    `peer review and editorial evaluation.`;

  y = drawWrappedText({
    page,
    font: regularFont,
    text: bodyParagraph1,
    x: PAGE_MARGIN,
    y,
    size: 11,
    maxWidth: contentWidth,
    lineHeight: 16,
  });

  y -= 18;

  const bodyParagraph2 =
    `A Digital Object Identifier (DOI) will be assigned to the final ` +
    `published version of this article. Until then, please reference ` +
    `this manuscript using the placeholder ${
      data.doi?.trim() || DOI_PLACEHOLDER
    }.`;

  y = drawWrappedText({
    page,
    font: regularFont,
    text: bodyParagraph2,
    x: PAGE_MARGIN,
    y,
    size: 11,
    maxWidth: contentWidth,
    lineHeight: 16,
  });

  y -= 18;

  const bodyParagraph3 =
    `Your manuscript will now proceed through copyediting, typesetting, ` +
    `and proofreading. If an Article Processing Charge applies to this ` +
    `submission, an invoice is available from your author dashboard.`;

  y = drawWrappedText({
    page,
    font: regularFont,
    text: bodyParagraph3,
    x: PAGE_MARGIN,
    y,
    size: 11,
    maxWidth: contentWidth,
    lineHeight: 16,
  });

  y -= 18;

  y = drawWrappedText({
    page,
    font: regularFont,
    text:
      "Congratulations, and thank you for choosing to publish with us.",
    x: PAGE_MARGIN,
    y,
    size: 11,
    maxWidth: contentWidth,
    lineHeight: 16,
  });

  y -= 48;

  page.drawText("Sincerely,", {
    x: PAGE_MARGIN,
    y,
    size: 11,
    font: regularFont,
    color: rgb(0.15, 0.15, 0.15),
  });

  y -= 30;

  page.drawText(data.editorName?.trim() || "Editorial Office", {
    x: PAGE_MARGIN,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.2),
  });

  y -= 15;

  page.drawText(data.publisherName?.trim() || data.journalName, {
    x: PAGE_MARGIN,
    y,
    size: 10,
    font: italicFont,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawText(
    `Manuscript ID: ${data.manuscriptDisplayId} — Generated on ${formatDate(new Date())}`,
    {
      x: PAGE_MARGIN,
      y: PAGE_MARGIN - 20,
      size: 8,
      font: regularFont,
      color: rgb(0.55, 0.55, 0.55),
    },
  );

  pdfDocument.setTitle(
    `Letter of Acceptance - ${data.manuscriptDisplayId}`,
  );
  pdfDocument.setAuthor(data.journalName);
  pdfDocument.setSubject("Letter of acceptance");
  pdfDocument.setCreator(data.journalName);
  pdfDocument.setProducer(data.journalName);
  pdfDocument.setCreationDate(new Date());

  return pdfDocument.save();
}
