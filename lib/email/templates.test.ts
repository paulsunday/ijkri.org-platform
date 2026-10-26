import { describe, expect, it } from "vitest";

import { manuscriptReceivedEmail } from "./templates";

describe("manuscriptReceivedEmail", () => {
  it("includes the manuscript ID, title, and submission link in both formats", () => {
    const result = manuscriptReceivedEmail({
      authorName: "Jane Doe",
      journalName: "International Journal of Knowledge, Research and Innovation",
      manuscriptTitle: "A Study of Something Important",
      manuscriptDisplayId: "IJKRI-2026-007",
      submissionUrl: "https://ijkri.org/author/submissions/abc123",
    });

    expect(result.subject).toContain("IJKRI-2026-007");
    expect(result.text).toContain("IJKRI-2026-007");
    expect(result.text).toContain("A Study of Something Important");
    expect(result.text).toContain(
      "https://ijkri.org/author/submissions/abc123",
    );
    expect(result.html).toContain("IJKRI-2026-007");
    expect(result.html).toContain(
      "https://ijkri.org/author/submissions/abc123",
    );
  });

  it("escapes HTML-sensitive characters in the title", () => {
    const result = manuscriptReceivedEmail({
      authorName: "Jane Doe",
      journalName: "IJKRI",
      manuscriptTitle: "<script>alert(1)</script>",
      manuscriptDisplayId: "IJKRI-2026-008",
      submissionUrl: "https://ijkri.org/author/submissions/abc123",
    });

    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).toContain("&lt;script&gt;");
  });
});
