import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { escapeXml } from "@/lib/xml/escape-xml";

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ijkri.org";

const REPOSITORY_NAME =
    "International Journal of Knowledge, Research and Innovation";

const OAI_HOST = new URL(siteUrl).host;

const BASE_URL = `${siteUrl}/api/oai`;

const METADATA_PREFIX = "oai_dc";

const PAGE_SIZE = 100;

const RESUMPTION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type OaiArticle = {
    id: string;
    slug: string;
    title: string;
    abstract: string;
    doi: string | null;
    publishedAt: Date | null;
    updatedAt: Date;

    journal: {
        id: string;
        name: string;
        slug: string;
        issnOnline: string | null;
        issnPrint: string | null;
        contactEmail: string | null;
    };

    authors: {
        fullName: string;
    }[];

    keywords: {
        keyword: {
            name: string;
        };
    }[];
};

const ARTICLE_SELECT = {
    id: true,
    slug: true,
    title: true,
    abstract: true,
    doi: true,
    publishedAt: true,
    updatedAt: true,

    journal: {
        select: {
            id: true,
            name: true,
            slug: true,
            issnOnline: true,
            issnPrint: true,
            contactEmail: true,
        },
    },

    authors: {
        select: {
            fullName: true,
        },
        orderBy: {
            sortOrder: "asc" as const,
        },
    },

    keywords: {
        select: {
            keyword: {
                select: {
                    name: true,
                },
            },
        },
    },
};

type ResumptionState = {
    offset: number;
    set?: string;
    from?: string;
    until?: string;
    issuedAt: number;
};

function encodeResumptionToken(state: ResumptionState): string {
    return Buffer.from(JSON.stringify(state), "utf8").toString(
        "base64url",
    );
}

function decodeResumptionToken(
    token: string,
): ResumptionState | null {
    try {
        const decoded = Buffer.from(token, "base64url").toString(
            "utf8",
        );

        const parsed = JSON.parse(decoded) as ResumptionState;

        if (
            typeof parsed.offset !== "number" ||
            typeof parsed.issuedAt !== "number"
        ) {
            return null;
        }

        if (Date.now() - parsed.issuedAt > RESUMPTION_TOKEN_TTL_MS) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function toUtcDatestamp(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function articleIdentifier(articleId: string): string {
    return `oai:${OAI_HOST}:${articleId}`;
}

function parseIdentifier(identifier: string): string | null {
    const prefix = `oai:${OAI_HOST}:`;

    if (!identifier.startsWith(prefix)) {
        return null;
    }

    const articleId = identifier.slice(prefix.length).trim();

    return articleId || null;
}

class OaiError extends Error {
    code: string;

    constructor(code: string, message: string) {
        super(message);
        this.code = code;
    }
}

function renderEnvelope(
    verb: string,
    requestParams: Record<string, string>,
    body: string,
): string {
    const responseDate = toUtcDatestamp(new Date());

    const attrs = Object.entries(requestParams)
        .map(
            ([key, value]) =>
                ` ${key}="${escapeXml(value)}"`,
        )
        .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request verb="${escapeXml(verb)}"${attrs}>${escapeXml(BASE_URL)}</request>
${body}
</OAI-PMH>
`;
}

function renderErrorEnvelope(
    requestParams: Record<string, string>,
    errors: OaiError[],
): string {
    const responseDate = toUtcDatestamp(new Date());

    const attrs = Object.entries(requestParams)
        .map(
            ([key, value]) =>
                ` ${key}="${escapeXml(value)}"`,
        )
        .join("");

    const body = errors
        .map(
            (error) =>
                `  <error code="${escapeXml(error.code)}">${escapeXml(error.message)}</error>`,
        )
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request${attrs}>${escapeXml(BASE_URL)}</request>
${body}
</OAI-PMH>
`;
}

function xmlResponse(xml: string, status = 200) {
    return new Response(xml, {
        status,
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
        },
    });
}

function renderDublinCore(article: OaiArticle): string {
    const canonicalUrl = `${siteUrl}/articles/${article.slug}`;

    const issn = article.journal.issnOnline || article.journal.issnPrint;

    const creators = article.authors
        .map(
            (author) =>
                `      <dc:creator>${escapeXml(author.fullName)}</dc:creator>`,
        )
        .join("\n");

    const subjects = article.keywords
        .map(
            (item) =>
                `      <dc:subject>${escapeXml(item.keyword.name)}</dc:subject>`,
        )
        .join("\n");

    const identifiers = [
        `      <dc:identifier>${escapeXml(canonicalUrl)}</dc:identifier>`,
        article.doi
            ? `      <dc:identifier>doi:${escapeXml(article.doi)}</dc:identifier>`
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    const date = article.publishedAt ?? article.updatedAt;

    return `    <metadata>
      <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
      <dc:title>${escapeXml(article.title)}</dc:title>
${creators}
      <dc:description>${escapeXml(article.abstract)}</dc:description>
      <dc:publisher>${escapeXml(article.journal.name)}</dc:publisher>
      <dc:date>${date.toISOString().split("T")[0]}</dc:date>
      <dc:type>text</dc:type>
      <dc:format>text/html</dc:format>
${identifiers}
${subjects}
      <dc:source>${escapeXml(article.journal.name)}${issn ? ` ISSN ${escapeXml(issn)}` : ""}</dc:source>
      <dc:language>en</dc:language>
      </oai_dc:dc>
    </metadata>`;
}

function renderRecord(article: OaiArticle): string {
    const header = `    <header>
      <identifier>${escapeXml(articleIdentifier(article.id))}</identifier>
      <datestamp>${toUtcDatestamp(article.updatedAt)}</datestamp>
      <setSpec>${escapeXml(article.journal.slug)}</setSpec>
    </header>`;

    return `  <record>
${header}
${renderDublinCore(article)}
  </record>`;
}

function requireMetadataPrefix(searchParams: URLSearchParams) {
    const metadataPrefix = searchParams.get("metadataPrefix");

    if (!metadataPrefix) {
        throw new OaiError(
            "badArgument",
            "The required metadataPrefix argument is missing.",
        );
    }

    if (metadataPrefix !== METADATA_PREFIX) {
        throw new OaiError(
            "cannotDisseminateFormat",
            `The metadata format "${metadataPrefix}" is not supported. Only "${METADATA_PREFIX}" is available.`,
        );
    }
}

async function handleIdentify(): Promise<string> {
    const [earliest, defaultJournal] = await Promise.all([
        prisma.article.findFirst({
            where: {
                status: "PUBLISHED",
            },
            orderBy: {
                publishedAt: "asc",
            },
            select: {
                publishedAt: true,
            },
        }),

        prisma.journal.findFirst({
            where: {
                isActive: true,
                contactEmail: {
                    not: null,
                },
            },
            orderBy: {
                createdAt: "asc",
            },
            select: {
                contactEmail: true,
            },
        }),
    ]);

    const earliestDatestamp = earliest?.publishedAt
        ? toUtcDatestamp(earliest.publishedAt)
        : "1970-01-01T00:00:00Z";

    const adminEmail =
        defaultJournal?.contactEmail ||
        process.env.OAI_ADMIN_EMAIL ||
        `admin@${OAI_HOST}`;

    return `  <Identify>
    <repositoryName>${escapeXml(REPOSITORY_NAME)}</repositoryName>
    <baseURL>${escapeXml(BASE_URL)}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>${escapeXml(adminEmail)}</adminEmail>
    <earliestDatestamp>${earliestDatestamp}</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
  </Identify>`;
}

function handleListMetadataFormats(): string {
    return `  <ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>${METADATA_PREFIX}</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>`;
}

async function handleListSets(): Promise<string> {
    const journals = await prisma.journal.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            name: "asc",
        },
        select: {
            slug: true,
            name: true,
        },
    });

    if (journals.length === 0) {
        throw new OaiError(
            "noSetHierarchy",
            "This repository does not support sets.",
        );
    }

    const sets = journals
        .map(
            (journal) => `    <set>
      <setSpec>${escapeXml(journal.slug)}</setSpec>
      <setName>${escapeXml(journal.name)}</setName>
    </set>`,
        )
        .join("\n");

    return `  <ListSets>
${sets}
  </ListSets>`;
}

async function handleGetRecord(
    searchParams: URLSearchParams,
): Promise<string> {
    requireMetadataPrefix(searchParams);

    const identifier = searchParams.get("identifier");

    if (!identifier) {
        throw new OaiError(
            "badArgument",
            "The required identifier argument is missing.",
        );
    }

    const articleId = parseIdentifier(identifier);

    if (!articleId) {
        throw new OaiError(
            "idDoesNotExist",
            "The identifier is not in a recognised format for this repository.",
        );
    }

    const article = await prisma.article.findFirst({
        where: {
            id: articleId,
            status: "PUBLISHED",
        },
        select: ARTICLE_SELECT,
    });

    if (!article) {
        throw new OaiError(
            "idDoesNotExist",
            "No matching published article was found for this identifier.",
        );
    }

    return `  <GetRecord>
${renderRecord(article)}
  </GetRecord>`;
}

async function handleListRecords(
    searchParams: URLSearchParams,
): Promise<string> {
    const resumptionToken = searchParams.get("resumptionToken");

    let offset = 0;
    let set: string | undefined;
    let from: string | undefined;
    let until: string | undefined;

    if (resumptionToken) {
        const state = decodeResumptionToken(resumptionToken);

        if (!state) {
            throw new OaiError(
                "badResumptionToken",
                "The resumption token is invalid or has expired.",
            );
        }

        offset = state.offset;
        set = state.set;
        from = state.from;
        until = state.until;
    } else {
        requireMetadataPrefix(searchParams);

        set = searchParams.get("set") || undefined;
        from = searchParams.get("from") || undefined;
        until = searchParams.get("until") || undefined;
    }

    const where = {
        status: "PUBLISHED" as const,

        ...(set
            ? {
                journal: {
                    slug: set,
                },
            }
            : {}),

        ...(from || until
            ? {
                publishedAt: {
                    ...(from ? { gte: new Date(from) } : {}),
                    ...(until ? { lte: new Date(until) } : {}),
                },
            }
            : {}),
    };

    const articles = await prisma.article.findMany({
        where,
        select: ARTICLE_SELECT,
        orderBy: {
            publishedAt: "asc",
        },
        skip: offset,
        take: PAGE_SIZE + 1,
    });

    if (articles.length === 0) {
        throw new OaiError(
            "noRecordsMatch",
            "No records match the given criteria.",
        );
    }

    const hasMore = articles.length > PAGE_SIZE;

    const page = hasMore
        ? articles.slice(0, PAGE_SIZE)
        : articles;

    const records = page.map(renderRecord).join("\n");

    const resumption = hasMore
        ? `    <resumptionToken>${encodeResumptionToken({
            offset: offset + PAGE_SIZE,
            set,
            from,
            until,
            issuedAt: Date.now(),
        })}</resumptionToken>`
        : offset > 0
            ? "    <resumptionToken/>"
            : "";

    return `  <ListRecords>
${records}
${resumption}
  </ListRecords>`;
}

async function dispatch(
    verb: string,
    searchParams: URLSearchParams,
): Promise<string> {
    switch (verb) {
        case "Identify":
            return handleIdentify();

        case "ListMetadataFormats":
            return handleListMetadataFormats();

        case "ListSets":
            return handleListSets();

        case "GetRecord":
            return handleGetRecord(searchParams);

        case "ListRecords":
            return handleListRecords(searchParams);

        default:
            throw new OaiError(
                "badVerb",
                `The verb "${verb}" is not a legal OAI-PMH verb.`,
            );
    }
}

async function handleOaiRequest(searchParams: URLSearchParams) {
    const verb = searchParams.get("verb") || "";

    const requestParams: Record<string, string> = {};

    searchParams.forEach((value, key) => {
        if (key !== "verb") {
            requestParams[key] = value;
        }
    });

    if (!verb) {
        return xmlResponse(
            renderErrorEnvelope(requestParams, [
                new OaiError(
                    "badVerb",
                    "The request is missing the required verb argument.",
                ),
            ]),
            400,
        );
    }

    /*
     * A legal verb is echoed back as a request attribute even on
     * error, per the OAI-PMH spec. Only a missing/unrecognised
     * verb omits it (handled above).
     */
    const errorRequestParams = {
        verb,
        ...requestParams,
    };

    try {
        const body = await dispatch(verb, searchParams);

        return xmlResponse(
            renderEnvelope(verb, requestParams, body),
        );
    } catch (error) {
        if (error instanceof OaiError) {
            return xmlResponse(
                renderErrorEnvelope(errorRequestParams, [error]),
                400,
            );
        }

        return xmlResponse(
            renderErrorEnvelope(errorRequestParams, [
                new OaiError(
                    "badArgument",
                    "The request could not be processed.",
                ),
            ]),
            400,
        );
    }
}

export async function GET(request: NextRequest) {
    return handleOaiRequest(request.nextUrl.searchParams);
}

export async function POST(request: NextRequest) {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await request.text();

        return handleOaiRequest(new URLSearchParams(body));
    }

    return handleOaiRequest(request.nextUrl.searchParams);
}
