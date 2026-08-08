import type { ArticleCitationData, CitationAuthor } from "./types";
import {
  filterNamedAuthors,
  formatFullName,
  formatLocator,
  resolveCitationDestination,
  sentenceCaseTitle,
} from "./shared";

/** Chicago bibliography style: first author inverted, rest in reading order. */
function formatChicagoAuthorList(authors: CitationAuthor[]): string {
  const named = filterNamedAuthors(authors);

  if (named.length === 0) {
    return "Author information unavailable.";
  }

  if (named.length === 1) {
    return `${formatFullName(named[0].fullName, true)}.`;
  }

  const names = [
    formatFullName(named[0].fullName, true),
    ...named.slice(1).map((author) => formatFullName(author.fullName, false)),
  ];

  const allButLast = names.slice(0, -1).join(", ");
  const last = names[names.length - 1];

  return `${allButLast}, and ${last}.`;
}

/** Chicago Manual of Style, 17th edition, bibliography entry. */
export function formatChicagoCitation(data: ArticleCitationData): string {
  const authors = formatChicagoAuthorList(data.authors);
  const title = `"${sentenceCaseTitle(data.title)}."`;
  const locator = formatLocator(data);
  const destination = resolveCitationDestination(data);

  const volumeIssue = [
    data.volume != null ? `${data.volume}` : null,
    data.issue != null ? `no. ${data.issue}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const yearPart = data.year != null ? ` (${data.year})` : "";

  const journalLine =
    [data.journal, volumeIssue].filter(Boolean).join(" ") + yearPart;

  const pagesPart = locator ? `: ${locator}` : "";

  return [authors, title, `${journalLine}${pagesPart}.`, `${destination}.`]
    .filter(Boolean)
    .join(" ");
}
