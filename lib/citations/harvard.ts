import type { ArticleCitationData } from "./types";
import {
  formatInitialsAuthorList,
  formatLocator,
  formatVolumeIssue,
  resolveCitationDestination,
  sentenceCaseTitle,
} from "./shared";

/** Harvard author-date style, journal article. */
export function formatHarvardCitation(data: ArticleCitationData): string {
  const authors = formatInitialsAuthorList(data.authors, "and");
  const year = data.year ?? "n.d.";
  const title = `'${sentenceCaseTitle(data.title)}'`;
  const volumeIssue = formatVolumeIssue(data.volume, data.issue);
  const locator = formatLocator(data);
  const destination = resolveCitationDestination(data);

  const journalLine = [data.journal, volumeIssue, locator ? `pp. ${locator}` : null]
    .filter(Boolean)
    .join(", ");

  return [
    `${authors} (${year})`,
    `${title},`,
    `${journalLine}.`,
    `Available at: ${destination}.`,
  ]
    .filter(Boolean)
    .join(" ");
}
