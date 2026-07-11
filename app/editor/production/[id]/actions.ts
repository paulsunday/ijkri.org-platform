"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const EDITOR_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
] as const;

function revalidateCopyeditingPages(
    assignmentId: string,
    submissionId: string,
) {
    revalidatePath(`/editor/production/${assignmentId}`);
    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );
    revalidatePath(`/editor/submissions/${submissionId}`);
    revalidatePath(
        `/copyeditor/assignments/${assignmentId}`,
    );
    revalidatePath("/copyeditor/dashboard");
    revalidatePath("/editor/dashboard");
}

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
                where: {
                    journalId,
                    role: {
                        in: [...EDITOR_ROLES],
                    },
                },
                select: {
                    id: true,
                    role: true,
                },
            },
        },
    });

    if (!editor || !editor.isActive) {
        throw new Error(
            "The editor account does not exist or is inactive.",
        );
    }

    if (editor.roles.length === 0) {
        throw new Error(
            "This user does not have editorial permission for the journal.",
        );
    }
}

export async function approveCopyediting(
    formData: FormData,
) {
    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const editorId = String(
        formData.get("editorId") || "",
    ).trim();

    const approvalNote = String(
        formData.get("approvalNote") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }

    if (!editorId) {
        throw new Error("Editor ID is missing.");
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
                        fileType: "COPYEDITED_MANUSCRIPT",
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
            "Copyediting assignment was not found.",
        );
    }

    if (assignment.stage !== "COPYEDITING") {
        throw new Error(
            "This production assignment is not a copyediting assignment.",
        );
    }

    if (assignment.status !== "SUBMITTED") {
        throw new Error(
            "Only submitted copyediting work can be approved.",
        );
    }

    if (assignment.files.length === 0) {
        throw new Error(
            "No copyedited manuscript was submitted.",
        );
    }

    await verifyEditor(
        editorId,
        assignment.submission.journalId,
    );

    const latestFile = assignment.files[0];
    const completedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.productionFile.updateMany({
            where: {
                productionAssignmentId: assignmentId,
                fileType: "COPYEDITED_MANUSCRIPT",
            },
            data: {
                isFinal: false,
            },
        });

        await tx.productionFile.update({
            where: {
                id: latestFile.id,
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
                status: "TYPESETTING",
            },
        });

        if (approvalNote) {
            await tx.productionNote.create({
                data: {
                    submissionId: assignment.submissionId,
                    productionAssignmentId: assignmentId,
                    authorId: editorId,
                    message: approvalNote,
                    isInternal: true,
                },
            });
        }

        await tx.notification.create({
            data: {
                userId: assignment.assigneeId,
                type: "PUBLICATION",
                title: "Copyediting Approved",
                message: `Your copyediting work for "${assignment.submission.title}" has been approved.`,
                link: `/copyeditor/assignments/${assignmentId}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editorId,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,
                metadata: {
                    event: "COPYEDITING_APPROVED",
                    submissionId: assignment.submissionId,
                    copyeditorId: assignment.assigneeId,
                    round: assignment.round,
                    finalFileId: latestFile.id,
                },
            },
        });
    });

    revalidateCopyeditingPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(
        `/editor/submissions/${assignment.submissionId}/production`,
    );
}

export async function returnCopyeditingForChanges(
    formData: FormData,
) {
    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const editorId = String(
        formData.get("editorId") || "",
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

    if (!editorId) {
        throw new Error("Editor ID is missing.");
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
            "Copyediting assignment was not found.",
        );
    }

    if (assignment.stage !== "COPYEDITING") {
        throw new Error(
            "This production assignment is not a copyediting assignment.",
        );
    }

    if (assignment.status !== "SUBMITTED") {
        throw new Error(
            "Only submitted copyediting work can be returned.",
        );
    }

    await verifyEditor(
        editorId,
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
                fileType: "COPYEDITED_MANUSCRIPT",
            },
            data: {
                isFinal: false,
            },
        });

        await tx.productionNote.create({
            data: {
                submissionId: assignment.submissionId,
                productionAssignmentId: assignmentId,
                authorId: editorId,
                message: correctionNote,
                isInternal: true,
            },
        });

        await tx.notification.create({
            data: {
                userId: assignment.assigneeId,
                type: "PUBLICATION",
                title: "Copyediting Changes Requested",
                message: `Additional corrections are required for "${assignment.submission.title}".`,
                link: `/copyeditor/assignments/${assignmentId}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editorId,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,
                metadata: {
                    event: "COPYEDITING_CHANGES_REQUESTED",
                    submissionId: assignment.submissionId,
                    copyeditorId: assignment.assigneeId,
                    round: assignment.round,
                    dueDate: dueDate?.toISOString() || null,
                },
            },
        });
    });

    revalidateCopyeditingPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(`/editor/production/${assignmentId}`);
}