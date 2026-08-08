import type { ArticleCitationData } from "./types";
import {
  filterNamedAuthors,
  formatFullName,
  formatLocator,
  resolveCitationDestination,
  sentenceCaseTitle,
} from "./shared";

/** MLA 9th edition author list: 1 inverted, 2 "and", 3+ "et al." */
function formatMlaAuthorList(data: ArticleCitationData): string {
  const authors = filterNamedAuthors(data.authors);

  if (authors.length === 0) {
    return "Author information unavailable.";
  }

  if (authors.length === 1) {
    return `${formatFullName(authors[0].fullName, true)}.`;
  }

  if (authors.length === 2) {
    return `${formatFullName(authors[0].fullName, true)}, and ${formatFullName(authors[1].fullName, false)}.`;
  }

  return `${formatFullName(authors[0].fullName, true)}, et al.`;
}

/** MLA 9th edition, journal article. */
export function formatMlaCitation(data: ArticleCitationData): string {
  const authors = formatMlaAuthorList(data);
  const title = `"${sentenceCaseTitle(data.title)}."`;
  const year = data.year != null ? `${data.year}` : "n.d.";
  const locator = formatLocator(data);
  const destination = resolveCitationDestination(data);

  const middle = [
    data.volume != null ? `vol. ${data.volume}` : null,
    data.issue != null ? `no. ${data.issue}` : null,
    year,
    locator ? `pp. ${locator}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [authors, title, `${data.journal}, ${middle}.`, `${destination}.`]
    .filter(Boolean)
    .join(" ");
}
