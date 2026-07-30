import { randomUUID } from "crypto";

import { escapeXml } from "@/lib/xml/escape-xml";

export type CrossrefArticleAuthor = {
    fullName: string;
    orcid?: string | null;
};

export type CrossrefArticleInput = {
    title: string;
    abstract: string;
    doi: string;
    slug: string;
    startPage?: number | null;
    endPage?: number | null;
    publishedAt: Date;
    authors: CrossrefArticleAuthor[];
};

export type CrossrefJournalInput = {
    name: string;
    shortName: string;
    issnPrint?: string | null;
    issnOnline?: string | null;
};

export type CrossrefIssueInput = {
    number: number;
};

export type CrossrefVolumeInput = {
    number: number;
    year: number;
};

export type CrossrefDepositorInput = {
    depositorName: string;
    depositorEmail: string;
    registrant: string;
};

export type BuildCrossrefDepositXmlInput = {
    article: CrossrefArticleInput;
    journal: CrossrefJournalInput;
    issue: CrossrefIssueInput;
    volume: CrossrefVolumeInput;
    siteUrl: string;
    depositor: CrossrefDepositorInput;
};

const ORCID_ID_PATTERN =
    /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/*
 * Article author names are stored surname-first across this
 * platform (see the same convention in
 * app/(public)/articles/[slug]/page.tsx's formatApaAuthorName).
 * Crossref requires given_name/surname as separate elements.
 */
function splitAuthorName(fullName: string): {
    surname: string;
    givenName: string;
} {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return {
            surname: "Unknown",
            givenName: "",
        };
    }

    if (parts.length === 1) {
        return {
            surname: parts[0],
            givenName: "",
        };
    }

    return {
        surname: parts[0],
        givenName: parts.slice(1).join(" "),
    };
}

function normalizeOrcid(
    orcid: string | null | undefined,
): string | null {
    const trimmed = orcid?.trim();

    if (!trimmed) {
        return null;
    }

    const idOnly = trimmed.replace(
        /^https?:\/\/(www\.)?orcid\.org\//i,
        "",
    );

    return ORCID_ID_PATTERN.test(idOnly)
        ? `https://orcid.org/${idOnly}`
        : null;
}

function renderContributors(
    authors: CrossrefArticleAuthor[],
): string {
    return authors
        .map((author, index) => {
            const { surname, givenName } = splitAuthorName(
                author.fullName,
            );

            const sequence =
                index === 0 ? "first" : "additional";

            const orcidUrl = normalizeOrcid(author.orcid);

            return `        <person_name sequence="${sequence}" contributor_role="author">${givenName
                ? `
          <given_name>${escapeXml(givenName)}</given_name>`
                : ""}
          <surname>${escapeXml(surname)}</surname>${orcidUrl
                    ? `
          <ORCID>${escapeXml(orcidUrl)}</ORCID>`
                    : ""}
        </person_name>`;
        })
        .join("\n");
}

function renderIssn(journal: CrossrefJournalInput): string {
    const entries = [
        journal.issnOnline
            ? `        <issn media_type="electronic">${escapeXml(journal.issnOnline)}</issn>`
            : "",
        journal.issnPrint
            ? `        <issn media_type="print">${escapeXml(journal.issnPrint)}</issn>`
            : "",
    ].filter(Boolean);

    return entries.join("\n");
}

function renderPages(article: CrossrefArticleInput): string {
    if (!article.startPage) {
        return "";
    }

    return `        <pages>
          <first_page>${article.startPage}</first_page>${article.endPage
            ? `
          <last_page>${article.endPage}</last_page>`
            : ""}
        </pages>`;
}

/**
 * Builds a Crossref journal_article deposit (schema 5.3.1).
 *
 * https://www.crossref.org/documentation/schema-library/xsd-schema-quick-reference/
 */
export function buildCrossrefDepositXml({
    article,
    journal,
    issue,
    volume,
    siteUrl,
    depositor,
}: BuildCrossrefDepositXmlInput): string {
    const timestamp = Date.now().toString();
    const doiBatchId = `${journal.shortName || "journal"}-${timestamp}-${randomUUID().slice(0, 8)}`;

    const resourceUrl = `${siteUrl.replace(/\/$/, "")}/articles/${article.slug}`;

    const year = article.publishedAt.getUTCFullYear();
    const month = article.publishedAt.getUTCMonth() + 1;
    const day = article.publishedAt.getUTCDate();

    return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 http://www.crossref.org/schemas/crossref5.3.1.xsd" version="5.3.1">
  <head>
    <doi_batch_id>${escapeXml(doiBatchId)}</doi_batch_id>
    <timestamp>${timestamp}</timestamp>
    <depositor>
      <depositor_name>${escapeXml(depositor.depositorName)}</depositor_name>
      <email_address>${escapeXml(depositor.depositorEmail)}</email_address>
    </depositor>
    <registrant>${escapeXml(depositor.registrant)}</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata>
        <full_title>${escapeXml(journal.name)}</full_title>
        <abbrev_title>${escapeXml(journal.shortName)}</abbrev_title>
${renderIssn(journal)}
      </journal_metadata>
      <journal_issue>
        <publication_date media_type="online">
          <year>${volume.year}</year>
        </publication_date>
        <journal_volume>
          <volume>${volume.number}</volume>
        </journal_volume>
        <issue>${issue.number}</issue>
      </journal_issue>
      <journal_article publication_type="full_text">
        <titles>
          <title>${escapeXml(article.title)}</title>
        </titles>
        <contributors>
${renderContributors(article.authors)}
        </contributors>
        <abstract xmlns="http://www.ncbi.nlm.nih.gov/JATS1">
          <p>${escapeXml(article.abstract)}</p>
        </abstract>
        <publication_date media_type="online">
          <year>${year}</year>
          <month>${month}</month>
          <day>${day}</day>
        </publication_date>
${renderPages(article)}
        <doi_data>
          <doi>${escapeXml(article.doi)}</doi>
          <resource>${escapeXml(resourceUrl)}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>
`;
}
