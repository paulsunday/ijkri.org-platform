"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { PROOFREADER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { uploadJournalFile } from "@/lib/storage/blob";

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

    revalidatePath(
        `/admin/submissions/${submissionId}`,
    );

    revalidatePath("/admin/submissions");
    revalidatePath("/editor/dashboard");
    revalidatePath("/admin/dashboard");
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

    const proofFileValue =
        formData.get("proofFile");

    const proofFile =
        proofFileValue instanceof File
            ? proofFileValue
            : null;

    if (!assignmentId) {
        throw new Error("Assignment ID is missing.");
    }

    if (
        !noCorrectionsRequired &&
        (!proofFile || proofFile.size === 0)
    ) {
        throw new Error(
            "Upload the corrected PDF proof or select the no-corrections option.",
        );
    }

    if (
        !noCorrectionsRequired &&
        proofFile &&
        !proofFile.name
            .toLowerCase()
            .endsWith(".pdf")
    ) {
        throw new Error(
            "The corrected proof must be uploaded as a PDF file.",
        );
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
                        journalId: true,
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
        (assignment.files[0]?.versionNumber ?? 0) +
        1;

    let uploadedProof:
        | Awaited<
            ReturnType<typeof uploadJournalFile>
        >
        | null = null;

    /*
     * Upload the file before opening the database transaction.
     * External storage operations should not be performed inside
     * a Prisma transaction.
     */
    if (
        !noCorrectionsRequired &&
        proofFile
    ) {
        uploadedProof =
            await uploadJournalFile({
                file: proofFile,
                category: "PROOF",
                visibility: "private",

                metadata: {
                    category: "PROOF",
                    journalId:
                        assignment.submission.journalId,
                    submissionId:
                        assignment.submissionId,
                    assignmentId:
                        assignment.id,
                    versionNumber:
                        nextVersionNumber,
                },
            });
    }

    await prisma.$transaction(async (tx) => {
        let productionFileId: string | null =
            null;

        if (uploadedProof) {
            const productionFile =
                await tx.productionFile.create({
                    data: {
                        submissionId:
                            assignment.submissionId,

                        productionAssignmentId:
                            assignment.id,

                        uploadedById:
                            proofreader.id,

                        fileType: "PROOF_FILE",

                        fileName:
                            uploadedProof.originalFilename,

                        fileUrl:
                            uploadedProof.url,

                        mimeType:
                            uploadedProof.mimeType ||
                            "application/pdf",

                        fileSize:
                            uploadedProof.size,

                        versionNumber:
                            nextVersionNumber,

                        description:
                            description || null,

                        isFinal: false,
                    },
                });

            productionFileId =
                productionFile.id;
        }

        const finalNote =
            note ||
            (noCorrectionsRequired
                ? "Proofreading completed. No corrections were required."
                : "Proofreading completed and a corrected PDF proof was submitted.");

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
                userId:
                    assignment.assignedById,

                type: "PUBLICATION",

                title:
                    "Proofreading Submitted",

                message:
                    `Proofreading has been submitted for ` +
                    `"${assignment.submission.title}".`,

                link:
                    `/editor/proofreading/${assignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: proofreader.id,

                action: "UPDATE",

                entity:
                    "ProductionAssignment",

                entityId: assignment.id,

                metadata: {
                    event:
                        "PROOFREADING_SUBMITTED",

                    submissionId:
                        assignment.submissionId,

                    round:
                        assignment.round,

                    noCorrectionsRequired,

                    proofFileId:
                        productionFileId,

                    versionNumber:
                        noCorrectionsRequired
                            ? null
                            : nextVersionNumber,

                    storagePathname:
                        uploadedProof?.pathname ||
                        null,
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