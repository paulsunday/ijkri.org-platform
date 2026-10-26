import type { StaticPageKey } from "@/lib/generated/prisma";

export const STATIC_PAGE_DEFS: Array<{
  key: StaticPageKey;
  label: string;
  path: string;
}> = [
  { key: "ABOUT", label: "About", path: "/about" },
  { key: "AIMS_SCOPE", label: "Aims & Scope", path: "/aims-scope" },
  {
    key: "AUTHOR_GUIDELINES",
    label: "Author Guidelines",
    path: "/author-guidelines",
  },
  { key: "PEER_REVIEW", label: "Peer Review", path: "/peer-review" },
  {
    key: "PUBLICATION_ETHICS",
    label: "Publication Ethics",
    path: "/publication-ethics",
  },
  { key: "WHY_IJKRI", label: "Why IJKRI", path: "/why-ijkri" },
  { key: "FAQ", label: "FAQ", path: "/faq" },
  { key: "TERMS", label: "Terms", path: "/terms" },
  { key: "PRIVACY", label: "Privacy", path: "/privacy" },
];
