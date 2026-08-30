import type { ReactNode } from "react";

import type { FormattedArticleContent } from "@/lib/ai/format-article";

export type ArticleTemplateMetadata = {
    journalName: string;
    journalShortName: string;
    volumeNumber: number;
    issueNumber: number;
    year: number;
    startPage: number | null;
    endPage: number | null;
    doi: string | null;
    copyrightPolicy: string | null;
    license: string | null;
};

export type ArticleTemplateProps = {
    content: FormattedArticleContent;
    metadata: ArticleTemplateMetadata;
};

const DOI_PLACEHOLDER = "DOI********";

function buildAffiliationIndex(
    authors: FormattedArticleContent["authors"],
): {
    indexByAffiliation: Map<string, number>;
    orderedAffiliations: string[];
} {
    const indexByAffiliation = new Map<string, number>();
    const orderedAffiliations: string[] = [];

    for (const author of authors) {
        const affiliation = author.affiliation.trim() || "—";

        if (!indexByAffiliation.has(affiliation)) {
            orderedAffiliations.push(affiliation);
            indexByAffiliation.set(
                affiliation,
                orderedAffiliations.length,
            );
        }
    }

    return {
        indexByAffiliation,
        orderedAffiliations,
    };
}

function pageRangeText(
    startPage: number | null,
    endPage: number | null,
): string {
    if (!startPage) {
        return "—";
    }

    if (!endPage || endPage === startPage) {
        return String(startPage);
    }

    return `${startPage}–${endPage}`;
}

function normalizeOrcid(orcid: string | null): string | null {
    const trimmed = orcid
        ?.replace("https://orcid.org/", "")
        .trim();

    return trimmed || null;
}

type NumberedSection = FormattedArticleContent["sections"][number] & {
    numberedHeading: string;
};

function buildNumberedSections(
    sections: FormattedArticleContent["sections"],
): NumberedSection[] {
    let sectionCounter = 0;
    let subsectionCounter = 0;

    return sections.map((section) => {
        let numberedHeading: string;

        if (section.level === 1) {
            sectionCounter += 1;
            subsectionCounter = 0;
            numberedHeading = `${sectionCounter}. ${section.heading}`;
        } else {
            subsectionCounter += 1;
            numberedHeading = `${sectionCounter}.${subsectionCounter} ${section.heading}`;
        }

        return { ...section, numberedHeading };
    });
}

/**
 * Renders the fixed IJKRI article template. Used both for the
 * on-screen review preview (plain React) and, via
 * renderToStaticMarkup, as the source HTML for PDF generation —
 * one template, one visual source of truth for every article.
 */
export function ArticleTemplate({
    content,
    metadata,
}: ArticleTemplateProps) {
    const { indexByAffiliation, orderedAffiliations } =
        buildAffiliationIndex(content.authors);

    const doiText = metadata.doi
        ? `https://doi.org/${metadata.doi}`
        : DOI_PLACEHOLDER;

    const numberedSections = buildNumberedSections(
        content.sections,
    );

    return (
        <div className="article-template">
            <style>{TEMPLATE_STYLES}</style>

            <header className="title-block">
                <p className="eyebrow">Research Article</p>

                <p className="journal-line">
                    {metadata.journalName}
                </p>

                <p className="volume-line">
                    Vol. {metadata.volumeNumber}, Issue{" "}
                    {metadata.issueNumber} ({metadata.year})
                </p>

                <h1 className="title">{content.title}</h1>

                <p className="authors">
                    {content.authors.map((author, index) => (
                        <span key={`${author.fullName}-${index}`}>
                            {author.fullName}
                            <sup>
                                {indexByAffiliation.get(
                                    author.affiliation.trim() ||
                                        "—",
                                )}
                                {author.isCorresponding
                                    ? "*"
                                    : ""}
                            </sup>
                            {index < content.authors.length - 1
                                ? ", "
                                : ""}
                        </span>
                    ))}
                </p>

                <div className="affiliations">
                    {orderedAffiliations.map(
                        (affiliation, index) => (
                            <p key={affiliation}>
                                <sup>{index + 1}</sup>
                                {affiliation}
                            </p>
                        ),
                    )}
                </div>

                {content.authors.some(
                    (author) =>
                        normalizeOrcid(author.orcid) !== null,
                ) && (
                    <p className="orcid-line">
                        {content.authors
                            .filter(
                                (author) =>
                                    normalizeOrcid(
                                        author.orcid,
                                    ) !== null,
                            )
                            .map((author) => (
                                <span key={author.fullName}>
                                    {author.fullName}: ORCID{" "}
                                    {normalizeOrcid(
                                        author.orcid,
                                    )}
                                </span>
                            ))
                            .reduce<ReactNode[]>(
                                (
                                    accumulated,
                                    node,
                                    index,
                                ) =>
                                    index === 0
                                        ? [node]
                                        : [
                                              ...accumulated,
                                              " • ",
                                              node,
                                          ],
                                [],
                            )}
                    </p>
                )}

                {content.authors.some(
                    (author) => author.isCorresponding,
                ) && (
                    <p className="corresponding-line">
                        *Corresponding author:{" "}
                        {content.authors
                            .filter(
                                (author) =>
                                    author.isCorresponding,
                            )
                            .map((author) => author.fullName)
                            .join(", ")}
                    </p>
                )}

                <p className="doi-line">
                    DOI: {doiText} &nbsp;•&nbsp; Pages:{" "}
                    {pageRangeText(
                        metadata.startPage,
                        metadata.endPage,
                    )}
                </p>
            </header>

            <section className="abstract-box">
                <p className="abstract-label">Abstract</p>

                {content.abstractHtml ? (
                    <div
                        className="abstract-body rich-body"
                        dangerouslySetInnerHTML={{
                            __html: content.abstractHtml,
                        }}
                    />
                ) : (
                    <p className="abstract-body">
                        {content.abstract}
                    </p>
                )}

                {content.keywords.length > 0 && (
                    <p className="keywords-line">
                        <em>
                            <strong>Keywords: </strong>
                            {content.keywords.join(", ")}
                        </em>
                    </p>
                )}
            </section>

            <div className="two-column-body">
                {content.bodyHtml ? (
                    <div
                        className="rich-body"
                        dangerouslySetInnerHTML={{
                            __html: content.bodyHtml,
                        }}
                    />
                ) : (
                    numberedSections.map((section, index) => {
                        return (
                            <div
                                key={`${section.heading}-${index}`}
                                className="section"
                            >
                                {section.level === 1 ? (
                                    <h2 className="h1-heading">
                                        {section.numberedHeading}
                                    </h2>
                                ) : (
                                    <h3 className="h2-heading">
                                        {section.numberedHeading}
                                    </h3>
                                )}

                                {section.paragraphs.map(
                                    (paragraph, paragraphIndex) => (
                                        <p
                                            key={paragraphIndex}
                                            className="body-paragraph"
                                        >
                                            {paragraph}
                                        </p>
                                    ),
                                )}
                            </div>
                        );
                    })
                )}

                {!content.bodyHtml && content.tables.map((table, index) => (
                    <div
                        key={`table-${index}`}
                        className="table-band"
                    >
                        <p className="table-caption">
                            Table {index + 1}. {table.caption}
                        </p>

                        <table className="article-table">
                            <thead>
                                <tr>
                                    {table.headers.map(
                                        (header, headerIndex) => (
                                            <th
                                                key={headerIndex}
                                            >
                                                {header}
                                            </th>
                                        ),
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {table.rows.map(
                                    (row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map(
                                                (
                                                    cell,
                                                    cellIndex,
                                                ) => (
                                                    <td
                                                        key={
                                                            cellIndex
                                                        }
                                                    >
                                                        {cell}
                                                    </td>
                                                ),
                                            )}
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                ))}

                {!content.bodyHtml && content.figures.map((figure, index) => (
                    <div
                        key={`figure-${index}`}
                        className="figure-block"
                    >
                        <p className="figure-caption">
                            Figure {index + 1}. {figure.caption}
                        </p>

                        {figure.note && (
                            <p className="figure-note">
                                {figure.note}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <section className="references-page">
                <h2 className="references-heading">
                    References
                </h2>

                <ol className="references-list">
                    {content.references.map(
                        (reference, index) => (
                            <li key={index}>{reference}</li>
                        ),
                    )}
                </ol>
            </section>

            <footer className="copyright-block">
                {metadata.copyrightPolicy && (
                    <p>{metadata.copyrightPolicy}</p>
                )}

                {metadata.license && (
                    <p>License: {metadata.license}</p>
                )}
            </footer>
        </div>
    );
}

export { normalizeOrcid as normalizeAuthorOrcid };

const ACCENT_COLOR = "#1d3557";

const TEMPLATE_STYLES = `
.article-template {
  font-family: Cambria, Caladea, Georgia, 'Times New Roman', serif;
  color: #1a1a1a;
  font-size: 10.5pt;
  line-height: 1.5;
  max-width: 100%;
}

.article-template .eyebrow,
.article-template h1,
.article-template h2,
.article-template h3,
.article-template .journal-line,
.article-template .volume-line,
.article-template .abstract-label,
.article-template .table-caption,
.article-template .figure-caption {
  font-family: Calibri, Carlito, Arial, sans-serif;
}

.title-block {
  text-align: center;
  margin-bottom: 18pt;
}

.eyebrow {
  color: ${ACCENT_COLOR};
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 9pt;
  margin: 0 0 6pt;
}

.journal-line {
  font-weight: 700;
  font-size: 11pt;
  margin: 0;
}

.volume-line {
  font-size: 9pt;
  color: #444;
  margin: 2pt 0 12pt;
}

.title {
  font-size: 18pt;
  font-weight: 700;
  margin: 0 0 10pt;
  line-height: 1.3;
}

.authors {
  font-weight: 700;
  font-size: 11pt;
  margin: 0 0 6pt;
}

.affiliations {
  font-style: italic;
  font-size: 8.5pt;
  color: #333;
}

.affiliations p {
  margin: 1pt 0;
}

.corresponding-line {
  font-size: 8.5pt;
  color: #444;
  margin-top: 4pt;
}

.doi-line {
  font-size: 8.5pt;
  color: #444;
  margin-top: 8pt;
}

.abstract-box {
  background: #f4f6f8;
  border: 1pt solid #c9d2db;
  border-radius: 4pt;
  padding: 12pt 14pt;
  margin: 0 0 18pt;
}

.abstract-label {
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${ACCENT_COLOR};
  font-size: 9pt;
  margin: 0 0 6pt;
}

.abstract-body {
  text-align: justify;
  margin: 0 0 8pt;
}

.keywords-line {
  margin: 0;
}

.two-column-body {
  column-count: 2;
  column-gap: 18pt;
}

.section {
  break-inside: avoid;
}

.h1-heading {
  color: ${ACCENT_COLOR};
  font-size: 12pt;
  font-weight: 700;
  border-bottom: 1.5pt solid ${ACCENT_COLOR};
  padding-bottom: 3pt;
  margin: 14pt 0 8pt;
  break-after: avoid;
}

.h2-heading {
  font-weight: 700;
  font-style: italic;
  font-size: 10.5pt;
  margin: 10pt 0 6pt;
  break-after: avoid;
}

.body-paragraph {
  text-align: justify;
  margin: 0 0 8pt;
}

.rich-body {
  break-inside: auto;
}

.rich-body h1,
.rich-body h2 {
  color: ${ACCENT_COLOR};
  font-size: 12pt;
  font-weight: 700;
  border-bottom: 1.5pt solid ${ACCENT_COLOR};
  padding-bottom: 3pt;
  margin: 14pt 0 8pt;
  break-after: avoid;
  break-inside: avoid;
}

.rich-body h3,
.rich-body h4 {
  font-weight: 700;
  font-style: italic;
  font-size: 10.5pt;
  margin: 10pt 0 6pt;
  break-after: avoid;
  break-inside: avoid;
}

.rich-body p {
  text-align: justify;
  margin: 0 0 8pt;
}

.rich-body ul,
.rich-body ol {
  margin: 0 0 8pt;
  padding-left: 1.4em;
}

.rich-body li {
  margin: 0 0 3pt;
}

.rich-body blockquote {
  margin: 8pt 0;
  padding: 4pt 10pt;
  border-left: 2.5pt solid ${ACCENT_COLOR};
  color: #333;
  font-style: italic;
}

.rich-body a {
  color: ${ACCENT_COLOR};
}

.rich-body sup,
.rich-body sub {
  font-size: 0.75em;
}

.rich-body table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin: 10pt 0;
  break-inside: avoid;
  column-span: all;
  border-top: 1.5pt solid ${ACCENT_COLOR};
  border-bottom: 1.5pt solid ${ACCENT_COLOR};
}

.rich-body th {
  background: ${ACCENT_COLOR};
  color: #ffffff;
  font-weight: 700;
  text-align: left;
  padding: 5pt 7pt;
  border: 0.5pt solid ${ACCENT_COLOR};
}

.rich-body td {
  padding: 5pt 7pt;
  border: 0.5pt solid #d5dbe1;
}

.rich-body tr:nth-child(even) td {
  background: #f4f6f8;
}

.rich-body img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 10pt auto;
  break-inside: avoid;
  column-span: all;
}

.rich-body figure {
  margin: 10pt 0;
  break-inside: avoid;
  column-span: all;
}

.rich-body figcaption {
  font-weight: 700;
  font-size: 9pt;
  text-align: center;
  margin-top: 4pt;
}

.table-band,
.figure-block {
  column-span: all;
  break-inside: avoid;
  margin: 12pt 0;
}

.table-caption,
.figure-caption {
  font-weight: 700;
  font-size: 9pt;
  margin: 0 0 4pt;
}

.figure-note {
  font-size: 9pt;
  color: #444;
  font-style: italic;
  margin: 0;
}

.article-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  border-top: 1.5pt solid ${ACCENT_COLOR};
  border-bottom: 1.5pt solid ${ACCENT_COLOR};
}

.article-table thead th {
  background: ${ACCENT_COLOR};
  color: #ffffff;
  font-weight: 700;
  text-align: left;
  padding: 5pt 7pt;
  border: 0.5pt solid ${ACCENT_COLOR};
}

.article-table tbody td {
  padding: 5pt 7pt;
  border: 0.5pt solid #d5dbe1;
}

.article-table tbody tr:nth-child(even) {
  background: #f4f6f8;
}

.references-page {
  break-before: page;
}

.references-heading {
  color: ${ACCENT_COLOR};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12pt;
  border-bottom: 1.5pt solid ${ACCENT_COLOR};
  padding-bottom: 4pt;
  margin: 0 0 10pt;
}

.references-list {
  list-style: none;
  counter-reset: reference-counter;
  margin: 0;
  padding: 0;
  font-size: 9pt;
}

.references-list li {
  counter-increment: reference-counter;
  padding-left: 1.6em;
  text-indent: -1.6em;
  margin-bottom: 6pt;
}

.references-list li::before {
  content: "[" counter(reference-counter) "] ";
  font-weight: 700;
}

.copyright-block {
  margin-top: 24pt;
  padding-top: 8pt;
  border-top: 0.5pt solid #d5dbe1;
  font-size: 7.5pt;
  color: #555;
}

.copyright-block p {
  margin: 2pt 0;
}
`;
