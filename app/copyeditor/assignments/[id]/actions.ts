"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { COPYEDITOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import {
    deleteJournalFile,
    uploadJournalFile,
} from "@/lib/storage/blob";
import type { UploadResult } from "@/lib/storage/types";

async function verifyCopyeditorAssignment(
    assignmentId: string,
    userId: string,
) {
    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id: assignmentId,
                assigneeId: userId,
                stage: "COPYEDITING",
            },
        });

    if (!assignment) {
        throw new Error(
            "You are not authorized to access this copyediting assignment.",
        );
    }

    return assignment;
}

function revalidateProductionPages(
    assignmentId: string,
    submissionId: string,
) {
    revalidatePath(
        `/copyeditor/assignments/${assignmentId}`,
    );

    revalidatePath("/copyeditor/dashboard");

    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath("/editor/dashboard");
}

export async function startCopyediting(
    formData: FormData,
) {
    const copyeditor =
        await requireAnyActionRole(COPYEDITOR_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }

    const assignment =
        await verifyCopyeditorAssignment(
            assignmentId,
            copyeditor.id,
        );

    if (
        assignment.status !== "PENDING" &&
        assignment.status !== "CHANGES_REQUESTED"
    ) {
        throw new Error(
            `This assignment cannot be started because its current status is ${assignment.status
                .replaceAll("_", " ")
                .toLowerCase()}.`,
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.productionAssignment.update({
            where: {
                id: assignmentId,
            },
            data: {
                status: "IN_PROGRESS",
                startedAt:
                    assignment.startedAt || new Date(),
            },
        });

        await tx.activityLog.create({
            data: {
                userId: copyeditor.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,
                metadata: {
                    event: "COPYEDITING_STARTED",
                    submissionId:
                        assignment.submissionId,
                    productionRound:
                        assignment.round,
                },
            },
        });
    });

    revalidateProductionPages(
        assignmentId,
        assignment.submissionId,
    );
}

export async function addCopyeditingNote(
    formData: FormData,
) {
    const copyeditor =
        await requireAnyActionRole(COPYEDITOR_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const message = String(
        formData.get("message") || "",
    ).trim();

    const isInternal =
        String(
            formData.get("isInternal") || "",
        ) === "true";

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }

    if (!message) {
        throw new Error(
            "Enter a production note.",
        );
    }

    const assignment =
        await verifyCopyeditorAssignment(
            assignmentId,
            copyeditor.id,
        );

    await prisma.productionNote.create({
        data: {
            submissionId:
                assignment.submissionId,
            productionAssignmentId:
                assignmentId,
            authorId: copyeditor.id,
            message,
            isInternal,
        },
    });

    revalidateProductionPages(
        assignmentId,
        assignment.submissionId,
    );
}

export async function submitCopyediting(
    formData: FormData,
) {
    const copyeditor =
        await requireAnyActionRole(COPYEDITOR_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const description = String(
        formData.get("description") || "",
    ).trim();

    const note = String(
        formData.get("note") || "",
    ).trim();

    const fileEntry =
        formData.get("copyeditedFile");

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }

    if (
        !(fileEntry instanceof File) ||
        fileEntry.size === 0 ||
        !fileEntry.name.trim()
    ) {
        throw new Error(
            "Select the completed copyedited manuscript.",
        );
    }

    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id: assignmentId,
                ...(isSuperAdmin(copyeditor)
                    ? {}
                    : {
                        assigneeId: copyeditor.id,
                    }),
                stage: "COPYEDITING",
            },

            include: {
                submission: {
                    select: {
                        id: true,
                        title: true,
                        journalId: true,

                        journal: {
                            select: {
                                tenantId: true,
                            },
                        },
                    },
                },

                files: {
                    where: {
                        fileType:
                            "COPYEDITED_MANUSCRIPT",
                    },

                    orderBy: {
                        versionNumber: "desc",
                    },

                    take: 1,
                },
            },
        });

    if (!assignment) {
        throw new Error(
            "Copyediting assignment not found or you are not authorized to submit work for it.",
        );
    }

    if (
        assignment.status !== "IN_PROGRESS" &&
        assignment.status !== "CHANGES_REQUESTED"
    ) {
        throw new Error(
            "Start the copyediting assignment before submitting the completed manuscript.",
        );
    }

    const nextVersionNumber =
        (assignment.files[0]?.versionNumber || 0) + 1;

    let uploadedFile: UploadResult | null = null;

    try {
        uploadedFile =
            await uploadJournalFile({
                file: fileEntry,
                category: "COPYEDITED",
                visibility: "private",

                metadata: {
                    category: "COPYEDITED",
                    tenantId:
                        assignment.submission.journal
                            .tenantId,
                    journalId:
                        assignment.submission.journalId,
                    submissionId:
                        assignment.submissionId,
                    assignmentId,
                    versionNumber:
                        nextVersionNumber,
                },
            });

        /*
         * Assign the successful upload to a non-null constant.
         *
         * TypeScript can now safely use it inside the
         * Prisma transaction callback.
         */
        const storedFile = uploadedFile;

        await prisma.$transaction(async (tx) => {
            const productionFile =
                await tx.productionFile.create({
                    data: {
                        submissionId:
                            assignment.submissionId,

                        productionAssignmentId:
                            assignmentId,

                        uploadedById:
                            copyeditor.id,

                        fileType:
                            "COPYEDITED_MANUSCRIPT",

                        fileName:
                            storedFile.originalFilename,

                        fileUrl:
                            storedFile.url,

                        mimeType:
                            storedFile.mimeType || null,

                        fileSize:
                            storedFile.size,

                        versionNumber:
                            nextVersionNumber,

                        description:
                            description || null,

                        isFinal: false,
                    },
                });

            if (note) {
                await tx.productionNote.create({
                    data: {
                        submissionId:
                            assignment.submissionId,

                        productionAssignmentId:
                            assignmentId,

                        authorId:
                            copyeditor.id,

                        message: note,

                        isInternal: true,
                    },
                });
            }

            await tx.productionAssignment.update({
                where: {
                    id: assignmentId,
                },

                data: {
                    status: "SUBMITTED",
                    submittedAt: new Date(),
                    completedAt: null,
                },
            });

            await tx.notification.create({
                data: {
                    userId:
                        assignment.assignedById,

                    type: "PUBLICATION",

                    title:
                        "Copyediting submitted",

                    message:
                        `The copyedited manuscript for ` +
                        `"${assignment.submission.title}" has been submitted for editorial review.`,

                    link:
                        `/editor/submissions/${assignment.submissionId}/production`,
                },
            });

            await tx.activityLog.create({
                data: {
                    userId:
                        copyeditor.id,

                    action: "UPDATE",

                    entity:
                        "ProductionFile",

                    entityId:
                        productionFile.id,

                    metadata: {
                        event:
                            "COPYEDITING_SUBMITTED",

                        assignmentId,

                        submissionId:
                            assignment.submissionId,

                        productionRound:
                            assignment.round,

                        versionNumber:
                            nextVersionNumber,

                        fileName:
                            storedFile.originalFilename,

                        fileSize:
                            storedFile.size,

                        mimeType:
                            storedFile.mimeType,

                        storagePath:
                            storedFile.pathname,
                    },
                },
            });
        });
    } catch (error) {
        /*
         * If the Blob upload succeeded but the database
         * transaction failed, remove the orphaned file.
         */
        if (uploadedFile) {
            try {
                await deleteJournalFile(
                    uploadedFile.url,
                    "private",
                );
            } catch (cleanupError) {
                console.error(
                    "Failed to clean up copyedited Blob file:",
                    {
                        pathname:
                            uploadedFile.pathname,
                        cleanupError,
                    },
                );
            }
        }

        throw error;
    }

    revalidateProductionPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(
        `/copyeditor/assignments/${assignmentId}`,
    );
}