import type { ArticleCitationData } from "./types";
import {
  filterNamedAuthors,
  formatFullName,
  resolveCitationDestination,
} from "./shared";

/** Valid RIS record (TY - JOUR ... ER -); only present tags are emitted. */
export function formatRisCitation(data: ArticleCitationData): string {
  const authorLines = filterNamedAuthors(data.authors).map(
    (author) => `AU  - ${formatFullName(author.fullName, true)}`,
  );

  const lines: (string | null)[] = [
    "TY  - JOUR",
    ...authorLines,
    `TI  - ${data.title}`,
    `JO  - ${data.journal}`,
    data.year != null ? `PY  - ${data.year}` : null,
    data.volume != null ? `VL  - ${data.volume}` : null,
    data.issue != null ? `IS  - ${data.issue}` : null,
    data.startPage != null
      ? `SP  - ${data.startPage}`
      : data.articleNumber
        ? `SP  - ${data.articleNumber}`
        : null,
    data.endPage != null ? `EP  - ${data.endPage}` : null,
    data.publisher ? `PB  - ${data.publisher}` : null,
    data.doi ? `DO  - ${data.doi}` : null,
    `UR  - ${resolveCitationDestination(data)}`,
    "ER  - ",
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}
