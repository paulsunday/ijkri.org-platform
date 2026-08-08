import type { ArticleCitationData, CitationFormatId } from "./types";
import { formatApaCitation } from "./apa";
import { formatMlaCitation } from "./mla";
import { formatChicagoCitation } from "./chicago";
import { formatHarvardCitation } from "./harvard";
import { formatBibtexCitation } from "./bibtex";
import { formatRisCitation } from "./ris";

export type { ArticleCitationData, CitationAuthor, CitationFormatId } from "./types";
export { formatApaCitation } from "./apa";
export { formatMlaCitation } from "./mla";
export { formatChicagoCitation } from "./chicago";
export { formatHarvardCitation } from "./harvard";
export { formatBibtexCitation } from "./bibtex";
export { formatRisCitation } from "./ris";

export const CITATION_FORMATS: { id: CitationFormatId; label: string }[] = [
  { id: "apa", label: "APA" },
  { id: "mla", label: "MLA" },
  { id: "chicago", label: "Chicago" },
  { id: "harvard", label: "Harvard" },
  { id: "bibtex", label: "BibTeX" },
  { id: "ris", label: "RIS" },
];

export function formatCitation(
  format: CitationFormatId,
  data: ArticleCitationData,
): string {
  switch (format) {
    case "apa":
      return formatApaCitation(data);

    case "mla":
      return formatMlaCitation(data);

    case "chicago":
      return formatChicagoCitation(data);

    case "harvard":
      return formatHarvardCitation(data);

    case "bibtex":
      return formatBibtexCitation(data);

    case "ris":
      return formatRisCitation(data);

    default: {
      const exhaustiveCheck: never = format;

      throw new Error(`Unsupported citation format: ${exhaustiveCheck}`);
    }
  }
}
