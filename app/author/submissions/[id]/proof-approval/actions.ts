"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

function refreshAuthorProofPages(submissionId: string) {
    revalidatePath(
        `/author/submissions/${submissionId}/proof-approval`,
    );

    revalidatePath(
        `/author/submissions/${submissionId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );

    revalidatePath("/author/dashboard");
    revalidatePath("/editor/dashboard");
    revalidatePath("/proofreader/dashboard");
}

export async function approveAuthorProof(
    formData: FormData,
) {
    const author = await requireAnyActionRole(AUTHOR_ROLES);

    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const approvalNote = String(
        formData.get("approvalNote") || "",
    ).trim();

    if (!submissionId) {
        throw new Error("Submission ID is missing.");
    }

    const submission =
        await prisma.submission.findFirst({
            where: {
                id: submissionId,

                ...(isSuperAdmin(author)
                    ? {}
                    : {
                        authorId: author.id,
                    }),
            },

            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                productionAssignments: {
                    where: {
                        stage: "PROOFREADING",
                    },

                    include: {
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

                    orderBy: {
                        round: "desc",
                    },

                    take: 1,
                },
            },
        });

    if (!submission) {
        throw new Error(
            "Submission not found or you do not have permission to approve this proof.",
        );
    }

    if (
        submission.status !== "AUTHOR_PROOF_APPROVAL"
    ) {
        throw new Error(
            "This manuscript is not awaiting author proof approval.",
        );
    }

    const proofreadingAssignment =
        submission.productionAssignments[0];

    if (
        !proofreadingAssignment ||
        proofreadingAssignment.status !== "APPROVED"
    ) {
        throw new Error(
            "Proofreading must be approved before author proof approval.",
        );
    }

    const approvedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.submission.update({
            where: {
                id: submissionId,
            },

            data: {
                status: "READY_FOR_PUBLICATION",
            },
        });

        await tx.productionNote.create({
            data: {
                submissionId,
                productionAssignmentId:
                    proofreadingAssignment.id,
                authorId: author.id,
                message:
                    approvalNote ||
                    "The author reviewed and approved the final proof for publication.",
                isInternal: false,
            },
        });

        await tx.notification.create({
            data: {
                userId:
                    proofreadingAssignment.assignedById,
                type: "PUBLICATION",
                title: "Author Proof Approved",
                message: `The author has approved the final proof for "${submission.title}".`,
                link: `/editor/submissions/${submissionId}/production`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: author.id,
                action: "UPDATE",
                entity: "Submission",
                entityId: submissionId,

                metadata: {
                    event: "AUTHOR_PROOF_APPROVED",
                    proofreadingAssignmentId:
                        proofreadingAssignment.id,
                    approvedAt:
                        approvedAt.toISOString(),
                    previousStatus:
                        "AUTHOR_PROOF_APPROVAL",
                    newStatus:
                        "READY_FOR_PUBLICATION",
                },
            },
        });
    });

    refreshAuthorProofPages(submissionId);

    redirect(
        `/author/submissions/${submissionId}`,
    );
}

export async function requestAuthorProofCorrections(
    formData: FormData,
) {
    const author = await requireAnyActionRole(AUTHOR_ROLES);

    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const correctionNote = String(
        formData.get("correctionNote") || "",
    ).trim();

    if (!submissionId) {
        throw new Error("Submission ID is missing.");
    }

    if (!correctionNote) {
        throw new Error(
            "Describe the corrections required.",
        );
    }

    const submission =
        await prisma.submission.findFirst({
            where: {
                id: submissionId,

                ...(isSuperAdmin(author)
                    ? {}
                    : {
                        authorId: author.id,
                    }),
            },

            include: {
                productionAssignments: {
                    where: {
                        stage: "PROOFREADING",
                    },

                    orderBy: {
                        round: "desc",
                    },

                    take: 1,
                },
            },
        });

    if (!submission) {
        throw new Error(
            "Submission not found or you do not have permission to request proof corrections.",
        );
    }

    if (
        submission.status !== "AUTHOR_PROOF_APPROVAL"
    ) {
        throw new Error(
            "This manuscript is not awaiting author proof approval.",
        );
    }

    const proofreadingAssignment =
        submission.productionAssignments[0];

    if (!proofreadingAssignment) {
        throw new Error(
            "No proofreading assignment was found.",
        );
    }

    if (
        proofreadingAssignment.status !== "APPROVED"
    ) {
        throw new Error(
            "The latest proofreading assignment has not been approved.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.submission.update({
            where: {
                id: submissionId,
            },

            data: {
                status: "PROOFREADING",
            },
        });

        await tx.productionAssignment.update({
            where: {
                id: proofreadingAssignment.id,
            },

            data: {
                status: "CHANGES_REQUESTED",
                submittedAt: null,
                approvedAt: null,
                completedAt: null,
            },
        });

        await tx.productionFile.updateMany({
            where: {
                productionAssignmentId:
                    proofreadingAssignment.id,
                fileType: "PROOF_FILE",
            },

            data: {
                isFinal: false,
            },
        });

        await tx.productionNote.create({
            data: {
                submissionId,
                productionAssignmentId:
                    proofreadingAssignment.id,
                authorId: author.id,
                message: correctionNote,
                isInternal: false,
            },
        });

        await tx.notification.create({
            data: {
                userId:
                    proofreadingAssignment.assigneeId,
                type: "PUBLICATION",
                title: "Author Requested Proof Corrections",
                message: `The author requested additional corrections for "${submission.title}".`,
                link: `/proofreader/assignments/${proofreadingAssignment.id}`,
            },
        });

        await tx.notification.create({
            data: {
                userId:
                    proofreadingAssignment.assignedById,
                type: "PUBLICATION",
                title: "Author Requested Proof Corrections",
                message: `The author requested additional proof corrections for "${submission.title}".`,
                link: `/editor/proofreading/${proofreadingAssignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: author.id,
                action: "UPDATE",
                entity: "Submission",
                entityId: submissionId,

                metadata: {
                    event:
                        "AUTHOR_PROOF_CORRECTIONS_REQUESTED",
                    proofreadingAssignmentId:
                        proofreadingAssignment.id,
                    previousStatus:
                        "AUTHOR_PROOF_APPROVAL",
                    newStatus:
                        "PROOFREADING",
                },
            },
        });
    });

    refreshAuthorProofPages(submissionId);

    redirect(
        `/author/submissions/${submissionId}/proof-approval`,
    );
}