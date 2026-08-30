import "server-only";

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";

export type FormattedArticleAuthor = {
    fullName: string;
    affiliation: string;
    orcid: string | null;
    isCorresponding: boolean;
};

export type FormattedArticleSection = {
    heading: string;
    level: 1 | 2;
    paragraphs: string[];
};

export type FormattedArticleTable = {
    caption: string;
    headers: string[];
    rows: string[][];
};

export type FormattedArticleFigure = {
    caption: string;
    note: string;
};

export type FormattedArticleContent = {
    title: string;
    authors: FormattedArticleAuthor[];
    abstract: string;
    keywords: string[];
    sections: FormattedArticleSection[];
    tables: FormattedArticleTable[];
    figures: FormattedArticleFigure[];
    references: string[];

    /**
     * Rich-HTML alternative to `abstract`/`sections`+`tables`+`figures`,
     * produced by the in-journal production editor (see
     * app/typesetter/assignments/[id]/production-editor) rather than the
     * AI formatter. When set, ArticleTemplate renders these directly
     * instead of the plain-text/structured fields above, preserving the
     * typesetter's own formatting (headings, lists, tables, images,
     * superscript/subscript, etc.) instead of forcing it through the
     * AI tool's plain-paragraph section model.
     */
    abstractHtml?: string;
    bodyHtml?: string;
};

export type RawArticleAuthorInput = {
    fullName: string;
    affiliation: string;
    orcid: string;
    isCorresponding: boolean;
};

export type RawArticleFormattingInput = {
    title: string;
    authors: RawArticleAuthorInput[];
    abstract: string;
    keywords: string;
    body: string;
    tables: string;
    figures: string;
    references: string;
};

const AUTHOR_SCHEMA = {
    type: "object",
    properties: {
        fullName: { type: "string" },
        affiliation: { type: "string" },
        orcid: { type: ["string", "null"] },
        isCorresponding: { type: "boolean" },
    },
    required: [
        "fullName",
        "affiliation",
        "orcid",
        "isCorresponding",
    ],
    additionalProperties: false,
} as const;

const SECTION_SCHEMA = {
    type: "object",
    properties: {
        heading: { type: "string" },
        level: { type: "integer", enum: [1, 2] },
        paragraphs: {
            type: "array",
            items: { type: "string" },
        },
    },
    required: ["heading", "level", "paragraphs"],
    additionalProperties: false,
} as const;

const TABLE_SCHEMA = {
    type: "object",
    properties: {
        caption: { type: "string" },
        headers: {
            type: "array",
            items: { type: "string" },
        },
        rows: {
            type: "array",
            items: {
                type: "array",
                items: { type: "string" },
            },
        },
    },
    required: ["caption", "headers", "rows"],
    additionalProperties: false,
} as const;

const FIGURE_SCHEMA = {
    type: "object",
    properties: {
        caption: { type: "string" },
        note: { type: "string" },
    },
    required: ["caption", "note"],
    additionalProperties: false,
} as const;

const ARTICLE_CONTENT_SCHEMA = {
    type: "object",
    properties: {
        title: { type: "string" },
        authors: {
            type: "array",
            items: AUTHOR_SCHEMA,
        },
        abstract: { type: "string" },
        keywords: {
            type: "array",
            items: { type: "string" },
        },
        sections: {
            type: "array",
            items: SECTION_SCHEMA,
        },
        tables: {
            type: "array",
            items: TABLE_SCHEMA,
        },
        figures: {
            type: "array",
            items: FIGURE_SCHEMA,
        },
        references: {
            type: "array",
            items: { type: "string" },
        },
    },
    required: [
        "title",
        "authors",
        "abstract",
        "keywords",
        "sections",
        "tables",
        "figures",
        "references",
    ],
    additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a journal typesetting assistant for the International Journal of Knowledge, Research and Innovation (IJKRI).

You will be given an author's raw, unformatted submission content. Your job is to ARRANGE it into a clean, structured, and consistent shape for the journal's fixed house template.

Rules you must follow exactly:
- Do not change the academic meaning, research findings, data, statistics, or conclusions.
- Do not invent, remove, or reorder authors. Preserve every author's name exactly as given.
- Do not alter citations or references beyond formatting/cleanup (whitespace, punctuation, consistent style) and alphabetical ordering. Never invent a reference that was not supplied, and never drop one that was.
- Do not invent a DOI, ORCID iD, page number, or any other metadata not present in the input.
- You MAY: fix obvious typos and grammar, normalize heading capitalization and numbering, split run-on body text into logical sections/paragraphs, tidy table formatting, and write neutral one-line figure notes when the author's figure description is terse.
- Body sections should be split at natural headings the author already implies (e.g. Introduction, Literature Review, Methodology, Results, Discussion, Conclusion) using level 1, with any sub-headings as level 2.
- If the author supplied no tables, figures, or a field is empty, return an empty array or empty string for it rather than fabricating content.`;

function buildUserPrompt(
    input: RawArticleFormattingInput,
): string {
    const authorsText = input.authors
        .map(
            (author, index) =>
                `${index + 1}. ${author.fullName} — ${author.affiliation || "(no affiliation given)"}${author.orcid ? ` — ORCID: ${author.orcid}` : ""}${author.isCorresponding ? " (corresponding author)" : ""}`,
        )
        .join("\n");

    return `Arrange the following manuscript content into the structured format.

TITLE:
${input.title}

AUTHORS:
${authorsText || "(none supplied)"}

ABSTRACT:
${input.abstract}

KEYWORDS (comma-separated, as supplied):
${input.keywords}

BODY (raw, may contain informal section breaks):
${input.body}

TABLES (raw, as supplied by the author — may be plain text or delimited):
${input.tables || "(none supplied)"}

FIGURES (raw captions/descriptions, as supplied):
${input.figures || "(none supplied)"}

REFERENCES (raw list, one per line or however supplied):
${input.references || "(none supplied)"}`;
}

export async function formatArticleContent(
    input: RawArticleFormattingInput,
): Promise<FormattedArticleContent> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error(
            "ANTHROPIC_API_KEY is not configured.",
        );
    }

    const client = new Anthropic({
        apiKey,
    });

    const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        thinking: {
            type: "adaptive",
        },
        output_config: {
            format: {
                type: "json_schema",
                schema: ARTICLE_CONTENT_SCHEMA,
            },
        },
        messages: [
            {
                role: "user",
                content: buildUserPrompt(input),
            },
        ],
    });

    if (response.stop_reason === "refusal") {
        throw new Error(
            "The AI declined to format this content. Please review the submitted text and try again.",
        );
    }

    if (!response.parsed_output) {
        throw new Error(
            "The AI response could not be parsed into the expected format.",
        );
    }

    return response.parsed_output as FormattedArticleContent;
}
