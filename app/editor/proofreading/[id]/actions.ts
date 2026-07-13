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
                where: {
                    journalId,
                    role: {
                        in: [...EDITOR_ROLES],
                    },
                },
                select: {
                    id: true,
                },
            },
        },
    });

    if (!editor || !editor.isActive) {
        throw new Error(
            "The editor account was not found or is inactive.",
        );
    }

    if (editor.roles.length === 0) {
        throw new Error(
            "This user does not have editorial permission for this journal.",
        );
    }
}

function refreshProofreadingPages(
    assignmentId: string,
    submissionId: string,
) {
    revalidatePath(
        `/editor/proofreading/${assignmentId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath(
        `/proofreader/assignments/${assignmentId}`,
    );

    revalidatePath("/proofreader/dashboard");
    revalidatePath("/editor/dashboard");
    revalidatePath("/author/dashboard");
}

export async function approveProofreading(
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
                        fileType: "PROOF_FILE",
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
            "Proofreading assignment was not found.",
        );
    }

    if (assignment.stage !== "PROOFREADING") {
        throw new Error(
            "This is not a proofreading assignment.",
        );
    }

    if (assignment.status !== "SUBMITTED") {
        throw new Error(
            "Only submitted proofreading work can be approved.",
        );
    }

    await verifyEditor(
        editor.id,
        assignment.submission.journalId,
    );

    const newestProofFile = assignment.files[0];
    const completedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.productionFile.updateMany({
            where: {
                productionAssignmentId: assignmentId,
                fileType: "PROOF_FILE",
            },
            data: {
                isFinal: false,
            },
        });

        if (newestProofFile) {
            await tx.productionFile.update({
                where: {
                    id: newestProofFile.id,
                },
                data: {
                    isFinal: true,
                },
            });
        }

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
                status: "AUTHOR_PROOF_APPROVAL",
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
                title: "Proofreading Approved",
                message: `Your proofreading work for "${assignment.submission.title}" has been approved.`,
                link: `/proofreader/assignments/${assignmentId}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editor.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,
                metadata: {
                    event: "PROOFREADING_APPROVED",
                    submissionId: assignment.submissionId,
                    proofreaderId: assignment.assigneeId,
                    round: assignment.round,
                    finalProofFileId:
                        newestProofFile?.id || null,
                    approvedAt: completedAt.toISOString(),
                },
            },
        });
    });

    refreshProofreadingPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(
        `/editor/submissions/${assignment.submissionId}/production`,
    );
}

export async function returnProofreadingForChanges(
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
            "Describe the proofreading corrections required.",
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
            "Proofreading assignment was not found.",
        );
    }

    if (assignment.stage !== "PROOFREADING") {
        throw new Error(
            "This is not a proofreading assignment.",
        );
    }

    if (assignment.status !== "SUBMITTED") {
        throw new Error(
            "Only submitted proofreading work can be returned.",
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
                fileType: "PROOF_FILE",
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
                title: "Proofreading Corrections Requested",
                message: `Additional proofreading corrections are required for "${assignment.submission.title}".`,
                link: `/proofreader/assignments/${assignmentId}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editor.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,
                metadata: {
                    event: "PROOFREADING_CHANGES_REQUESTED",
                    submissionId: assignment.submissionId,
                    proofreaderId: assignment.assigneeId,
                    round: assignment.round,
                    dueDate:
                        dueDate?.toISOString() || null,
                },
            },
        });
    });

    refreshProofreadingPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(
        `/editor/proofreading/${assignmentId}`,
    );
}