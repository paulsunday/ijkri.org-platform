"use client";

import { useState } from "react";

type ArticleActionsProps = {
    doi?: string | null;
    pdfUrl?: string | null;
};

export default function ArticleActions({
    doi,
    pdfUrl,
}: ArticleActionsProps) {
    const [message, setMessage] = useState("");

    function showMessage(value: string) {
        setMessage(value);

        window.setTimeout(() => {
            setMessage("");
        }, 2500);
    }

    async function copyText(
        value: string,
        successMessage: string,
    ) {
        try {
            await navigator.clipboard.writeText(value);
            showMessage(successMessage);
        } catch {
            showMessage("Unable to copy automatically.");
        }
    }

    function scrollToCitation() {
        const citationSection =
            document.getElementById("how-to-cite");

        citationSection?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    return (
        <div className="mt-6 border-t pt-6">
            <div className="flex flex-wrap items-center gap-3">
                {pdfUrl && (
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                    >
                        Download PDF
                    </a>
                )}

                <button
                    type="button"
                    onClick={scrollToCitation}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:border-blue-700 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                    Cite
                </button>

                {doi && (
                    <button
                        type="button"
                        onClick={() =>
                            copyText(
                                `https://doi.org/${doi}`,
                                "DOI copied.",
                            )
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:border-blue-700 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                    >
                        Copy DOI
                    </button>
                )}

                {doi && (
                    <a
                        href={`https://doi.org/${doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:border-blue-700 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                    >
                        Open DOI
                    </a>
                )}
            </div>

            <div
                aria-live="polite"
                className="mt-3 min-h-5 text-sm font-medium text-emerald-700"
            >
                {message}
            </div>
        </div>
    );
}
