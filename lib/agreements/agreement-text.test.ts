import { describe, expect, it } from "vitest";

import { buildAgreementText } from "./agreement-text";

const BASE_INPUT = {
  journalName: "International Journal of Knowledge, Research and Innovation",
  publisherName: "Innovare Academic Publisher",
  manuscriptTitle: "A Study of Something Important",
  manuscriptDisplayId: "IJKRI-2026-007",
  correspondingAuthorName: "Jane Doe",
};

describe("buildAgreementText", () => {
  it("includes a CC BY 4.0 license grant when selected", () => {
    const text = buildAgreementText({
      ...BASE_INPUT,
      licenseType: "CC_BY_4",
    });

    expect(text).toContain("CC BY 4.0");
    expect(text).toContain("retain copyright");
    expect(text).not.toContain("COPYRIGHT TRANSFER");
  });

  it("includes a copyright transfer clause when selected", () => {
    const text = buildAgreementText({
      ...BASE_INPUT,
      licenseType: "COPYRIGHT_TRANSFER",
    });

    expect(text).toContain("COPYRIGHT TRANSFER");
    expect(text).toContain(BASE_INPUT.publisherName);
    expect(text).toContain("thesis or dissertation");
  });

  it("includes the manuscript ID, title, and corresponding author", () => {
    const text = buildAgreementText({
      ...BASE_INPUT,
      licenseType: "CC_BY_4",
    });

    expect(text).toContain(BASE_INPUT.manuscriptDisplayId);
    expect(text).toContain(BASE_INPUT.manuscriptTitle);
    expect(text).toContain(BASE_INPUT.correspondingAuthorName);
  });
});
