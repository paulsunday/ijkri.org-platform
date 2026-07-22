import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { requireAnyRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const DOWNLOAD_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "COPYEDITOR",
    "TYPESETTER",
    "PROOFREADER",
    "AUTHOR",
] as const;

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

function getPathname(fileUrl: string): string {
    const url = new URL(fileUrl);

    return decodeURIComponent(
        url.pathname.replace(/^\/+/, ""),
    );
}

function safeFilename(fileName: string): string {
    return fileName
        .replace(/[\r\n"]/g, "")
        .trim();
}

export async function GET(
    _request: Request,
    { params }: RouteContext,
) {
    const user = await requireAnyRole([
        ...DOWNLOAD_ROLES,
    ]);

    const { id } = await params;

    const file = await prisma.productionFile.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            submission: {
                select: {
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
        return new NextResponse("File not found.", {
            status: 404,
        });
    }

    const isSuperAdmin = user.roles.some(
        (role) => role.role === "SUPER_ADMIN",
    );

    const isAuthor =
        file.submission.authorId === user.id;

    const isAssignee =
        file.productionAssignment?.assigneeId ===
        user.id;

    const isAssigningEditor =
        file.productionAssignment?.assignedById ===
        user.id;

    const hasJournalAccess = user.roles.some(
        (role) =>
            role.journalId ===
            file.submission.journalId &&
            [
                "ADMIN",
                "EDITOR_IN_CHIEF",
                "MANAGING_EDITOR",
                "SECTION_EDITOR",
                "COPYEDITOR",
                "TYPESETTER",
                "PROOFREADER",
            ].includes(role.role),
    );

    if (
        !isSuperAdmin &&
        !isAuthor &&
        !isAssignee &&
        !isAssigningEditor &&
        !hasJournalAccess
    ) {
        return new NextResponse("Forbidden.", {
            status: 403,
        });
    }

    const pathname = getPathname(file.fileUrl);

    const result = await get(pathname, {
        access: "private",
    });

    if (!result || result.statusCode !== 200) {
        return new NextResponse(
            "Stored file was not found.",
            {
                status: 404,
            },
        );
    }

    const filename = safeFilename(file.fileName);

    return new NextResponse(result.stream, {
        headers: {
            "Content-Type":
                file.mimeType ||
                result.blob.contentType ||
                "application/octet-stream",

            "Content-Disposition":
                `attachment; filename="${filename}"`,

            "Cache-Control": "private, no-cache",

            "X-Content-Type-Options": "nosniff",
        },
    });
}
