"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    isSuperAdmin,
    requireAnyActionRole,
} from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

async function verifyEditorialPermission(
    editor: {
        id: string;
        roles: {
            role: import("@/lib/generated/prisma").UserRole;
        }[];
    },
    journalId: string,
) {
    if (isSuperAdmin(editor)) {
        return;
    }

    const role =
        await prisma.userJournalRole.findFirst({
            where: {
                userId: editor.id,
                journalId,
                role: {
                    in: EDITORIAL_ROLES,
                },
            },
            select: {
                id: true,
            },
        });

    if (!role) {
        throw new Error(
            "You do not have editorial permission for this journal.",
        );
    }
}

function refreshProductionPages(submissionId: string) {
    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );
    revalidatePath(`/editor/submissions/${submissionId}`);
    revalidatePath("/editor/dashboard");
    revalidatePath("/copyeditor/dashboard");
    revalidatePath("/proofreader/dashboard");
    revalidatePath("/typesetter/dashboard");
}

export async function assignCopyeditor(formData: FormData) {
    const editor = await requireAnyActionRole(EDITORIAL_ROLES);

    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const assigneeId = String(
        formData.get("assigneeId") || "",
    ).trim();

    const dueDateValue = String(
        formData.get("dueDate") || "",
    ).trim();

    const instructions = String(
        formData.get("instructions") || "",
    ).trim();

    if (!submissionId) {
        throw new Error("Submission ID is missing.");
    }

    if (!assigneeId) {
        throw new Error("Select a copyeditor.");
    }

    const submission = await prisma.submission.findUnique({
        where: {
            id: submissionId,
        },
        select: {
            id: true,
            title: true,
            status: true,
            journalId: true,
        },
    });

    if (!submission) {
        throw new Error("Submission not found.");
    }

    if (submission.status !== "ACCEPTED") {
        throw new Error(
            `Only an accepted manuscript can enter copyediting. Current status: ${submission.status}.`,
        );
    }

    await verifyEditorialPermission(
        editor,
        submission.journalId,
    );

    const copyeditor = await prisma.user.findUnique({
        where: {
            id: assigneeId,
        },
        select: {
            id: true,
            name: true,
            isActive: true,
            roles: {
                select: {
                    journalId: true,
                    role: true,
                },
            },
        },
    });

    if (!copyeditor || !copyeditor.isActive) {
        throw new Error(
            "The selected copyeditor account was not found or is inactive.",
        );
    }

    const canCopyedit = copyeditor.roles.some(
        (userRole) =>
            userRole.role === "SUPER_ADMIN" ||
            (
                userRole.role === "COPYEDITOR" &&
                userRole.journalId === submission.journalId
            ),
    );

    if (!canCopyedit) {
        throw new Error(
            "The selected user is not eligible to perform copyediting.",
        );
    }

    let dueDate: Date | null = null;

    if (dueDateValue) {
        dueDate = new Date(`${dueDateValue}T23:59:59`);

        if (Number.isNaN(dueDate.getTime())) {
            throw new Error(
                "The copyediting deadline is invalid.",
            );
        }

        if (dueDate <= new Date()) {
            throw new Error(
                "The copyediting deadline must be in the future.",
            );
        }
    }

    const existingAssignment =
        await prisma.productionAssignment.findUnique({
            where: {
                submissionId_stage_round: {
                    submissionId,
                    stage: "COPYEDITING",
                    round: 1,
                },
            },
            select: {
                id: true,
            },
        });

    if (existingAssignment) {
        throw new Error(
            "A first-round copyediting assignment already exists for this manuscript.",
        );
    }

    await prisma.$transaction(async (tx) => {
        const assignment =
            await tx.productionAssignment.create({
                data: {
                    submissionId,
                    assigneeId,
                    assignedById: editor.id,
                    stage: "COPYEDITING",
                    status: "PENDING",
                    round: 1,
                    instructions: instructions || null,
                    dueDate,
                },
            });

        await tx.submission.update({
            where: {
                id: submissionId,
            },
            data: {
                status: "COPYEDITING",
            },
        });

        await tx.notification.create({
            data: {
                userId: assigneeId,
                type: "PUBLICATION",
                title: "New Copyediting Assignment",
                message: `You have been assigned to copyedit "${submission.title}".`,
                link: `/copyeditor/assignments/${assignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editor.id,
                action: "CREATE",
                entity: "ProductionAssignment",
                entityId: assignment.id,
                metadata: {
                    event: "ASSIGN_COPYEDITOR",
                    submissionId,
                    copyeditorId: assigneeId,
                    stage: "COPYEDITING",
                    round: 1,
                    dueDate: dueDate?.toISOString() || null,
                },
            },
        });
    });

    refreshProductionPages(submissionId);

    redirect(
        `/editor/submissions/${submissionId}/production`,
    );
}

export async function assignTypesetter(
    formData: FormData,
) {
    const editor =
        await requireAnyActionRole(EDITORIAL_ROLES);

    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const typesetterId = String(
        formData.get("typesetterId") || "",
    ).trim();

    const dueDateValue = String(
        formData.get("dueDate") || "",
    ).trim();

    const instructions = String(
        formData.get("instructions") || "",
    ).trim();

    if (!submissionId) {
        throw new Error("Submission ID is missing.");
    }

    if (!typesetterId) {
        throw new Error("Select a typesetter.");
    }

    if (!dueDateValue) {
        throw new Error(
            "A typesetting deadline is required.",
        );
    }

    const dueDate = new Date(
        `${dueDateValue}T23:59:59`,
    );

    if (Number.isNaN(dueDate.getTime())) {
        throw new Error(
            "The typesetting deadline is invalid.",
        );
    }

    if (dueDate <= new Date()) {
        throw new Error(
            "The typesetting deadline must be in the future.",
        );
    }

    const submission =
        await prisma.submission.findUnique({
            where: {
                id: submissionId,
            },

            select: {
                id: true,
                title: true,
                status: true,
                journalId: true,

                productionAssignments: {
                    where: {
                        stage: "COPYEDITING",
                    },

                    orderBy: {
                        round: "desc",
                    },

                    take: 1,

                    select: {
                        id: true,
                        status: true,
                    },
                },
            },
        });

    if (!submission) {
        throw new Error("Submission not found.");
    }

    if (submission.status !== "TYPESETTING") {
        throw new Error(
            `The manuscript must be in typesetting before a typesetter can be assigned. Current status: ${submission.status}.`,
        );
    }

    await verifyEditorialPermission(
        editor,
        submission.journalId,
    );

    const copyeditingAssignment =
        submission.productionAssignments[0];

    if (
        !copyeditingAssignment ||
        copyeditingAssignment.status !== "APPROVED"
    ) {
        throw new Error(
            "Copyediting must be approved before assigning a typesetter.",
        );
    }

    const typesetter = await prisma.user.findUnique({
        where: {
            id: typesetterId,
        },

        select: {
            id: true,
            name: true,
            isActive: true,

            roles: {
                select: {
                    journalId: true,
                    role: true,
                },
            },
        },
    });

    if (!typesetter || !typesetter.isActive) {
        throw new Error(
            "The selected typesetter account was not found or is inactive.",
        );
    }

    const canTypeset = typesetter.roles.some(
        (userRole) =>
            userRole.role === "SUPER_ADMIN" ||
            (
                userRole.role === "TYPESETTER" &&
                userRole.journalId ===
                submission.journalId
            ),
    );

    if (!canTypeset) {
        throw new Error(
            "The selected user is not eligible to perform typesetting.",
        );
    }

    const existingAssignment =
        await prisma.productionAssignment.findFirst({
            where: {
                submissionId,
                stage: "TYPESETTING",
            },

            select: {
                id: true,
            },
        });

    if (existingAssignment) {
        throw new Error(
            "A typesetting assignment already exists for this manuscript.",
        );
    }

    await prisma.$transaction(async (tx) => {
        const assignment =
            await tx.productionAssignment.create({
                data: {
                    submissionId,
                    assigneeId: typesetterId,
                    assignedById: editor.id,
                    stage: "TYPESETTING",
                    status: "PENDING",
                    round: 1,
                    instructions:
                        instructions || null,
                    dueDate,
                },
            });

        await tx.notification.create({
            data: {
                userId: typesetterId,
                type: "PUBLICATION",
                title: "New Typesetting Assignment",
                message: `You have been assigned to typeset "${submission.title}".`,
                link: `/typesetter/assignments/${assignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editor.id,
                action: "CREATE",
                entity: "ProductionAssignment",
                entityId: assignment.id,

                metadata: {
                    event: "TYPESETTER_ASSIGNED",
                    submissionId,
                    typesetterId,
                    stage: "TYPESETTING",
                    round: 1,
                    dueDate: dueDate.toISOString(),
                },
            },
        });
    });

    refreshProductionPages(submissionId);

    redirect(
        `/editor/submissions/${submissionId}/production`,
    );
}

export async function assignProofreader(
    formData: FormData,
) {
    const editor = await requireAnyActionRole(EDITORIAL_ROLES);

    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const proofreaderId = String(
        formData.get("proofreaderId") || "",
    ).trim();

    const instructions = String(
        formData.get("instructions") || "",
    ).trim();

    const dueDateValue = String(
        formData.get("dueDate") || "",
    ).trim();

    if (!submissionId) {
        throw new Error("Submission ID is missing.");
    }

    if (!proofreaderId) {
        throw new Error("Select a proofreader.");
    }

    if (!dueDateValue) {
        throw new Error(
            "A proofreading deadline is required.",
        );
    }

    const dueDate = new Date(
        `${dueDateValue}T23:59:59`,
    );

    if (Number.isNaN(dueDate.getTime())) {
        throw new Error(
            "The proofreading deadline is invalid.",
        );
    }

    if (dueDate <= new Date()) {
        throw new Error(
            "The proofreading deadline must be in the future.",
        );
    }

    const submission = await prisma.submission.findUnique({
        where: {
            id: submissionId,
        },
        select: {
            id: true,
            title: true,
            journalId: true,
            status: true,
            productionAssignments: {
                where: {
                    stage: "TYPESETTING",
                },
                orderBy: {
                    round: "desc",
                },
                take: 1,
                select: {
                    id: true,
                    status: true,
                },
            },
        },
    });

    if (!submission) {
        throw new Error("Submission not found.");
    }

    if (submission.status !== "PROOFREADING") {
        throw new Error(
            "The manuscript must be in proofreading before a proofreader can be assigned.",
        );
    }

    await verifyEditorialPermission(
        editor,
        submission.journalId,
    );

    const latestTypesettingAssignment =
        submission.productionAssignments[0];

    if (
        !latestTypesettingAssignment ||
        latestTypesettingAssignment.status !== "APPROVED"
    ) {
        throw new Error(
            "Typesetting must be approved before assigning a proofreader.",
        );
    }

    const proofreader = await prisma.user.findUnique({
        where: {
            id: proofreaderId,
        },
        select: {
            id: true,
            name: true,
            isActive: true,
            roles: {
                select: {
                    journalId: true,
                    role: true,
                },
            },
        },
    });

    if (!proofreader || !proofreader.isActive) {
        throw new Error(
            "The selected proofreader does not exist or is inactive.",
        );
    }

    const canProofread = proofreader.roles.some(
        (userRole) =>
            userRole.role === "SUPER_ADMIN" ||
            (
                userRole.role === "PROOFREADER" &&
                userRole.journalId === submission.journalId
            ),
    );

    if (!canProofread) {
        throw new Error(
            "The selected user is not eligible to perform proofreading.",
        );
    }

    const existingAssignment =
        await prisma.productionAssignment.findFirst({
            where: {
                submissionId,
                stage: "PROOFREADING",
                round: 1,
            },
            select: {
                id: true,
            },
        });

    if (existingAssignment) {
        throw new Error(
            "A proofreading assignment already exists for this manuscript.",
        );
    }

    await prisma.$transaction(async (tx) => {
        const createdAssignment =
            await tx.productionAssignment.create({
                data: {
                    submissionId,
                    assigneeId: proofreaderId,
                    assignedById: editor.id,
                    stage: "PROOFREADING",
                    status: "PENDING",
                    round: 1,
                    instructions:
                        instructions ||
                        "Review the final galley carefully and report typographical, layout, formatting and publication errors.",
                    dueDate,
                },
            });

        await tx.notification.create({
            data: {
                userId: proofreaderId,
                type: "PUBLICATION",
                title: "New Proofreading Assignment",
                message: `You have been assigned to proofread "${submission.title}".`,
                link: `/proofreader/assignments/${createdAssignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: editor.id,
                action: "CREATE",
                entity: "ProductionAssignment",
                entityId: createdAssignment.id,
                metadata: {
                    event: "PROOFREADER_ASSIGNED",
                    submissionId,
                    proofreaderId,
                    stage: "PROOFREADING",
                    round: 1,
                    dueDate: dueDate.toISOString(),
                },
            },
        });
    });

    refreshProductionPages(submissionId);

    redirect(
        `/editor/submissions/${submissionId}/production`,
    );
}