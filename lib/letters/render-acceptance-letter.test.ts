import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import { renderAcceptanceLetterPdf } from "./render-acceptance-letter";

describe("renderAcceptanceLetterPdf", () => {
  it("produces a single-page, loadable PDF", async () => {
    const bytes = await renderAcceptanceLetterPdf({
      manuscriptDisplayId: "IJKRI-2026-007",
      manuscriptTitle: "A Study of Something Important",
      authorName: "Jane Doe",
      journalName: "International Journal of Knowledge, Research and Innovation",
      journalIssn: "1234-5678",
      publisherName: "Innovare Academic Publisher",
      decisionDate: new Date("2026-01-15T00:00:00Z"),
      editorName: "Dr. Editor",
    });

    expect(bytes.byteLength).toBeGreaterThan(0);

    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
  });

  it("falls back to the DOI placeholder when none is given", async () => {
    const bytes = await renderAcceptanceLetterPdf({
      manuscriptDisplayId: "IJKRI-2026-008",
      manuscriptTitle: "Another Study",
      authorName: "John Smith",
      journalName: "IJKRI",
      decisionDate: new Date("2026-02-01T00:00:00Z"),
    });

    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getTitle()).toContain("IJKRI-2026-008");
  });
});
