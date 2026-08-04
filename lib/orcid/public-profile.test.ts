import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPublicOrcidRecord } from "./public-profile";

const fixtureRecord = {
  person: {
    biography: { content: "A researcher." },
    keywords: { keyword: [{ content: "Genomics" }, { content: "Bioinformatics" }] },
  },
  "activities-summary": {
    employments: {
      "affiliation-group": [
        {
          summaries: [
            {
              "employment-summary": {
                organization: { name: "State University" },
                "role-title": "Professor",
                "start-date": { year: { value: "2015" } },
              },
            },
          ],
        },
      ],
    },
    educations: {
      "affiliation-group": [
        {
          summaries: [
            {
              "education-summary": {
                organization: { name: "Old University" },
                "role-title": "PhD",
                "start-date": { year: { value: "2008" } },
                "end-date": { year: { value: "2012" } },
              },
            },
          ],
        },
      ],
    },
    works: { group: [{}, {}, {}] },
  },
};

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => fixtureRecord,
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetchPublicOrcidRecord", () => {
  it("maps the ORCID public record into a flat profile shape", async () => {
    const profile = await fetchPublicOrcidRecord("0000-0001-2345-6789");

    expect(profile.biography).toBe("A researcher.");
    expect(profile.keywords).toEqual(["Genomics", "Bioinformatics"]);
    expect(profile.worksCount).toBe(3);
    expect(profile.employments).toEqual([
      { organization: "State University", role: "Professor", startYear: "2015", endYear: null },
    ]);
    expect(profile.educations).toEqual([
      { organization: "Old University", role: "PhD", startYear: "2008", endYear: "2012" },
    ]);
    expect(profile.publicProfileUrl).toBe("https://orcid.org/0000-0001-2345-6789");
  });

  it("calls the public API without any Authorization header or credentials", async () => {
    await fetchPublicOrcidRecord("0000-0001-2345-6789");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(String(url)).toContain("pub.orcid.org");
    expect(String(url)).toContain("0000-0001-2345-6789");

    const headers = options?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  it("throws a descriptive error when the request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchPublicOrcidRecord("0000-0000-0000-0000")).rejects.toThrow(/404/);
  });
});
