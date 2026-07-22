"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";

const EDITOR_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
] as const;

async function verifyEditor(
    editorId: string,
    journalId: string,
) {
    const editor = await prisma.user.findUnique({
        where: {
            id: editorId,
        },
        select: {
            id: true,
            isActive: true,
            roles: {
                select: {
                    id: true,
                    role: true,
                    journalId: true,
                },
            },
        },
    });

    if (!editor || !editor.isActive) {
        throw new Error(
            "The editor account was not found or is inactive.",
        );
    }

    const hasPermission = editor.roles.some(
        (userRole) =>
            userRole.role === "SUPER_ADMIN" ||
            (
                EDITOR_ROLES.includes(
                    userRole.role as (typeof EDITOR_ROLES)[number],
                ) &&
                userRole.journalId === journalId
            ),
    );

    if (!hasPermission) {
        throw new Error(
            "This user does not have editorial permission for this journal.",
        );
    }
}
function refreshPages(
    assignmentId: string,
    submissionId: string,
) {
    revalidatePath(
        `/editor/typesetting/${assignmentId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath(
        `/typesetter/assignments/${assignmentId}`,
    );

    revalidatePath("/typesetter/dashboard");
    revalidatePath("/editor/dashboard");
    revalidatePath("/author/dashboard");
}

export async function approveTypesetting(
    formData: FormData,
) {
    const editor = await requireAnyActionRole(EDITORIAL_ROLES);
    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();



    const approvalNote = String(
        formData.get("approvalNote") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }



    const assignment =
        await prisma.productionAssignment.findUnique({
            where: {
                id: assignmentId,
            },
            include: {
                submission: {
                    select: {
                        id: true,
                        title: true,
                        journalId: true,
                    },
                },
                files: {
                    where: {
                        fileType: {
                            in: [
                                "TYPESET_DOCUMENT",
                                "PDF_GALLEY",
                                "HTML_GALLEY",
                                "XML_GALLEY",
                            ],
                        },
                    },
                    orderBy: [
                        {
                            versionNumber: "desc",
                        },
                        {
                            createdAt: "desc",
                        },
                    ],
                },
            },
        });

    if (!assignment) {
        throw new Error(
            "Typesetting assignment was not found.",
        );
    }

    if (assignment.stage !== "TYPESETTING") {
        throw new Error(
            "This is not a typesetting assignment.",
        );
    }

    if (assignment.status !== "SUBMITTED") {
        throw new Error(
            "Only submitted typesetting work can be approved.",
        );
    }

    await verifyEditor(
        editor.id,
        assignment.submission.journalId,
    );

    const latestTypesetDocument =
        assignment.files.find(
            (file) =>
                file.fileType === "TYPESET_DOCUMENT",
        );

    const latestPdfGalley =
        assignment.files.find(
            (file) => file.fileType === "PDF_GALLEY",
        );

    if (!latestTypesetDocument) {
        throw new Error(
            "A typeset document must be submitted before approval.",
        );
    }

    if (!latestPdfGalley) {
        throw new Error(
            "A PDF galley must be submitted before approval.",
        );
    }

    const completedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.productionFile.updateMany({
            where: {
                productionAssignmentId: assignmentId,
                fileType: {
                    in: [
                        "TYPESET_DOCUMENT",
                        "PDF_GALLEY",
                        "HTML_GALLEY",
                        "XML_GALLEY",
                    ],
                },
            },
            data: {
                isFinal: false,
            },
        });

        await tx.productionFile.update({
            where: {
                id: latestTypesetDocument.id,
            },
            data: {
                isFinal: true,
            },
        });

        await tx.productionFile.update({
            where: {
                id: latestPdfGalley.id,
            },
            data: {
                isFinal: true,
            },
        });

        await tx.productionAssignment.update({
            where: {
                id: assignmentId,
            },
            data: {
                status: "APPROVED",
                approvedAt: completedAt,
                completedAt,
            },
        });

        await tx.submission.update({
            where: {
                id: assignment.submissionId,
            },
            data: {
                status: "PROOFREADING",
            },
        });

        if (approvalNote) {
            await tx.productionNote.create({
                data: {
                    submissionId: assignment.submissionId,
                    productionAssignmentId: assignmentId,
                    authorId: editor.id,
                    message: approvalNote,
                    isInternal: true,
                },
            });
        }

        await tx.notification.create({
            data: {
                userId: assignment.assigneeId,
                type: "PUBLICATION",
                title: "Typesetting Approved",
                message: `Your typesetting work for "${assignment.submission.title}" has been approved.`,
                link: `/typesetter/assignments/${assignmentId}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editor.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,
                metadata: {
                    event: "TYPESETTING_APPROVED",
                    submissionId: assignment.submissionId,
                    typesetterId: assignment.assigneeId,
                    round: assignment.round,
                    finalTypesetDocumentId:
                        latestTypesetDocument.id,
                    finalPdfGalleyId: latestPdfGalley.id,
                    approvedAt: completedAt.toISOString(),
                },
            },
        });
    });

    refreshPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(
        `/editor/submissions/${assignment.submissionId}/production`,
    );
}

export async function returnTypesettingForChanges(
    formData: FormData,
) {
    const editor = await requireAnyActionRole(EDITORIAL_ROLES);
    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();



    const correctionNote = String(
        formData.get("correctionNote") || "",
    ).trim();

    const dueDateValue = String(
        formData.get("dueDate") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }


    if (!correctionNote) {
        throw new Error(
            "Describe the corrections required.",
        );
    }

    let dueDate: Date | undefined;

    if (dueDateValue) {
        dueDate = new Date(
            `${dueDateValue}T23:59:59`,
        );

        if (Number.isNaN(dueDate.getTime())) {
            throw new Error(
                "The correction deadline is invalid.",
            );
        }

        if (dueDate <= new Date()) {
            throw new Error(
                "The correction deadline must be in the future.",
            );
        }
    }

    const assignment =
        await prisma.productionAssignment.findUnique({
            where: {
                id: assignmentId,
            },
            include: {
                submission: {
                    select: {
                        id: true,
                        title: true,
                        journalId: true,
                    },
                },
            },
        });

    if (!assignment) {
        throw new Error(
            "Typesetting assignment was not found.",
        );
    }

    if (assignment.stage !== "TYPESETTING") {
        throw new Error(
            "This is not a typesetting assignment.",
        );
    }

    if (assignment.status !== "SUBMITTED") {
        throw new Error(
            "Only submitted typesetting work can be returned.",
        );
    }

    await verifyEditor(
        editor.id,
        assignment.submission.journalId,
    );

    await prisma.$transaction(async (tx) => {
        await tx.productionAssignment.update({
            where: {
                id: assignmentId,
            },
            data: {
                status: "CHANGES_REQUESTED",
                dueDate:
                    dueDate === undefined
                        ? assignment.dueDate
                        : dueDate,
                submittedAt: null,
                approvedAt: null,
                completedAt: null,
            },
        });

        await tx.productionFile.updateMany({
            where: {
                productionAssignmentId: assignmentId,
                fileType: {
                    in: [
                        "TYPESET_DOCUMENT",
                        "PDF_GALLEY",
                        "HTML_GALLEY",
                        "XML_GALLEY",
                    ],
                },
            },
            data: {
                isFinal: false,
            },
        });

        await tx.productionNote.create({
            data: {
                submissionId: assignment.submissionId,
                productionAssignmentId: assignmentId,
                authorId: editor.id,
                message: correctionNote,
                isInternal: true,
            },
        });

        await tx.notification.create({
            data: {
                userId: assignment.assigneeId,
                type: "PUBLICATION",
                title: "Typesetting Changes Requested",
                message: `Additional typesetting corrections are required for "${assignment.submission.title}".`,
                link: `/typesetter/assignments/${assignmentId}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editor.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,
                metadata: {
                    event: "TYPESETTING_CHANGES_REQUESTED",
                    submissionId: assignment.submissionId,
                    typesetterId: assignment.assigneeId,
                    round: assignment.round,
                    dueDate:
                        dueDate?.toISOString() || null,
                },
            },
        });
    });

    refreshPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(
        `/editor/typesetting/${assignmentId}`,
    );
}