import "server-only";

import {
    ArticleTemplate,
    type ArticleTemplateMetadata,
} from "@/components/article-template/ArticleTemplate";
import type { FormattedArticleContent } from "@/lib/ai/format-article";
import { renderHtmlToPdf } from "@/lib/pdf/html-to-pdf";

export type RenderArticlePdfInput = {
    content: FormattedArticleContent;
    metadata: ArticleTemplateMetadata;
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildHeaderTemplate(
    metadata: ArticleTemplateMetadata,
): string {
    return `
    <div style="width:100%; font-family: Calibri, Arial, sans-serif; font-size: 7.5pt; color: #555; padding: 0 0.6in; display:flex; justify-content:space-between; border-bottom: 0.5pt solid #d5dbe1; padding-bottom: 4pt;">
      <span>${escapeHtml(metadata.journalShortName || metadata.journalName)}</span>
      <span>Vol. ${metadata.volumeNumber}, Issue ${metadata.issueNumber} (${metadata.year})</span>
    </div>`;
}

function buildFooterTemplate(): string {
    return `
    <div style="width:100%; font-family: Calibri, Arial, sans-serif; font-size: 7.5pt; color: #555; padding: 0 0.6in; display:flex; justify-content:space-between;">
      <span>© IJKRI</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;
}

/**
 * Renders a FormattedArticleContent + ArticleTemplateMetadata pair to a
 * PDF using the shared ArticleTemplate as the single visual source of
 * truth. Used by both the AI-assisted format-article tool and the
 * in-journal production/typesetting editor.
 */
export async function renderArticlePdf({
    content,
    metadata,
}: RenderArticlePdfInput): Promise<Uint8Array> {
    /*
     * Loaded dynamically so Turbopack's server-component graph
     * analysis doesn't flag this server-only PDF renderer as a
     * page trying to use react-dom/server directly.
     */
    const { renderToStaticMarkup } = await import("react-dom/server");

    const bodyMarkup = renderToStaticMarkup(
        ArticleTemplate({ content, metadata }),
    );

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;">
${bodyMarkup}
</body>
</html>`;

    return renderHtmlToPdf(html, {
        headerHtml: buildHeaderTemplate(metadata),
        footerHtml: buildFooterTemplate(),
    });
}
