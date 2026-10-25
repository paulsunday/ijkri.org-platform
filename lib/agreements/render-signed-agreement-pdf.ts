import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

export type SignedAgreementSigner = {
  signerName: string;
  signerEmail: string;
  typedLegalName: string;
  signedAt: Date;
  ipAddress: string | null;
};

export type SignedAgreementData = {
  manuscriptDisplayId: string;
  manuscriptTitle: string;
  journalName: string;
  agreementText: string;
  signers: SignedAgreementSigner[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const BOTTOM_LIMIT = PAGE_MARGIN + 20;

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

class PagedWriter {
  document: PDFDocument;
  regularFont: PDFFont;
  boldFont: PDFFont;
  page: PDFPage;
  y: number;

  constructor(document: PDFDocument, regularFont: PDFFont, boldFont: PDFFont) {
    this.document = document;
    this.regularFont = regularFont;
    this.boldFont = boldFont;
    this.page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - PAGE_MARGIN;
  }

  private ensureSpace(linesNeeded: number, lineHeight: number) {
    if (this.y - linesNeeded * lineHeight < BOTTOM_LIMIT) {
      this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - PAGE_MARGIN;
    }
  }

  heading(text: string, size = 13) {
    this.ensureSpace(2, size + 10);
    this.page.drawText(text, {
      x: PAGE_MARGIN,
      y: this.y,
      size,
      font: this.boldFont,
      color: rgb(0.08, 0.12, 0.2),
    });
    this.y -= size + 14;
  }

  paragraph(text: string, size = 10, lineHeight = 14) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = this.regularFont.widthOfTextAtSize(candidate, size);

      if (width <= CONTENT_WIDTH || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);

    for (const line of lines) {
      this.ensureSpace(1, lineHeight);

      this.page.drawText(line, {
        x: PAGE_MARGIN,
        y: this.y,
        size,
        font: this.regularFont,
        color: rgb(0.18, 0.18, 0.18),
      });

      this.y -= lineHeight;
    }

    this.y -= 6;
  }

  signatureBlock(signer: SignedAgreementSigner) {
    this.ensureSpace(5, 14);

    this.page.drawRectangle({
      x: PAGE_MARGIN,
      y: this.y - 72,
      width: CONTENT_WIDTH,
      height: 78,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.99),
    });

    const x = PAGE_MARGIN + 12;
    let y = this.y - 16;

    this.page.drawText(`Signed by: ${signer.typedLegalName}`, {
      x,
      y,
      size: 11,
      font: this.boldFont,
      color: rgb(0.08, 0.12, 0.2),
    });

    y -= 16;

    this.page.drawText(
      `Listed as: ${signer.signerName} <${signer.signerEmail}>`,
      { x, y, size: 9, font: this.regularFont, color: rgb(0.35, 0.35, 0.35) },
    );

    y -= 15;

    this.page.drawText(
      `Signed at: ${formatDateTime(signer.signedAt)} UTC`,
      { x, y, size: 9, font: this.regularFont, color: rgb(0.35, 0.35, 0.35) },
    );

    y -= 15;

    this.page.drawText(
      `IP address: ${signer.ipAddress ?? "not recorded"}`,
      { x, y, size: 9, font: this.regularFont, color: rgb(0.35, 0.35, 0.35) },
    );

    this.y -= 90;
  }
}

/**
 * Renders the final signed publication agreement: the exact
 * agreement text the signers saw, followed by a tamper-evident
 * record of every signature. Called once, after the last required
 * signer signs; the resulting bytes are hashed (SHA-256) and stored
 * alongside the PDF so the document can be verified later.
 */
export async function renderSignedAgreementPdf(
  data: SignedAgreementData,
): Promise<Uint8Array> {
  const pdfDocument = await PDFDocument.create();

  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);

  const writer = new PagedWriter(pdfDocument, regularFont, boldFont);

  writer.heading("PUBLICATION AGREEMENT", 15);
  writer.paragraph(
    `${data.journalName} — Manuscript ${data.manuscriptDisplayId}: "${data.manuscriptTitle}"`,
    10,
  );

  writer.y -= 8;

  for (const paragraph of data.agreementText.split("\n")) {
    if (!paragraph.trim()) {
      writer.y -= 8;
      continue;
    }

    writer.paragraph(paragraph);
  }

  writer.y -= 10;
  writer.heading("SIGNATURES", 13);

  for (const signer of data.signers) {
    writer.signatureBlock(signer);
  }

  pdfDocument.setTitle(
    `Signed Publication Agreement - ${data.manuscriptDisplayId}`,
  );
  pdfDocument.setAuthor(data.journalName);
  pdfDocument.setSubject("Signed publication agreement");
  pdfDocument.setCreator(data.journalName);
  pdfDocument.setProducer(data.journalName);
  pdfDocument.setCreationDate(new Date());

  return pdfDocument.save();
}
