import type { ArticleCitationData, CitationAuthor } from "./types";
import {
  filterNamedAuthors,
  formatFullName,
  formatPageRange,
  parseAuthorName,
} from "./shared";

function slugifyKeyPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Deterministic key: firstauthorsurname + year + first meaningful title word. */
function buildCitationKey(data: ArticleCitationData): string {
  const firstAuthor = filterNamedAuthors(data.authors)[0];

  const surname = firstAuthor
    ? slugifyKeyPart(parseAuthorName(firstAuthor.fullName).surname)
    : "";

  const titleWords = data.title.trim().split(/\s+/);

  const firstTitleWord =
    titleWords.find((word) => word.length > 2) || titleWords[0] || "article";

  const year = data.year != null ? `${data.year}` : "nd";

  return `${surname || "unknown"}${year}${slugifyKeyPart(firstTitleWord)}`;
}

function formatBibtexAuthorField(authors: CitationAuthor[]): string {
  return filterNamedAuthors(authors)
    .map((author) => formatFullName(author.fullName, true))
    .join(" and ");
}

/** Valid BibTeX @article entry; only present fields are emitted. */
export function formatBibtexCitation(data: ArticleCitationData): string {
  const key = buildCitationKey(data);
  const authorField = formatBibtexAuthorField(data.authors);
  const locator = formatPageRange(data.startPage, data.endPage) || data.articleNumber;

  const fields: [string, string | null | undefined][] = [
    ["author", authorField || undefined],
    ["title", data.title],
    ["journal", data.journal],
    ["year", data.year != null ? `${data.year}` : undefined],
    ["volume", data.volume != null ? `${data.volume}` : undefined],
    ["number", data.issue != null ? `${data.issue}` : undefined],
    ["pages", locator ? locator.replace("–", "--") : undefined],
    ["publisher", data.publisher || undefined],
    ["doi", data.doi || undefined],
    ["url", data.url],
  ];

  const fieldLines = fields
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([field, value]) => `  ${field} = {${value}},`)
    .join("\n");

  return `@article{${key},\n${fieldLines}\n}`;
}
