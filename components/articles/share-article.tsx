"use client";

import { Mail, Link2 } from "lucide-react";

import { toast } from "@/components/ui/toast";

type ShareArticleProps = {
    articleTitle: string;
    articleUrl: string;
    journalName: string;
    doi?: string | null;
};

function WhatsAppIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.44 1.27 4.89L2 22l5.25-1.38a9.96 9.96 0 0 0 4.79 1.22h.01c5.52 0 10-4.48 10-10s-4.49-9.84-10.01-9.84Zm0 18.06h-.01a8.3 8.3 0 0 1-4.24-1.16l-.3-.18-3.11.82.83-3.03-.2-.31a8.25 8.25 0 0 1-1.27-4.4c0-4.56 3.72-8.28 8.31-8.28 2.22 0 4.3.87 5.87 2.44a8.22 8.22 0 0 1 2.43 5.85c0 4.56-3.73 8.25-8.31 8.25Zm4.55-6.19c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.65-1.23-1.46-1.38-1.71-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.24.24-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01a.93.93 0 0 0-.67.31c-.23.24-.87.85-.87 2.08s.89 2.42 1.02 2.58c.12.16 1.75 2.67 4.24 3.75.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z" />
        </svg>
    );
}

function LinkedInIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M18.24 2.5h3.3l-7.2 8.23L23 21.5h-6.62l-5.18-6.77-5.93 6.77H2l7.7-8.8L2 2.5h6.79l4.68 6.19 4.77-6.19Zm-1.16 17h1.83L7.02 4.4H5.06l12.02 15.1Z" />
        </svg>
    );
}

const buttonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-blue-700 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2";

export default function ShareArticle({
    articleTitle,
    articleUrl,
    journalName,
    doi,
}: ShareArticleProps) {
    const encodedUrl = encodeURIComponent(articleUrl);

    const shareText = encodeURIComponent(`${articleTitle} — ${journalName}`);

    const emailSubject = encodeURIComponent(articleTitle);

    const emailBody = encodeURIComponent(
        [
            `I thought you might find this article interesting:`,
            "",
            articleTitle,
            journalName,
            doi ? `DOI: https://doi.org/${doi}` : null,
            "",
            articleUrl,
        ]
            .filter((line) => line !== null)
            .join("\n"),
    );

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(articleUrl);

            toast.add({
                title: "Link copied",
                description: "The article link has been copied to your clipboard.",
                type: "success",
            });
        } catch {
            toast.add({
                title: "Unable to copy link",
                description: "Copy the link manually from your browser's address bar.",
                type: "error",
            });
        }
    }

    return (
        <div
            role="group"
            aria-label="Share this article"
            className="flex flex-wrap items-center gap-2.5"
        >
            <a
                href={`https://wa.me/?text=${shareText}%20${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass}
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
            >
                <WhatsAppIcon />
                <span>WhatsApp</span>
            </a>

            <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass}
                aria-label="Share on LinkedIn"
                title="Share on LinkedIn"
            >
                <LinkedInIcon />
                <span>LinkedIn</span>
            </a>

            <a
                href={`https://x.com/intent/tweet?text=${shareText}&url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass}
                aria-label="Share on X"
                title="Share on X"
            >
                <XIcon />
                <span>X</span>
            </a>

            <a
                href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                className={buttonClass}
                aria-label="Share by email"
                title="Share by email"
            >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>Email</span>
            </a>

            <button
                type="button"
                onClick={copyLink}
                className={buttonClass}
                aria-label="Copy article link"
                title="Copy article link"
            >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                <span>Copy Link</span>
            </button>
        </div>
    );
}
