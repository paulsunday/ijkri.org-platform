"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { PROOFREADER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

async function getProofreaderAssignment(
    assignmentId: string,
    proofreader: {
        id: string;
        roles: {
            role: import("@/lib/generated/prisma").UserRole;
        }[];
    },
) {
    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id: assignmentId,
                stage: "PROOFREADING",

                ...(isSuperAdmin(proofreader)
                    ? {}
                    : {
                        assigneeId: proofreader.id,
                    }),
            },
        });

    if (!assignment) {
        throw new Error(
            "Proofreading assignment not found or you do not have permission to access it.",
        );
    }

    return assignment;
}

function refreshProofreadingPages(
    assignmentId: string,
    submissionId: string,
) {
    revalidatePath(
        `/proofreader/assignments/${assignmentId}`,
    );

    revalidatePath("/proofreader/dashboard");

    revalidatePath(
        `/editor/proofreading/${assignmentId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath("/editor/dashboard");
}

export async function startProofreading(
    formData: FormData,
) {
    const proofreader =
        await requireAnyActionRole(PROOFREADER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }
    const assignment = await getProofreaderAssignment(
        assignmentId,
        proofreader,
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
                    assignment.startedAt ?? new Date(),
                submittedAt: null,
                completedAt: null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: proofreader.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignment.id,
                metadata: {
                    event: "PROOFREADING_STARTED",
                    submissionId:
                        assignment.submissionId,
                    round: assignment.round,
                },
            },
        });
    });

    refreshProofreadingPages(
        assignment.id,
        assignment.submissionId,
    );
}

export async function addProofreadingNote(
    formData: FormData,
) {
    const proofreader =
        await requireAnyActionRole(PROOFREADER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    const message = String(
        formData.get("message") || "",
    ).trim();

    const isInternal =
        String(
            formData.get("isInternal") || "true",
        ) === "true";

    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }

    if (!message) {
        throw new Error("Enter a proofreading note.");
    }

    const assignment = await getProofreaderAssignment(
        assignmentId,
        proofreader,
    );

    await prisma.productionNote.create({
        data: {
            submissionId:
                assignment.submissionId,
            productionAssignmentId:
                assignment.id,
            authorId: proofreader.id,
            message,
            isInternal,
        },
    });

    refreshProofreadingPages(
        assignment.id,
        assignment.submissionId,
    );
}

export async function submitProofreading(
    formData: FormData,
) {
    const proofreader =
        await requireAnyActionRole(PROOFREADER_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
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

    const noCorrectionsRequired =
        String(
            formData.get("noCorrectionsRequired") || "",
        ) === "true";

    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }

    if (!noCorrectionsRequired) {
        if (!fileName) {
            throw new Error(
                "Proof file name is required.",
            );
        }

        if (!fileUrl) {
            throw new Error(
                "Proof file URL is required.",
            );
        }

        try {
            new URL(fileUrl);
        } catch {
            throw new Error(
                "Enter a valid proof file URL.",
            );
        }
    }

    const assignment =
        await prisma.productionAssignment.findFirst({
            where: {
                id: assignmentId,
                stage: "PROOFREADING",

                ...(isSuperAdmin(proofreader)
                    ? {}
                    : {
                        assigneeId: proofreader.id,
                    }),
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
                        fileType: "PROOF_FILE",
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
            "Proofreading assignment not found or you do not have permission to submit it.",
        );
    }

    if (
        assignment.status !== "IN_PROGRESS" &&
        assignment.status !== "CHANGES_REQUESTED"
    ) {
        throw new Error(
            "Start the proofreading assignment before submitting.",
        );
    }

    const nextVersionNumber =
        (assignment.files[0]?.versionNumber ?? 0) + 1;

    await prisma.$transaction(async (tx) => {
        let productionFileId: string | null = null;

        if (!noCorrectionsRequired) {
            const productionFile =
                await tx.productionFile.create({
                    data: {
                        submissionId:
                            assignment.submissionId,
                        productionAssignmentId:
                            assignment.id,
                        uploadedById: proofreader.id,
                        fileType: "PROOF_FILE",
                        fileName,
                        fileUrl,
                        mimeType: mimeType || null,
                        versionNumber:
                            nextVersionNumber,
                        description:
                            description || null,
                        isFinal: false,
                    },
                });

            productionFileId = productionFile.id;
        }

        const finalNote =
            note ||
            (noCorrectionsRequired
                ? "Proofreading completed. No corrections were required."
                : "Proofreading completed and a corrected proof file was submitted.");

        await tx.productionNote.create({
            data: {
                submissionId:
                    assignment.submissionId,
                productionAssignmentId:
                    assignment.id,
                authorId: proofreader.id,
                message: finalNote,
                isInternal: true,
            },
        });

        await tx.productionAssignment.update({
            where: {
                id: assignment.id,
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
                title: "Proofreading Submitted",
                message: `Proofreading has been submitted for "${assignment.submission.title}".`,
                link:
                    `/editor/proofreading/${assignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: proofreader.id,
                action: "UPDATE",
                entity: "ProductionAssignment",
                entityId: assignment.id,
                metadata: {
                    event: "PROOFREADING_SUBMITTED",
                    submissionId:
                        assignment.submissionId,
                    round: assignment.round,
                    noCorrectionsRequired,
                    proofFileId: productionFileId,
                    versionNumber:
                        noCorrectionsRequired
                            ? null
                            : nextVersionNumber,
                },
            },
        });
    });

    refreshProofreadingPages(
        assignment.id,
        assignment.submissionId,
    );

    redirect(
        `/proofreader/assignments/${assignment.id}`,
    );
}