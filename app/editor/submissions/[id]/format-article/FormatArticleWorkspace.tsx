"use client";

import { useState } from "react";

import {
    ArticleTemplate,
    type ArticleTemplateMetadata,
} from "@/components/article-template/ArticleTemplate";
import type {
    FormattedArticleContent,
    RawArticleAuthorInput,
    RawArticleFormattingInput,
} from "@/lib/ai/format-article";

import {
    approveFormattedArticle,
    generateFormattedArticle,
} from "./actions";

type WorkspaceProps = {
    submissionId: string;
    hasExistingArticle: boolean;
    initialInput: RawArticleFormattingInput;
    metadataPreview: ArticleTemplateMetadata;
};

function paragraphsToText(paragraphs: string[]): string {
    return paragraphs.join("\n\n");
}

function textToParagraphs(value: string): string[] {
    return value
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
}

function rowsToText(rows: string[][]): string {
    return rows.map((row) => row.join(" | ")).join("\n");
}

function textToRows(value: string): string[][] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split("|").map((cell) => cell.trim()));
}

function listToText(values: string[]): string {
    return values.join("\n");
}

function textToList(value: string): string[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

export default function FormatArticleWorkspace({
    submissionId,
    hasExistingArticle,
    initialInput,
    metadataPreview,
}: WorkspaceProps) {
    const [input, setInput] =
        useState<RawArticleFormattingInput>(initialInput);
    const [generated, setGenerated] =
        useState<FormattedArticleContent | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [approvedFileId, setApprovedFileId] = useState<
        string | null
    >(null);

    function updateAuthor(
        index: number,
        patch: Partial<RawArticleAuthorInput>,
    ) {
        setInput((current) => ({
            ...current,
            authors: current.authors.map((author, i) =>
                i === index ? { ...author, ...patch } : author,
            ),
        }));
    }

    function addAuthor() {
        setInput((current) => ({
            ...current,
            authors: [
                ...current.authors,
                {
                    fullName: "",
                    affiliation: "",
                    orcid: "",
                    isCorresponding: false,
                },
            ],
        }));
    }

    function removeAuthor(index: number) {
        setInput((current) => ({
            ...current,
            authors: current.authors.filter(
                (_, i) => i !== index,
            ),
        }));
    }

    async function handleGenerate() {
        setError(null);
        setIsGenerating(true);

        try {
            const result = await generateFormattedArticle(
                submissionId,
                input,
            );

            setGenerated(result);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "The article could not be formatted.",
            );
        } finally {
            setIsGenerating(false);
        }
    }

    async function handleApprove() {
        if (!generated) {
            return;
        }

        setError(null);
        setIsApproving(true);

        try {
            const result = await approveFormattedArticle({
                submissionId,
                content: generated,
            });

            setApprovedFileId(result.productionFileId);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "The formatted article could not be approved.",
            );
        } finally {
            setIsApproving(false);
        }
    }

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-6 rounded-xl border bg-white p-6">
                <h2 className="text-xl font-semibold">
                    Manuscript Content
                </h2>

                {hasExistingArticle && (
                    <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                        This article is already published.
                        Approving here will replace its final
                        galley file with a newly generated one.
                    </p>
                )}

                <div>
                    <label
                        htmlFor="title"
                        className="mb-1 block text-sm font-semibold"
                    >
                        Title
                    </label>

                    <input
                        id="title"
                        className="w-full rounded border p-2"
                        value={input.title}
                        onChange={(event) =>
                            setInput((current) => ({
                                ...current,
                                title: event.target.value,
                            }))
                        }
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                            Authors
                        </span>

                        <button
                            type="button"
                            onClick={addAuthor}
                            className="text-sm text-blue-700 hover:underline"
                        >
                            + Add author
                        </button>
                    </div>

                    {input.authors.map((author, index) => (
                        <div
                            key={index}
                            className="space-y-2 rounded border p-3"
                        >
                            <input
                                className="w-full rounded border p-2 text-sm"
                                placeholder="Full name"
                                value={author.fullName}
                                onChange={(event) =>
                                    updateAuthor(index, {
                                        fullName:
                                            event.target
                                                .value,
                                    })
                                }
                            />

                            <input
                                className="w-full rounded border p-2 text-sm"
                                placeholder="Affiliation"
                                value={author.affiliation}
                                onChange={(event) =>
                                    updateAuthor(index, {
                                        affiliation:
                                            event.target
                                                .value,
                                    })
                                }
                            />

                            <input
                                className="w-full rounded border p-2 text-sm"
                                placeholder="ORCID iD (optional)"
                                value={author.orcid}
                                onChange={(event) =>
                                    updateAuthor(index, {
                                        orcid: event.target
                                            .value,
                                    })
                                }
                            />

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={
                                        author.isCorresponding
                                    }
                                    onChange={(event) =>
                                        updateAuthor(index, {
                                            isCorresponding:
                                                event.target
                                                    .checked,
                                        })
                                    }
                                />
                                Corresponding author
                            </label>

                            {input.authors.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        removeAuthor(index)
                                    }
                                    className="text-xs text-red-700 hover:underline"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div>
                    <label
                        htmlFor="abstract"
                        className="mb-1 block text-sm font-semibold"
                    >
                        Abstract
                    </label>

                    <textarea
                        id="abstract"
                        rows={5}
                        className="w-full rounded border p-2 text-sm"
                        value={input.abstract}
                        onChange={(event) =>
                            setInput((current) => ({
                                ...current,
                                abstract: event.target.value,
                            }))
                        }
                    />
                </div>

                <div>
                    <label
                        htmlFor="keywords"
                        className="mb-1 block text-sm font-semibold"
                    >
                        Keywords (comma-separated)
                    </label>

                    <input
                        id="keywords"
                        className="w-full rounded border p-2 text-sm"
                        value={input.keywords}
                        onChange={(event) =>
                            setInput((current) => ({
                                ...current,
                                keywords: event.target.value,
                            }))
                        }
                    />
                </div>

                <div>
                    <label
                        htmlFor="body"
                        className="mb-1 block text-sm font-semibold"
                    >
                        Body text
                    </label>

                    <textarea
                        id="body"
                        rows={12}
                        className="w-full rounded border p-2 font-mono text-sm"
                        placeholder="Paste the full manuscript body. Section breaks (Introduction, Methods, Results, ...) don't need to be pre-formatted — the AI will arrange them."
                        value={input.body}
                        onChange={(event) =>
                            setInput((current) => ({
                                ...current,
                                body: event.target.value,
                            }))
                        }
                    />
                </div>

                <div>
                    <label
                        htmlFor="tables"
                        className="mb-1 block text-sm font-semibold"
                    >
                        Tables (raw text, optional)
                    </label>

                    <textarea
                        id="tables"
                        rows={4}
                        className="w-full rounded border p-2 font-mono text-sm"
                        value={input.tables}
                        onChange={(event) =>
                            setInput((current) => ({
                                ...current,
                                tables: event.target.value,
                            }))
                        }
                    />
                </div>

                <div>
                    <label
                        htmlFor="figures"
                        className="mb-1 block text-sm font-semibold"
                    >
                        Figures (captions/descriptions, optional)
                    </label>

                    <textarea
                        id="figures"
                        rows={3}
                        className="w-full rounded border p-2 font-mono text-sm"
                        value={input.figures}
                        onChange={(event) =>
                            setInput((current) => ({
                                ...current,
                                figures: event.target.value,
                            }))
                        }
                    />
                </div>

                <div>
                    <label
                        htmlFor="references"
                        className="mb-1 block text-sm font-semibold"
                    >
                        References (one per line)
                    </label>

                    <textarea
                        id="references"
                        rows={8}
                        className="w-full rounded border p-2 font-mono text-sm"
                        value={input.references}
                        onChange={(event) =>
                            setInput((current) => ({
                                ...current,
                                references: event.target.value,
                            }))
                        }
                    />
                </div>

                {error && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                    {isGenerating
                        ? "Generating…"
                        : "Generate Formatted Article"}
                </button>
            </section>

            <section className="space-y-4">
                {!generated ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed p-10 text-center text-gray-500">
                        The formatted preview will appear here
                        after you click &quot;Generate Formatted
                        Article&quot;.
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border bg-white p-4">
                            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                                Correct before approving
                            </h3>

                            <EditableContent
                                content={generated}
                                onChange={setGenerated}
                            />
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto rounded-xl border bg-white p-8">
                            <ArticleTemplate
                                content={generated}
                                metadata={metadataPreview}
                            />
                        </div>

                        {approvedFileId ? (
                            <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                                Formatted article approved and
                                saved as the final galley file.
                                It will be used automatically
                                when this submission is
                                published.
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="w-full rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                            >
                                {isApproving
                                    ? "Saving…"
                                    : "Approve as Final Galley PDF"}
                            </button>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

function EditableContent({
    content,
    onChange,
}: {
    content: FormattedArticleContent;
    onChange: (content: FormattedArticleContent) => void;
}) {
    return (
        <div className="space-y-4 text-sm">
            <div>
                <label className="mb-1 block font-semibold">
                    Title
                </label>

                <input
                    className="w-full rounded border p-2"
                    value={content.title}
                    onChange={(event) =>
                        onChange({
                            ...content,
                            title: event.target.value,
                        })
                    }
                />
            </div>

            <div>
                <label className="mb-1 block font-semibold">
                    Abstract
                </label>

                <textarea
                    rows={4}
                    className="w-full rounded border p-2"
                    value={content.abstract}
                    onChange={(event) =>
                        onChange({
                            ...content,
                            abstract: event.target.value,
                        })
                    }
                />
            </div>

            <div>
                <label className="mb-1 block font-semibold">
                    Keywords (comma-separated)
                </label>

                <input
                    className="w-full rounded border p-2"
                    value={content.keywords.join(", ")}
                    onChange={(event) =>
                        onChange({
                            ...content,
                            keywords: event.target.value
                                .split(",")
                                .map((k) => k.trim())
                                .filter(Boolean),
                        })
                    }
                />
            </div>

            <div className="space-y-3">
                <span className="block font-semibold">
                    Sections
                </span>

                {content.sections.map((section, index) => (
                    <div
                        key={index}
                        className="space-y-2 rounded border p-3"
                    >
                        <div className="flex gap-2">
                            <input
                                className="flex-1 rounded border p-2"
                                value={section.heading}
                                onChange={(event) =>
                                    onChange({
                                        ...content,
                                        sections:
                                            content.sections.map(
                                                (s, i) =>
                                                    i === index
                                                        ? {
                                                              ...s,
                                                              heading:
                                                                  event
                                                                      .target
                                                                      .value,
                                                          }
                                                        : s,
                                            ),
                                    })
                                }
                            />

                            <select
                                className="rounded border p-2"
                                value={section.level}
                                onChange={(event) =>
                                    onChange({
                                        ...content,
                                        sections:
                                            content.sections.map(
                                                (s, i) =>
                                                    i === index
                                                        ? {
                                                              ...s,
                                                              level: Number(
                                                                  event
                                                                      .target
                                                                      .value,
                                                              ) as
                                                                  | 1
                                                                  | 2,
                                                          }
                                                        : s,
                                            ),
                                    })
                                }
                            >
                                <option value={1}>
                                    Heading
                                </option>
                                <option value={2}>
                                    Subheading
                                </option>
                            </select>
                        </div>

                        <textarea
                            rows={4}
                            className="w-full rounded border p-2"
                            value={paragraphsToText(
                                section.paragraphs,
                            )}
                            onChange={(event) =>
                                onChange({
                                    ...content,
                                    sections:
                                        content.sections.map(
                                            (s, i) =>
                                                i === index
                                                    ? {
                                                          ...s,
                                                          paragraphs:
                                                              textToParagraphs(
                                                                  event
                                                                      .target
                                                                      .value,
                                                              ),
                                                      }
                                                    : s,
                                        ),
                                })
                            }
                        />

                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...content,
                                    sections:
                                        content.sections.filter(
                                            (_, i) =>
                                                i !== index,
                                        ),
                                })
                            }
                            className="text-xs text-red-700 hover:underline"
                        >
                            Remove section
                        </button>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <span className="block font-semibold">
                    Tables
                </span>

                {content.tables.map((table, index) => (
                    <div
                        key={index}
                        className="space-y-2 rounded border p-3"
                    >
                        <input
                            className="w-full rounded border p-2"
                            placeholder="Caption"
                            value={table.caption}
                            onChange={(event) =>
                                onChange({
                                    ...content,
                                    tables: content.tables.map(
                                        (t, i) =>
                                            i === index
                                                ? {
                                                      ...t,
                                                      caption:
                                                          event
                                                              .target
                                                              .value,
                                                  }
                                                : t,
                                    ),
                                })
                            }
                        />

                        <input
                            className="w-full rounded border p-2"
                            placeholder="Headers (comma-separated)"
                            value={table.headers.join(", ")}
                            onChange={(event) =>
                                onChange({
                                    ...content,
                                    tables: content.tables.map(
                                        (t, i) =>
                                            i === index
                                                ? {
                                                      ...t,
                                                      headers:
                                                          event.target.value
                                                              .split(
                                                                  ",",
                                                              )
                                                              .map(
                                                                  (
                                                                      h,
                                                                  ) =>
                                                                      h.trim(),
                                                              )
                                                              .filter(
                                                                  Boolean,
                                                              ),
                                                  }
                                                : t,
                                    ),
                                })
                            }
                        />

                        <textarea
                            rows={3}
                            className="w-full rounded border p-2 font-mono"
                            placeholder="Rows — one per line, cells separated by |"
                            value={rowsToText(table.rows)}
                            onChange={(event) =>
                                onChange({
                                    ...content,
                                    tables: content.tables.map(
                                        (t, i) =>
                                            i === index
                                                ? {
                                                      ...t,
                                                      rows: textToRows(
                                                          event
                                                              .target
                                                              .value,
                                                      ),
                                                  }
                                                : t,
                                    ),
                                })
                            }
                        />

                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...content,
                                    tables: content.tables.filter(
                                        (_, i) => i !== index,
                                    ),
                                })
                            }
                            className="text-xs text-red-700 hover:underline"
                        >
                            Remove table
                        </button>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <span className="block font-semibold">
                    Figures
                </span>

                {content.figures.map((figure, index) => (
                    <div
                        key={index}
                        className="space-y-2 rounded border p-3"
                    >
                        <input
                            className="w-full rounded border p-2"
                            placeholder="Caption"
                            value={figure.caption}
                            onChange={(event) =>
                                onChange({
                                    ...content,
                                    figures: content.figures.map(
                                        (f, i) =>
                                            i === index
                                                ? {
                                                      ...f,
                                                      caption:
                                                          event
                                                              .target
                                                              .value,
                                                  }
                                                : f,
                                    ),
                                })
                            }
                        />

                        <input
                            className="w-full rounded border p-2"
                            placeholder="Note (optional)"
                            value={figure.note}
                            onChange={(event) =>
                                onChange({
                                    ...content,
                                    figures: content.figures.map(
                                        (f, i) =>
                                            i === index
                                                ? {
                                                      ...f,
                                                      note: event
                                                          .target
                                                          .value,
                                                  }
                                                : f,
                                    ),
                                })
                            }
                        />

                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...content,
                                    figures:
                                        content.figures.filter(
                                            (_, i) =>
                                                i !== index,
                                        ),
                                })
                            }
                            className="text-xs text-red-700 hover:underline"
                        >
                            Remove figure
                        </button>
                    </div>
                ))}
            </div>

            <div>
                <label className="mb-1 block font-semibold">
                    References (one per line)
                </label>

                <textarea
                    rows={8}
                    className="w-full rounded border p-2"
                    value={listToText(content.references)}
                    onChange={(event) =>
                        onChange({
                            ...content,
                            references: textToList(
                                event.target.value,
                            ),
                        })
                    }
                />
            </div>
        </div>
    );
}
