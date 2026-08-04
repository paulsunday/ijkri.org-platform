function getOrcidApiBase(): string {
  return (
    process.env.ORCID_PUBLIC_API_BASE?.replace(/\/$/, "") || "https://pub.orcid.org"
  );
}

export type OrcidEmployment = {
  organization: string | null;
  role: string | null;
  startYear: string | null;
  endYear: string | null;
};

export type OrcidEducation = {
  organization: string | null;
  role: string | null;
  startYear: string | null;
  endYear: string | null;
};

export type OrcidPublicProfile = {
  biography: string | null;
  employments: OrcidEmployment[];
  educations: OrcidEducation[];
  keywords: string[];
  worksCount: number;
  publicProfileUrl: string;
};

type OrcidAffiliationSummary = {
  organization?: { name?: string };
  "role-title"?: string;
  "start-date"?: { year?: { value?: string } };
  "end-date"?: { year?: { value?: string } };
};

type OrcidRecordResponse = {
  person?: {
    biography?: { content?: string };
    keywords?: { keyword?: { content?: string }[] };
  };
  "activities-summary"?: {
    employments?: {
      "affiliation-group"?: { summaries?: { "employment-summary": OrcidAffiliationSummary }[] }[];
    };
    educations?: {
      "affiliation-group"?: { summaries?: { "education-summary": OrcidAffiliationSummary }[] }[];
    };
    works?: { group?: unknown[] };
  };
};

function mapAffiliation(summary: OrcidAffiliationSummary) {
  return {
    organization: summary.organization?.name ?? null,
    role: summary["role-title"] ?? null,
    startYear: summary["start-date"]?.year?.value ?? null,
    endYear: summary["end-date"]?.year?.value ?? null,
  };
}

/**
 * Reads PUBLIC ORCID record data (biography, employment, education,
 * keywords, works count) via ORCID's public API — no OAuth token
 * required, since this endpoint only ever returns data the ORCID
 * record holder has marked public. This is entirely separate from the
 * existing OAuth identity-verification flow in lib/orcid/oauth.ts,
 * which never fetches profile data at all.
 */
export async function fetchPublicOrcidRecord(orcidId: string): Promise<OrcidPublicProfile> {
  const response = await fetch(`${getOrcidApiBase()}/v3.0/${orcidId}/record`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ORCID public record request failed with status ${response.status}.`);
  }

  const record = (await response.json()) as OrcidRecordResponse;

  const employments = (record["activities-summary"]?.employments?.["affiliation-group"] ?? [])
    .flatMap((group) => group.summaries ?? [])
    .map((entry) => mapAffiliation(entry["employment-summary"]));

  const educations = (record["activities-summary"]?.educations?.["affiliation-group"] ?? [])
    .flatMap((group) => group.summaries ?? [])
    .map((entry) => mapAffiliation(entry["education-summary"]));

  const keywords = (record.person?.keywords?.keyword ?? [])
    .map((keyword) => keyword.content)
    .filter((content): content is string => Boolean(content));

  const worksCount = record["activities-summary"]?.works?.group?.length ?? 0;

  return {
    biography: record.person?.biography?.content ?? null,
    employments,
    educations,
    keywords,
    worksCount,
    publicProfileUrl: `https://orcid.org/${orcidId}`,
  };
}
