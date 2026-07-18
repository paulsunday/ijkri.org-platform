"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email/send-email";
import {
    accountActivationEmail,
    careerApplicationApprovedEmail,
    careerApplicationRejectedEmail,
    careerApplicationShortlistedEmail,
    careerApplicationUnderReviewEmail,
    careerInterviewScheduledEmail,
} from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

import {
    createAccountActivationLink,
} from "@/lib/auth/account-activation";

const CAREER_MANAGER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR_IN_CHIEF",
    "MANAGING_EDITOR",
    "PUBLISHER",
] as const;

const APPOINTABLE_ROLES = {
    EDITOR_IN_CHIEF: "EDITOR_IN_CHIEF",
    MANAGING_EDITOR: "MANAGING_EDITOR",
    SECTION_EDITOR: "SECTION_EDITOR",
    REVIEWER: "REVIEWER",
    COPYEDITOR: "COPYEDITOR",
    PROOFREADER: "PROOFREADER",
    TYPESETTER: "TYPESETTER",
} as const;

function refreshCareerPages() {
    revalidatePath("/admin/career-applications");
    revalidatePath("/admin/users");
    revalidatePath("/admin/editorial-board");
    revalidatePath("/careers/apply");
    revalidatePath("/account");
}

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

async function deliverCareerEmail({
    to,
    applicationId,
    emailContent,
    event,
}: {
    to: string;
    applicationId: string;
    emailContent: {
        subject: string;
        html: string;
        text: string;
    };
    event: string;
}) {
    try {
        await sendEmail({
            to,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
        });
    } catch (error) {
        console.error(
            `Career email delivery failed: ${event}`,
            {
                applicationId,
                recipient: to,
                error,
            },
        );
    }
}

async function getApplicationForManager(
    applicationId: string,
    managerId: string,
) {
    const application =
        await prisma.careerApplication.findUnique({
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
            "Career application not found.",
        );
    }

    const managerRole =
        await prisma.userJournalRole.findFirst({
            where: {
                userId: managerId,
                journalId: application.journalId,

                role: {
                    in: [...CAREER_MANAGER_ROLES],
                },
            },

            select: {
                id: true,
            },
        });

    if (!managerRole) {
        throw new Error(
            "You do not have permission to manage career applications for this journal.",
        );
    }

    return application;
}

export async function markCareerApplicationUnderReview(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...CAREER_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Career application ID is missing.",
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
        await tx.careerApplication.update({
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

        if (application.userId) {
            await tx.notification.create({
                data: {
                    userId: application.userId,
                    type: "GENERAL",
                    title:
                        "Career Application Under Review",
                    message:
                        `Your application for ${application.position
                            .replaceAll("_", " ")
                            .toLowerCase()} is now under review.`,
                    link: "/account",
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "CareerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "CAREER_APPLICATION_MARKED_UNDER_REVIEW",
                    journalId: application.journalId,
                    position: application.position,
                    applicantEmail: application.email,
                },
            },
        });
    });

    const emailContent =
        careerApplicationUnderReviewEmail({
            name: application.fullName,
            position: application.position,
            journalName: application.journal.name,
        });

    await deliverCareerEmail({
        to: application.email,
        applicationId,
        emailContent,
        event:
            "CAREER_APPLICATION_MARKED_UNDER_REVIEW",
    });

    refreshCareerPages();
}

export async function shortlistCareerApplication(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...CAREER_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Career application ID is missing.",
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
            "This application cannot be shortlisted in its current status.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.careerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                status: "SHORTLISTED",
                reviewedById: manager.id,
                reviewedAt: new Date(),
                reviewNotes: reviewNotes || null,
            },
        });

        if (application.userId) {
            await tx.notification.create({
                data: {
                    userId: application.userId,
                    type: "GENERAL",
                    title:
                        "Career Application Shortlisted",
                    message:
                        `Your application for ${application.position
                            .replaceAll("_", " ")
                            .toLowerCase()} has been shortlisted.`,
                    link: "/account",
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "CareerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "CAREER_APPLICATION_SHORTLISTED",
                    journalId: application.journalId,
                    position: application.position,
                    applicantEmail: application.email,
                },
            },
        });
    });

    const appUrl = getAppUrl();

    const emailContent =
        careerApplicationShortlistedEmail({
            name: application.fullName,
            position: application.position,
            journalName: application.journal.name,
            contactUrl: `${appUrl}/contact`,
        });

    await deliverCareerEmail({
        to: application.email,
        applicationId,
        emailContent,
        event:
            "CAREER_APPLICATION_SHORTLISTED",
    });

    refreshCareerPages();
}

export async function scheduleCareerInterview(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...CAREER_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const interviewDateValue = String(
        formData.get("interviewDate") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Career application ID is missing.",
        );
    }

    if (!interviewDateValue) {
        throw new Error(
            "Select an interview date and time.",
        );
    }

    const interviewDate = new Date(
        interviewDateValue,
    );

    if (
        Number.isNaN(interviewDate.getTime()) ||
        interviewDate <= new Date()
    ) {
        throw new Error(
            "The interview date must be a valid future date.",
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
            "An interview cannot be scheduled for this application.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.careerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                status: "INTERVIEW_SCHEDULED",
                interviewDate,
                reviewedById: manager.id,
                reviewedAt: new Date(),
                reviewNotes: reviewNotes || null,
            },
        });

        if (application.userId) {
            await tx.notification.create({
                data: {
                    userId: application.userId,
                    type: "GENERAL",
                    title:
                        "Career Interview Scheduled",
                    message:
                        `An interview has been scheduled regarding your ${application.position
                            .replaceAll("_", " ")
                            .toLowerCase()} application.`,
                    link: "/account",
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "CareerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "CAREER_APPLICATION_INTERVIEW_SCHEDULED",
                    journalId: application.journalId,
                    position: application.position,
                    applicantEmail: application.email,
                    interviewDate:
                        interviewDate.toISOString(),
                },
            },
        });
    });

    const appUrl = getAppUrl();

    const emailContent =
        careerInterviewScheduledEmail({
            name: application.fullName,
            position: application.position,
            journalName: application.journal.name,
            interviewDate,
            reviewNotes: reviewNotes || null,
            contactUrl: `${appUrl}/contact`,
        });

    await deliverCareerEmail({
        to: application.email,
        applicationId,
        emailContent,
        event:
            "CAREER_APPLICATION_INTERVIEW_SCHEDULED",
    });

    refreshCareerPages();
}

export async function approveCareerApplication(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...CAREER_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Career application ID is missing.",
        );
    }

    const application =
        await getApplicationForManager(
            applicationId,
            manager.id,
        );

    if (application.status === "APPROVED") {
        throw new Error(
            "This application has already been approved.",
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
                isActive: true,
                passwordHash: true,
            },
        });

    let assignedRole: string | null = null;
    let approvedUserId = "";
    let requiresActivation = false;

    await prisma.$transaction(async (tx) => {
        let userId: string;

        if (existingUser) {
            if (!existingUser.isActive) {
                throw new Error(
                    "The applicant account is inactive. Activate it before approval.",
                );
            }

            userId = existingUser.id;
            requiresActivation =
                !existingUser.passwordHash;
        } else {
            const user = await tx.user.create({
                data: {
                    name: application.fullName,
                    email: application.email,
                    phone: application.phone,
                    country: application.country,
                    affiliation:
                        application.affiliation,
                    orcid: application.orcid,
                    isActive: true,
                },

                select: {
                    id: true,
                },
            });

            userId = user.id;
            requiresActivation = true;
        }

        approvedUserId = userId;

        const journalRole =
            APPOINTABLE_ROLES[
            application.position as keyof typeof APPOINTABLE_ROLES
            ];

        assignedRole = journalRole || null;

        if (journalRole) {
            await tx.userJournalRole.upsert({
                where: {
                    userId_journalId_role: {
                        userId,
                        journalId:
                            application.journalId,
                        role: journalRole,
                    },
                },

                update: {},

                create: {
                    userId,
                    journalId:
                        application.journalId,
                    role: journalRole,
                },
            });
        }

        await tx.careerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                userId,
                status: "APPROVED",
                reviewedById: manager.id,
                reviewedAt: new Date(),
                reviewNotes:
                    reviewNotes || null,
            },
        });

        await tx.notification.create({
            data: {
                userId,
                type: "GENERAL",
                title:
                    "Career Application Approved",
                message:
                    requiresActivation
                        ? "Your application has been approved. Activate your account using the link sent to your email."
                        : `Your application for ${application.position
                            .replaceAll("_", " ")
                            .toLowerCase()} has been approved.`,
                link:
                    requiresActivation
                        ? "/login"
                        : "/account",
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "CareerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "CAREER_APPLICATION_APPROVED",
                    journalId:
                        application.journalId,
                    position:
                        application.position,
                    applicantUserId: userId,
                    applicantEmail:
                        application.email,
                    assignedRole:
                        journalRole || null,
                    requiresActivation,
                },
            },
        });
    });

    if (!approvedUserId) {
        throw new Error(
            "The approved user account could not be resolved.",
        );
    }

    if (requiresActivation) {
        try {
            const {
                activationUrl,
                expiresInHours,
            } =
                await createAccountActivationLink(
                    approvedUserId,
                );

            const activationEmail =
                accountActivationEmail({
                    name: application.fullName,
                    journalName:
                        application.journal.name,
                    assignedRole:
                        assignedRole ||
                        application.position,
                    activationUrl,
                    expiresInHours,
                });

            await deliverCareerEmail({
                to: application.email,
                applicationId,
                emailContent:
                    activationEmail,
                event:
                    "STAFF_ACCOUNT_ACTIVATION_SENT",
            });
        } catch (error) {
            console.error(
                "Staff account activation setup failed:",
                {
                    applicationId,
                    userId: approvedUserId,
                    recipient:
                        application.email,
                    error,
                },
            );
        }
    } else {
        const appUrl = getAppUrl();

        const approvedEmail =
            careerApplicationApprovedEmail({
                name: application.fullName,
                position:
                    application.position,
                journalName:
                    application.journal.name,
                assignedRole,
                accountUrl:
                    `${appUrl}/account`,
            });

        await deliverCareerEmail({
            to: application.email,
            applicationId,
            emailContent:
                approvedEmail,
            event:
                "CAREER_APPLICATION_APPROVED",
        });
    }

    refreshCareerPages();
}

export async function rejectCareerApplication(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...CAREER_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    const reviewNotes = String(
        formData.get("reviewNotes") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Career application ID is missing.",
        );
    }

    if (!reviewNotes) {
        throw new Error(
            "Enter a reason before rejecting the application.",
        );
    }

    const application =
        await getApplicationForManager(
            applicationId,
            manager.id,
        );

    if (application.status === "APPROVED") {
        throw new Error(
            "An approved application cannot be rejected.",
        );
    }

    if (application.status === "WITHDRAWN") {
        throw new Error(
            "A withdrawn application cannot be rejected.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.careerApplication.update({
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
                    type: "GENERAL",
                    title:
                        "Career Application Decision",
                    message:
                        "A decision has been made regarding your career application.",
                    link: "/account",
                },
            });
        }

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "CareerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "CAREER_APPLICATION_REJECTED",
                    journalId: application.journalId,
                    position: application.position,
                    applicantEmail: application.email,
                    reviewNotes,
                },
            },
        });
    });

    const appUrl = getAppUrl();

    const emailContent =
        careerApplicationRejectedEmail({
            name: application.fullName,
            position: application.position,
            journalName: application.journal.name,
            reviewNotes,
            contactUrl: `${appUrl}/contact`,
        });

    await deliverCareerEmail({
        to: application.email,
        applicationId,
        emailContent,
        event:
            "CAREER_APPLICATION_REJECTED",
    });

    refreshCareerPages();
}

export async function reopenCareerApplication(
    formData: FormData,
) {
    const manager =
        await requireAnyActionRole([
            ...CAREER_MANAGER_ROLES,
        ]);

    const applicationId = String(
        formData.get("applicationId") || "",
    ).trim();

    if (!applicationId) {
        throw new Error(
            "Career application ID is missing.",
        );
    }

    const application =
        await getApplicationForManager(
            applicationId,
            manager.id,
        );

    if (
        application.status !== "REJECTED" &&
        application.status !==
        "UNDER_REVIEW" &&
        application.status !== "SHORTLISTED" &&
        application.status !==
        "INTERVIEW_SCHEDULED"
    ) {
        throw new Error(
            "This application cannot be returned to pending.",
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.careerApplication.update({
            where: {
                id: applicationId,
            },

            data: {
                status: "PENDING",
                interviewDate: null,
                reviewedById: null,
                reviewedAt: null,
                reviewNotes: null,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: manager.id,
                action: "UPDATE",
                entity: "CareerApplication",
                entityId: applicationId,

                metadata: {
                    event:
                        "CAREER_APPLICATION_REOPENED",
                    journalId: application.journalId,
                    position: application.position,
                    applicantEmail: application.email,
                },
            },
        });
    });

    refreshCareerPages();
}
