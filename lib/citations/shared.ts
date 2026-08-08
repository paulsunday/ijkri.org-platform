import type { ArticleCitationData, CitationAuthor } from "./types";

/**
 * Article authors are stored surname-first (e.g. "Kala-Dokubo Esther
 * Boma"), never "First Last". Every formatter goes through this parser
 * rather than guessing at name order.
 */
export function parseAuthorName(fullName: string): {
  surname: string;
  givenNames: string[];
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { surname: "", givenNames: [] };
  }

  if (parts.length === 1) {
    return { surname: parts[0], givenNames: [] };
  }

  return { surname: parts[0], givenNames: parts.slice(1) };
}

export function formatInitials(givenNames: string[]): string {
  return givenNames
    .map((namePart) => {
      const firstCharacter = namePart.charAt(0).toUpperCase();

      return firstCharacter ? `${firstCharacter}.` : "";
    })
    .filter(Boolean)
    .join(" ");
}

/** "Surname, F. M." — used by APA and Harvard. */
export function formatInvertedInitialsName(fullName: string): string {
  const { surname, givenNames } = parseAuthorName(fullName);

  if (!surname) {
    return "";
  }

  const initials = formatInitials(givenNames);

  return initials ? `${surname}, ${initials}` : surname;
}

/** "Surname, Given Names" or "Given Names Surname" — full given names. */
export function formatFullName(
  fullName: string,
  inverted: boolean,
): string {
  const { surname, givenNames } = parseAuthorName(fullName);

  if (!surname) {
    return "";
  }

  const given = givenNames.join(" ");

  if (!given) {
    return surname;
  }

  return inverted ? `${surname}, ${given}` : `${given} ${surname}`;
}

export function filterNamedAuthors(authors: CitationAuthor[]): CitationAuthor[] {
  return authors.filter((author) => author.fullName.trim());
}

/**
 * "A", "A, & B", "A, B, & C" — the APA/Harvard-style inverted-initials
 * author list, shared by both formatters (Harvard uses "and" instead
 * of "&").
 */
export function formatInitialsAuthorList(
  authors: CitationAuthor[],
  ampersand: "&" | "and",
): string {
  const names = filterNamedAuthors(authors)
    .map((author) => formatInvertedInitialsName(author.fullName))
    .filter(Boolean);

  if (names.length === 0) {
    return "Author information unavailable";
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]}, ${ampersand} ${names[1]}`;
  }

  const allButLast = names.slice(0, -1).join(", ");
  const last = names[names.length - 1];

  return `${allButLast}, ${ampersand} ${last}`;
}

/** "45–67" | "45" | null */
export function formatPageRange(
  startPage?: number | null,
  endPage?: number | null,
): string | null {
  if (startPage == null && endPage == null) {
    return null;
  }

  if (startPage != null && endPage != null && startPage !== endPage) {
    return `${startPage}–${endPage}`;
  }

  return `${startPage ?? endPage}`;
}

/** Falls back to the article number, then omits entirely. */
export function formatLocator(data: ArticleCitationData): string | null {
  return formatPageRange(data.startPage, data.endPage) || data.articleNumber || null;
}

export function resolveDoiUrl(doi?: string | null): string | null {
  if (!doi) {
    return null;
  }

  return `https://doi.org/${doi}`;
}

/** DOI link when available, otherwise the canonical article URL. */
export function resolveCitationDestination(data: ArticleCitationData): string {
  return resolveDoiUrl(data.doi) || data.url;
}

export function sentenceCaseTitle(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function formatVolumeIssue(
  volume?: number | null,
  issue?: number | null,
): string {
  if (volume == null) {
    return "";
  }

  return issue != null ? `${volume}(${issue})` : `${volume}`;
}

export function joinNonEmpty(
  parts: (string | null | undefined)[],
  separator = " ",
): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(separator);
}
