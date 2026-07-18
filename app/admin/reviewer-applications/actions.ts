"use server";

import { revalidatePath } from "next/cache";

import { sendEmail } from "@/lib/email/send-email";
import {
    reviewerApplicationApprovedEmail,
    reviewerApplicationRejectedEmail,
} from "@/lib/email/templates";
import { requireAnyActionRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const REVIEWER_APPLICATION_MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "SECTION_EDITOR",
    "PUBLISHER",
] as const;

function refreshReviewerApplicationPages() {
    revalidatePath("/admin/reviewer-applications");
    revalidatePath("/admin/users");
    revalidatePath("/admin/reviews");
    revalidatePath("/reviewer/dashboard");
}

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    );
}

async function getApplicationForManager(
    applicationId: string,
    managerId: string,
) {
    const application =
        await prisma.reviewerApplication.findUnique({
            where: {
                id: applicationId,
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                    },
                },

                applicant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isActive: true,
                    },
                },
            },
        });

    if (!application) {
        throw new Error(
            "Reviewer application not found.",
        );
    }

    const managerRole =
        await prisma.userJournalRole.findFirst({
            where: {
                userId: managerId,
                journalId: application.journalId,

                role: {
                    in: [
                        ...REVIEWER_APPLICATION_MANAGER_ROLES,
                    ],
                },
            },

            select: {
                id: true,
            },
        });

    if (!managerRole) {
        throw new Error(
            "You do not have permission to manage reviewer applications for this journal.",
        );
    }

    return application;
}

export async function markApplicationUnderReview(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...REVIEWER_APPLICATION_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Reviewer application ID is missing.",
        );
    }

    const application =
        await getApplicationForManager(
            applicationId,
            manager.id,
        );

    if (
        application.status === "APPROVED" ||
        application.status === "REJECTED" ||
        application.status === "WITHDRAWN"
    ) {
        throw new Error(
            `This application cannot be moved to review because its current status is ${application.status}.`,
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.reviewerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                status: "UNDER_REVIEW",
                reviewedById: manager.id,
                reviewedAt: new Date(),
                reviewNotes: reviewNotes || null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "ReviewerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "REVIEWER_APPLICATION_MARKED_UNDER_REVIEW",
                    journalId: application.journalId,
                    applicantEmail: application.email,
                },
            },
        });
    });

    refreshReviewerApplicationPages();
}

export async function approveReviewerApplication(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...REVIEWER_APPLICATION_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Reviewer application ID is missing.",
        );
    }

    const application =
        await getApplicationForManager(
            applicationId,
            manager.id,
        );

    if (application.status === "APPROVED") {
        throw new Error(
            "This reviewer application has already been approved.",
        );
    }

    if (application.status === "WITHDRAWN") {
        throw new Error(
            "A withdrawn application cannot be approved.",
        );
    }

    const existingUser =
        await prisma.user.findUnique({
            where: {
                email: application.email,
            },

            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
            },
        });

    await prisma.$transaction(async (tx) => {
        let reviewerUserId: string;

        if (existingUser) {
            if (!existingUser.isActive) {
                throw new Error(
                    "The applicant account is inactive. Activate the account before approval.",
                );
            }

            reviewerUserId = existingUser.id;
        } else {
            const createdUser =
                await tx.user.create({
                    data: {
                        name: application.fullName,
                        email: application.email,
                        phone: application.phone,
                        affiliation:
                            application.affiliation,
                        country: application.country,
                        orcid: application.orcid,
                        isActive: true,
                    },
                });

            reviewerUserId = createdUser.id;
        }

        await tx.userJournalRole.upsert({
            where: {
                userId_journalId_role: {
                    userId: reviewerUserId,
                    journalId:
                        application.journalId,
                    role: "REVIEWER",
                },
            },

            update: {},

            create: {
                userId: reviewerUserId,
                journalId:
                    application.journalId,
                role: "REVIEWER",
            },
        });

        await tx.reviewerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                userId: reviewerUserId,
                status: "APPROVED",
                reviewedById: manager.id,
                reviewedAt: new Date(),
                reviewNotes: reviewNotes || null,
            },
        });

        await tx.notification.create({
            data: {
                userId: reviewerUserId,
                type: "REVIEW",
                title:
                    "Reviewer Application Approved",
                message:
                    `Your reviewer application for ${application.journal.name} has been approved.`,
                link: "/reviewer/dashboard",
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "ReviewerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "REVIEWER_APPLICATION_APPROVED",
                    journalId:
                        application.journalId,
                    reviewerUserId,
                    applicantEmail:
                        application.email,
                    assignedRole: "REVIEWER",
                },
            },
        });
    });

    const appUrl = getAppUrl();

    const approvalEmail =
        reviewerApplicationApprovedEmail({
            name: application.fullName,
            journalName:
                application.journal.name,
            reviewerDashboardUrl:
                `${appUrl}/reviewer/dashboard`,
        });

    try {
        await sendEmail({
            to: application.email,
            subject: approvalEmail.subject,
            html: approvalEmail.html,
            text: approvalEmail.text,
        });
    } catch (error) {
        console.error(
            "Reviewer approval email failed:",
            error,
        );
    }

    refreshReviewerApplicationPages();
}

export async function rejectReviewerApplication(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...REVIEWER_APPLICATION_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Reviewer application ID is missing.",
        );
    }

    if (!reviewNotes) {
        throw new Error(
            "Enter a reason or internal note before rejecting the application.",
        );
    }

    const application =
        await getApplicationForManager(
            applicationId,
            manager.id,
        );

    if (application.status === "APPROVED") {
        throw new Error(
            "An approved application cannot be rejected. Remove the reviewer role through user management if necessary.",
        );
    }

    if (application.status === "WITHDRAWN") {
        throw new Error(
            "A withdrawn application cannot be rejected.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.reviewerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                status: "REJECTED",
                reviewedById: manager.id,
                reviewedAt: new Date(),
                reviewNotes,
            },
        });

        if (application.userId) {
            await tx.notification.create({
                data: {
                    userId: application.userId,
                    type: "REVIEW",
                    title:
                        "Reviewer Application Decision",
                    message:
                        `A decision has been made on your reviewer application for ${application.journal.name}.`,
                    link: "/account",
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "ReviewerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "REVIEWER_APPLICATION_REJECTED",
                    journalId:
                        application.journalId,
                    applicantEmail:
                        application.email,
                    reviewNotes,
                },
            },
        });
    });

    const appUrl = getAppUrl();

    const rejectionEmail =
        reviewerApplicationRejectedEmail({
            name: application.fullName,
            journalName:
                application.journal.name,
            reviewNotes,
            contactUrl: `${appUrl}/contact`,
        });

    try {
        await sendEmail({
            to: application.email,
            subject: rejectionEmail.subject,
            html: rejectionEmail.html,
            text: rejectionEmail.text,
        });
    } catch (error) {
        console.error(
            "Reviewer rejection email failed:",
            error,
        );
    }

    refreshReviewerApplicationPages();
}

export async function reopenReviewerApplication(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...REVIEWER_APPLICATION_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Reviewer application ID is missing.",
        );
    }

    const application =
        await getApplicationForManager(
            applicationId,
            manager.id,
        );

    if (
        application.status !== "REJECTED" &&
        application.status !== "UNDER_REVIEW"
    ) {
        throw new Error(
            "Only rejected or under-review applications can be returned to pending.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.reviewerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                status: "PENDING",
                reviewedById: null,
                reviewedAt: null,
                reviewNotes: null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "ReviewerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "REVIEWER_APPLICATION_REOPENED",
                    journalId:
                        application.journalId,
                    applicantEmail:
                        application.email,
                },
            },
        });
    });

    refreshReviewerApplicationPages();
}
