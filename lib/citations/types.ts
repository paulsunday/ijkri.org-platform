export type CitationAuthor = {
  fullName: string;
};

/**
 * Normalized citation input. Authors are consumed as stored on
 * ArticleAuthor — surname-first, e.g. "Kala-Dokubo Esther Boma" — every
 * formatter re-parses that convention itself rather than assuming
 * "First Last" order.
 */
export type ArticleCitationData = {
  title: string;
  authors: CitationAuthor[];
  journal: string;
  volume?: number | null;
  issue?: number | null;
  year?: number | null;
  startPage?: number | null;
  endPage?: number | null;
  articleNumber?: string | null;
  doi?: string | null;
  url: string;
  publisher?: string | null;
};

export type CitationFormatId =
  | "apa"
  | "mla"
  | "chicago"
  | "harvard"
  | "bibtex"
  | "ris";
