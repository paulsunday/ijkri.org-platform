import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

const JOURNAL_ACCESS_ROLES = [
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "COPYEDITOR",
    "TYPESETTER",
    "PROOFREADER",
] as const;

function getPathname(fileUrl: string): string {
    const url = new URL(fileUrl);

    return decodeURIComponent(
        url.pathname.replace(/^\/+/, ""),
    );
}

function safeFilename(fileName: string): string {
    const cleaned = fileName
        .replace(/[\r\n"]/g, "")
        .trim();

    return cleaned || "document";
}

function encodedFilename(fileName: string): string {
    return encodeURIComponent(fileName).replace(
        /['()*]/g,
        (character) =>
            `%${character
                .charCodeAt(0)
                .toString(16)
                .toUpperCase()}`,
    );
}

export async function GET(
    _request: Request,
    { params }: RouteContext,
) {
    const { id } = await params;

    if (!id) {
        return new NextResponse(
            "Production file ID is missing.",
            {
                status: 400,
            },
        );
    }

    const file =
        await prisma.productionFile.findUnique({
            where: {
                id,
            },

            select: {
                id: true,
                fileName: true,
                fileUrl: true,
                mimeType: true,
                fileType: true,
                isFinal: true,

                submission: {
                    select: {
                        id: true,
                        authorId: true,
                        journalId: true,
                    },
                },

                productionAssignment: {
                    select: {
                        assigneeId: true,
                        assignedById: true,
                    },
                },
            },
        });

    if (!file) {
        return new NextResponse(
            "File not found.",
            {
                status: 404,
            },
        );
    }

    /*
     * A file is publicly viewable when it belongs to
     * an article whose status is PUBLISHED.
     */
    const publishedArticle =
        await prisma.article.findUnique({
            where: {
                submissionId:
                    file.submission.id,
            },

            select: {
                id: true,
                status: true,
                pdfUrl: true,
            },
        });

    const isPubliclyAvailable =
        publishedArticle?.status ===
        "PUBLISHED";

    /*
     * Unpublished production files remain protected.
     * Published article PDFs can be opened by anyone,
     * including readers and Google Scholar.
     */
    if (!isPubliclyAvailable) {
        const user = await getCurrentUser();

        if (!user) {
            return new NextResponse(
                "Authentication required.",
                {
                    status: 401,
                },
            );
        }

        const isSuperAdmin =
            user.roles.some(
                (role) =>
                    role.role ===
                    "SUPER_ADMIN",
            );

        const isAuthor =
            file.submission.authorId ===
            user.id;

        const isAssignee =
            file.productionAssignment
                ?.assigneeId === user.id;

        const isAssigningEditor =
            file.productionAssignment
                ?.assignedById === user.id;

        const hasJournalAccess =
            user.roles.some(
                (role) =>
                    role.journalId ===
                    file.submission
                        .journalId &&
                    JOURNAL_ACCESS_ROLES.some(
                        (allowedRole) =>
                            allowedRole ===
                            role.role,
                    ),
            );

        if (
            !isSuperAdmin &&
            !isAuthor &&
            !isAssignee &&
            !isAssigningEditor &&
            !hasJournalAccess
        ) {
            return new NextResponse(
                "Forbidden.",
                {
                    status: 403,
                },
            );
        }
    }

    let pathname: string;

    try {
        pathname = getPathname(file.fileUrl);
    } catch {
        return new NextResponse(
            "The stored file URL is invalid.",
            {
                status: 500,
            },
        );
    }

    const result = await get(pathname, {
        access: "private",
    });

    if (
        !result ||
        result.statusCode !== 200 ||
        !result.stream
    ) {
        return new NextResponse(
            "Stored file was not found.",
            {
                status: 404,
            },
        );
    }

    const fileName = safeFilename(
        file.fileName,
    );

    const contentType =
        result.blob.contentType ||
        file.mimeType ||
        "application/octet-stream";

    const isPdf =
        contentType === "application/pdf" ||
        fileName
            .toLowerCase()
            .endsWith(".pdf");

    /*
     * PDFs open inside the browser.
     * DOCX and other formats download normally.
     */
    const disposition = isPdf
        ? "inline"
        : "attachment";

    const headers = new Headers();

    headers.set(
        "Content-Type",
        isPdf
            ? "application/pdf"
            : contentType,
    );

    headers.set(
        "Content-Disposition",
        `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodedFilename(
            fileName,
        )}`,
    );

    headers.set(
        "X-Content-Type-Options",
        "nosniff",
    );

    headers.set(
        "Cache-Control",
        isPubliclyAvailable
            ? "public, max-age=3600, s-maxage=86400"
            : "private, no-store, max-age=0",
    );

    if (result.blob.size) {
        headers.set(
            "Content-Length",
            String(result.blob.size),
        );
    }

    return new NextResponse(
        result.stream,
        {
            status: 200,
            headers,
        },
    );
}
