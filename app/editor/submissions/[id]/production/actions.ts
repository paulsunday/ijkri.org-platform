"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function assignCopyeditor(formData: FormData) {
    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const assigneeId = String(
        formData.get("assigneeId") || "",
    ).trim();

    const assignedById = String(
        formData.get("assignedById") || "",
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

    if (!assignedById) {
        throw new Error("Assigning editor ID is missing.");
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

    const assigningEditor = await prisma.user.findUnique({
        where: {
            id: assignedById,
        },
        select: {
            id: true,
            name: true,
            isActive: true,
            roles: {
                where: {
                    journalId: submission.journalId,
                    role: {
                        in: [
                            "SUPER_ADMIN",
                            "ADMIN",
                            "EDITOR_IN_CHIEF",
                            "MANAGING_EDITOR",
                            "SECTION_EDITOR",
                        ],
                    },
                },
                select: {
                    id: true,
                    role: true,
                },
            },
        },
    });

    if (!assigningEditor || !assigningEditor.isActive) {
        throw new Error(
            "The assigning editor account was not found or is inactive.",
        );
    }

    if (assigningEditor.roles.length === 0) {
        throw new Error(
            "The selected user does not have an editorial role for this journal.",
        );
    }

    const copyeditor = await prisma.user.findUnique({
        where: {
            id: assigneeId,
        },
        select: {
            id: true,
            name: true,
            isActive: true,
            roles: {
                where: {
                    journalId: submission.journalId,
                    role: "COPYEDITOR",
                },
                select: {
                    id: true,
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

    if (copyeditor.roles.length === 0) {
        throw new Error(
            "The selected user does not have the COPYEDITOR role for this journal.",
        );
    }

    let dueDate: Date | null = null;

    if (dueDateValue) {
        dueDate = new Date(`${dueDateValue}T23:59:59`);

        if (Number.isNaN(dueDate.getTime())) {
            throw new Error("The copyediting deadline is invalid.");
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
                    assignedById,
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
                userId: assignedById,
                action: "UPDATE",
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

    revalidatePath(
        `/editor/submissions/${submissionId}/production`,
    );
    revalidatePath(`/editor/submissions/${submissionId}`);
    revalidatePath("/editor/dashboard");
    revalidatePath("/copyeditor/dashboard");

    redirect(
        `/editor/submissions/${submissionId}/production`,
    );
}