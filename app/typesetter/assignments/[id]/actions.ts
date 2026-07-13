"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { TYPESETTER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPESETTING_FILE_TYPES = [
    "TYPESET_DOCUMENT",
    "PDF_GALLEY",
    "HTML_GALLEY",
    "XML_GALLEY",
] as const;

type TypesettingFileType =
    (typeof ALLOWED_TYPESETTING_FILE_TYPES)[number];

async function getTypesetterAssignment(
    assignmentId: string,
    typesetterId: string,
) {
    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id: assignmentId,
                assigneeId: typesetterId,
                stage: "TYPESETTING",
            },
        });

    if (!assignment) {
        throw new Error(
            "Typesetting assignment not found or you do not have permission to access it.",
        );
    }

    return assignment;
}

function refreshTypesettingPages(
    assignmentId: string,
    submissionId: string,
) {
    revalidatePath(
        `/typesetter/assignments/${assignmentId}`,
    );

    revalidatePath("/typesetter/dashboard");

    revalidatePath(
        `/editor/typesetting/${assignmentId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath("/editor/dashboard");
}

export async function startTypesetting(
    formData: FormData,
) {
    const typesetter =
        await requireAnyActionRole(TYPESETTER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error("Assignment ID is required.");
    }

    const assignment = await getTypesetterAssignment(
        assignmentId,
        typesetter.id,
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
                id: assignment.id,
            },
            data: {
                status: "IN_PROGRESS",
                startedAt:
                    assignment.startedAt || new Date(),
                submittedAt: null,
                completedAt: null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: typesetter.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignment.id,
                metadata: {
                    event: "TYPESETTING_STARTED",
                    submissionId:
                        assignment.submissionId,
                    productionRound: assignment.round,
                },
            },
        });
    });

    refreshTypesettingPages(
        assignment.id,
        assignment.submissionId,
    );
}

export async function saveTypesettingNote(
    formData: FormData,
) {
    const typesetter =
        await requireAnyActionRole(TYPESETTER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const note = String(
        formData.get("note") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }

    if (!note) {
        throw new Error("Note cannot be empty.");
    }

    const assignment = await getTypesetterAssignment(
        assignmentId,
        typesetter.id,
    );

    await prisma.productionNote.create({
        data: {
            submissionId:
                assignment.submissionId,
            productionAssignmentId:
                assignment.id,
            authorId: typesetter.id,
            message: note,
            isInternal: true,
        },
    });

    refreshTypesettingPages(
        assignment.id,
        assignment.submissionId,
    );
}

export async function uploadProductionFile(
    formData: FormData,
) {
    const typesetter =
        await requireAnyActionRole(TYPESETTER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const fileTypeValue = String(
        formData.get("fileType") || "",
    ).trim();

    const fileUrl = String(
        formData.get("fileUrl") || "",
    ).trim();

    const fileName = String(
        formData.get("filename") ||
        formData.get("fileName") ||
        "",
    ).trim();

    const mimeType = String(
        formData.get("mimeType") ||
        "application/octet-stream",
    ).trim();

    const fileSizeValue = String(
        formData.get("fileSize") || "0",
    ).trim();

    const description = String(
        formData.get("description") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }

    if (!fileTypeValue) {
        throw new Error("Select a production file type.");
    }

    if (
        !ALLOWED_TYPESETTING_FILE_TYPES.includes(
            fileTypeValue as TypesettingFileType,
        )
    ) {
        throw new Error(
            "The selected file type is not valid for typesetting.",
        );
    }

    if (!fileUrl) {
        throw new Error("Production file URL is required.");
    }

    if (!fileName) {
        throw new Error("Production file name is required.");
    }

    try {
        new URL(fileUrl);
    } catch {
        throw new Error(
            "Enter a valid production file URL.",
        );
    }

    const fileSize = Number(fileSizeValue);

    if (
        !Number.isFinite(fileSize) ||
        fileSize < 0
    ) {
        throw new Error("The file size is invalid.");
    }

    const assignment = await getTypesetterAssignment(
        assignmentId,
        typesetter.id,
    );

    if (
        assignment.status !== "IN_PROGRESS" &&
        assignment.status !== "CHANGES_REQUESTED"
    ) {
        throw new Error(
            "Start the typesetting assignment before uploading production files.",
        );
    }

    const fileType =
        fileTypeValue as TypesettingFileType;

    const latestFile =
        await prisma.productionFile.findFirst({
            where: {
                productionAssignmentId:
                    assignment.id,
                fileType,
            },
            orderBy: {
                versionNumber: "desc",
            },
            select: {
                versionNumber: true,
            },
        });

    const nextVersionNumber =
        (latestFile?.versionNumber || 0) + 1;

    const productionFile =
        await prisma.productionFile.create({
            data: {
                submissionId:
                    assignment.submissionId,
                productionAssignmentId:
                    assignment.id,
                uploadedById: typesetter.id,
                fileType,
                fileName,
                fileUrl,
                mimeType: mimeType || null,
                fileSize,
                versionNumber:
                    nextVersionNumber,
                description:
                    description || null,
                isFinal: false,
            },
        });

    await prisma.activityLog.create({
        data: {
            userId: typesetter.id,
            action: "CREATE",
            entity: "ProductionFile",
            entityId: productionFile.id,
            metadata: {
                event: "TYPESETTING_FILE_UPLOADED",
                assignmentId:
                    assignment.id,
                submissionId:
                    assignment.submissionId,
                fileType,
                fileName,
                versionNumber:
                    nextVersionNumber,
            },
        },
    });

    refreshTypesettingPages(
        assignment.id,
        assignment.submissionId,
    );
}

export async function submitTypesetting(
    formData: FormData,
) {
    const typesetter =
        await requireAnyActionRole(TYPESETTER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }

    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id: assignmentId,
                assigneeId: typesetter.id,
                stage: "TYPESETTING",
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
                        fileType: {
                            in: [
                                "TYPESET_DOCUMENT",
                                "PDF_GALLEY",
                                "HTML_GALLEY",
                                "XML_GALLEY",
                            ],
                        },
                    },
                },
            },
        });

    if (!assignment) {
        throw new Error(
            "Typesetting assignment not found or you do not have permission to submit it.",
        );
    }

    if (
        assignment.status !== "IN_PROGRESS" &&
        assignment.status !== "CHANGES_REQUESTED"
    ) {
        throw new Error(
            "Start the typesetting assignment before submitting it.",
        );
    }

    const hasTypesetDocument =
        assignment.files.some(
            (file) =>
                file.fileType === "TYPESET_DOCUMENT",
        );

    const hasPdfGalley =
        assignment.files.some(
            (file) =>
                file.fileType === "PDF_GALLEY",
        );

    if (!hasTypesetDocument) {
        throw new Error(
            "Upload the formatted typeset document first.",
        );
    }

    if (!hasPdfGalley) {
        throw new Error(
            "Upload the PDF galley first.",
        );
    }

    const submittedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.productionAssignment.update({
            where: {
                id: assignment.id,
            },
            data: {
                status: "SUBMITTED",
                submittedAt,
                completedAt: null,
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

        await tx.notification.create({
            data: {
                userId: assignment.assignedById,
                type: "PUBLICATION",
                title: "Typesetting submitted",
                message:
                    `The typesetting files for ` +
                    `"${assignment.submission.title}" have been submitted for editorial review.`,
                link:
                    `/editor/typesetting/${assignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: typesetter.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignment.id,
                metadata: {
                    event: "TYPESETTING_SUBMITTED",
                    submissionId:
                        assignment.submissionId,
                    productionRound:
                        assignment.round,
                    submittedAt:
                        submittedAt.toISOString(),
                },
            },
        });
    });

    refreshTypesettingPages(
        assignment.id,
        assignment.submissionId,
    );
}