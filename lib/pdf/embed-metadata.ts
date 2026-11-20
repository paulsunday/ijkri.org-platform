import { PDFDocument } from "pdf-lib";

export type ArticlePdfMetadata = {
    title: string;
    authors: string[];
    doi?: string | null;
    journalName: string;
    keywords?: string[];
    issnOnline?: string | null;
    issnPrint?: string | null;
};

/**
 * Embeds article citation metadata into an already-produced PDF's
 * document info dictionary (Title/Author/Subject/Keywords/Producer),
 * without touching its visual content.
 */
export async function embedArticleMetadata(
    pdfBytes: Uint8Array | ArrayBuffer,
    metadata: ArticlePdfMetadata,
): Promise<Uint8Array> {
    const pdfDocument = await PDFDocument.load(pdfBytes, {
        updateMetadata: false,
    });

    pdfDocument.setTitle(metadata.title);

    if (metadata.authors.length > 0) {
        pdfDocument.setAuthor(metadata.authors.join("; "));
    }

    // e.g. "International Journal of ... · e-ISSN 2846-7752 · Print ISSN 2846-7760 · DOI: 10.x/y"
    pdfDocument.setSubject(
        [
            metadata.journalName,
            metadata.issnOnline && `e-ISSN ${metadata.issnOnline}`,
            metadata.issnPrint && `Print ISSN ${metadata.issnPrint}`,
            metadata.doi && `DOI: ${metadata.doi}`,
        ]
            .filter(Boolean)
            .join(" · "),
    );

    if (metadata.keywords && metadata.keywords.length > 0) {
        pdfDocument.setKeywords(metadata.keywords);
    }

    pdfDocument.setCreator(metadata.journalName);
    pdfDocument.setProducer(metadata.journalName);

    return pdfDocument.save();
}
