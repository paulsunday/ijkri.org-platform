import { NextRequest, NextResponse } from "next/server";

import { requireActionUser } from "@/lib/auth/current-user";
import { TYPESETTER_ROLES } from "@/lib/auth/role-groups";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { renderArticlePdf } from "@/lib/pdf/render-article-pdf";
import { logger } from "@/lib/logger";

import { buildFormattedContent } from "@/app/typesetter/assignments/[id]/production-editor/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Renders a live, unsaved preview of the production article as a PDF
 * using the exact same renderer as "Generate PDF" — nothing is
 * persisted. Invoked via a native form POST (not a server action) so
 * the response can stream a real application/pdf body straight into a
 * new browser tab.
 */
export async function POST(request: NextRequest) {
    const typesetter = await requireActionUser();

    const isPermitted =
        isSuperAdmin(typesetter) ||
        typesetter.roles.some((role) =>
            (TYPESETTER_ROLES as readonly string[]).includes(role.role),
        );

    if (!isPermitted) {
        return NextResponse.json(
            { error: "You do not have permission to preview this article." },
            { status: 403 },
        );
    }

    const assignmentId = request.nextUrl.searchParams.get("assignmentId");

    if (!assignmentId) {
        return NextResponse.json(
            { error: "Assignment ID is missing." },
            { status: 400 },
        );
    }

    const formData = await request.formData();

    try {
        const { content, metadata } = await buildFormattedContent(
            assignmentId,
            formData,
            typesetter,
        );

        const pdfBytes = await renderArticlePdf({ content, metadata });

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=preview.pdf",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        logger.error("Production PDF preview failed", error, {
            event: "PRODUCTION_PDF_PREVIEW_FAILED",
            assignmentId,
        });

        const message =
            error instanceof Error
                ? error.message
                : "The preview could not be generated.";

        return NextResponse.json({ error: message }, { status: 400 });
    }
}
