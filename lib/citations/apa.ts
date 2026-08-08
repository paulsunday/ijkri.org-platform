import type { ArticleCitationData } from "./types";
import {
  formatInitialsAuthorList,
  formatLocator,
  formatVolumeIssue,
  resolveCitationDestination,
  sentenceCaseTitle,
} from "./shared";

/** APA 7th edition, journal article. */
export function formatApaCitation(data: ArticleCitationData): string {
  const authors = formatInitialsAuthorList(data.authors, "&");
  const year = data.year ?? "n.d.";
  const title = sentenceCaseTitle(data.title);
  const volumeIssue = formatVolumeIssue(data.volume, data.issue);
  const locator = formatLocator(data);
  const destination = resolveCitationDestination(data);

  const journalLine = [data.journal, volumeIssue, locator]
    .filter(Boolean)
    .join(", ");

  return [`${authors} (${year}).`, `${title}.`, `${journalLine}.`, destination]
    .filter(Boolean)
    .join(" ");
}
