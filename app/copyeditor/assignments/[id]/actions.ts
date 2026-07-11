"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
    const assignmentId = String(
        formData.get("assignmentId") || "",
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
        });

    if (!assignment) {
        throw new Error(
            "Copyediting assignment not found.",
        );
    }

    if (assignment.stage !== "COPYEDITING") {
        throw new Error(
            "This is not a copyediting assignment.",
        );
    }

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
                userId: assignment.assigneeId,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignmentId,

                metadata: {
                    event: "COPYEDITING_STARTED",
                    submissionId: assignment.submissionId,
                    productionRound: assignment.round,
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
    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const authorId = String(
        formData.get("authorId") || "",
    ).trim();

    const message = String(
        formData.get("message") || "",
    ).trim();

    const isInternal =
        String(formData.get("isInternal") || "") ===
        "true";

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }

    if (!authorId) {
        throw new Error("Note author ID is missing.");
    }

    if (!message) {
        throw new Error(
            "Enter a production note before submitting.",
        );
    }

    const assignment =
        await prisma.productionAssignment.findUnique({
            where: {
                id: assignmentId,
            },
        });

    if (!assignment) {
        throw new Error(
            "Copyediting assignment not found.",
        );
    }

    await prisma.productionNote.create({
        data: {
            submissionId: assignment.submissionId,
            productionAssignmentId: assignmentId,
            authorId,
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
    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const uploadedById = String(
        formData.get("uploadedById") || "",
    ).trim();

    const fileName = String(
        formData.get("fileName") || "",
    ).trim();

    const fileUrl = String(
        formData.get("fileUrl") || "",
    ).trim();

    const mimeType = String(
        formData.get("mimeType") || "",
    ).trim();

    const description = String(
        formData.get("description") || "",
    ).trim();

    const note = String(
        formData.get("note") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error(
            "Production assignment ID is missing.",
        );
    }

    if (!uploadedById) {
        throw new Error("Uploader ID is missing.");
    }

    if (!fileName) {
        throw new Error(
            "Copyedited manuscript file name is required.",
        );
    }

    if (!fileUrl) {
        throw new Error(
            "Copyedited manuscript file URL is required.",
        );
    }

    try {
        new URL(fileUrl);
    } catch {
        throw new Error(
            "Enter a valid manuscript file URL.",
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
                    },
                },

                files: {
                    where: {
                        fileType: "COPYEDITED_MANUSCRIPT",
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
            "Copyediting assignment not found.",
        );
    }

    if (assignment.stage !== "COPYEDITING") {
        throw new Error(
            "This is not a copyediting assignment.",
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

    if (uploadedById !== assignment.assigneeId) {
        throw new Error(
            "Only the assigned copyeditor can submit this file.",
        );
    }

    const nextVersionNumber =
        (assignment.files[0]?.versionNumber || 0) + 1;

    await prisma.$transaction(async (tx) => {
        const productionFile =
            await tx.productionFile.create({
                data: {
                    submissionId: assignment.submissionId,
                    productionAssignmentId: assignmentId,
                    uploadedById,
                    fileType: "COPYEDITED_MANUSCRIPT",
                    fileName,
                    fileUrl,
                    mimeType: mimeType || null,
                    versionNumber: nextVersionNumber,
                    description: description || null,
                    isFinal: false,
                },
            });

        if (note) {
            await tx.productionNote.create({
                data: {
                    submissionId: assignment.submissionId,
                    productionAssignmentId: assignmentId,
                    authorId: uploadedById,
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
                userId: assignment.assignedById,
                type: "PUBLICATION",
                title: "Copyediting submitted",
                message:
                    `The copyedited manuscript for ` +
                    `"${assignment.submission.title}" has been submitted for editorial review.`,
                link: `/editor/submissions/${assignment.submissionId}/production`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: uploadedById,
                action: "UPDATE",
                entity: "ProductionFile",
                entityId: productionFile.id,

                metadata: {
                    event: "COPYEDITING_SUBMITTED",
                    assignmentId,
                    submissionId: assignment.submissionId,
                    productionRound: assignment.round,
                    versionNumber: nextVersionNumber,
                    fileName,
                },
            },
        });
    });

    revalidateProductionPages(
        assignmentId,
        assignment.submissionId,
    );

    redirect(
        `/copyeditor/assignments/${assignmentId}`,
    );
}