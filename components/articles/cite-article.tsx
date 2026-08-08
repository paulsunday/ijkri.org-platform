"use client";

import { useMemo, useState } from "react";

import { toast } from "@/components/ui/toast";
import {
    CITATION_FORMATS,
    formatCitation,
    type ArticleCitationData,
    type CitationFormatId,
} from "@/lib/citations";

type CiteArticleProps = {
    citationData: ArticleCitationData;
    fileBaseName: string;
};

function downloadTextFile(
    filename: string,
    content: string,
    mimeType: string,
) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function formatButtonClass(active: boolean) {
    return active
        ? "inline-flex min-h-9 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        : "inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-blue-700 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2";
}

const secondaryButtonClass =
    "inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:border-blue-700 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2";

export default function CiteArticle({
    citationData,
    fileBaseName,
}: CiteArticleProps) {
    const [format, setFormat] = useState<CitationFormatId>("apa");

    const citations = useMemo(() => {
        const entries = CITATION_FORMATS.map(
            ({ id }) => [id, formatCitation(id, citationData)] as const,
        );

        return Object.fromEntries(entries) as Record<CitationFormatId, string>;
    }, [citationData]);

    const activeCitation = citations[format];

    const copyLabel =
        format === "bibtex"
            ? "Copy BibTeX"
            : format === "ris"
                ? "Copy RIS"
                : "Copy Citation";

    async function copyActiveCitation() {
        try {
            await navigator.clipboard.writeText(activeCitation);

            toast.add({
                title: `${copyLabel.replace("Copy ", "")} copied`,
                description: "The citation has been copied to your clipboard.",
                type: "success",
            });
        } catch {
            toast.add({
                title: "Unable to copy citation",
                description: "Select and copy the citation text manually.",
                type: "error",
            });
        }
    }

    function downloadActiveCitation(extension: "bib" | "ris") {
        const mimeType =
            extension === "bib"
                ? "application/x-bibtex"
                : "application/x-research-info-systems";

        downloadTextFile(
            `${fileBaseName}.${extension}`,
            activeCitation,
            mimeType,
        );
    }

    return (
        <div>
            <div
                role="tablist"
                aria-label="Citation format"
                className="flex flex-wrap gap-2"
            >
                {CITATION_FORMATS.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={format === id}
                        onClick={() => setFormat(id)}
                        className={formatButtonClass(format === id)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="mt-5 rounded-lg bg-gray-50 p-5">
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-gray-800">
                    {activeCitation}
                </pre>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={copyActiveCitation}
                    className={secondaryButtonClass}
                >
                    {copyLabel}
                </button>

                {format === "bibtex" && (
                    <button
                        type="button"
                        onClick={() => downloadActiveCitation("bib")}
                        className={secondaryButtonClass}
                    >
                        Download BibTeX
                    </button>
                )}

                {format === "ris" && (
                    <button
                        type="button"
                        onClick={() => downloadActiveCitation("ris")}
                        className={secondaryButtonClass}
                    >
                        Download RIS
                    </button>
                )}
            </div>
        </div>
    );
}
