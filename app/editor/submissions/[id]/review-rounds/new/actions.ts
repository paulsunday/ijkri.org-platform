"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { EDITORIAL_ROLES } from "@/lib/auth/role-groups";
import { sendEmail } from "@/lib/email/send-email";
import { reviewerInvitationEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

const VALID_BLIND_TYPES = [
    "DOUBLE_BLIND",
    "SINGLE_BLIND",
    "OPEN",
] as const;

type BlindTypeValue =
    (typeof VALID_BLIND_TYPES)[number];

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

async function deliverReviewerInvitation({
    reviewerName,
    reviewerEmail,
    journalName,
    manuscriptTitle,
    reviewRound,
    dueDate,
    assignmentId,
}: {
    reviewerName: string;
    reviewerEmail: string;
    journalName: string;
    manuscriptTitle: string;
    reviewRound: number;
    dueDate: Date;
    assignmentId: string;
}) {
    const invitationUrl =
        `${getAppUrl()}/reviewer/reviews/${assignmentId}`;

    const emailContent =
        reviewerInvitationEmail({
            reviewerName,
            journalName,
            manuscriptTitle,
            reviewRound,
            dueDate,
            invitationUrl,
        });

    try {
        await sendEmail({
            to: reviewerEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
        });
    } catch (error) {
        console.error(
            "Reviewer invitation email delivery failed:",
            {
                assignmentId,
                reviewerEmail,
                reviewRound,
                error,
            },
        );
    }
}

export async function startNewReviewRound(
    formData: FormData,
) {
    const editor =
        await requireAnyActionRole(
            EDITORIAL_ROLES,
        );

    const submissionId = String(
        formData.get("submissionId") || "",
    ).trim();

    const reviewerIds = Array.from(
        new Set(
            formData
                .getAll("reviewerIds")
                .map((value) =>
                    String(value).trim(),
                )
                .filter(Boolean),
        ),
    );

    const dueDateValue = String(
        formData.get("dueDate") || "",
    ).trim();

    const blindType = String(
        formData.get("blindType") || "",
    ).trim() as BlindTypeValue;

    if (!submissionId) {
        throw new Error(
            "Submission ID is missing.",
        );
    }

    if (reviewerIds.length === 0) {
        throw new Error(
            "Select at least one reviewer before starting the new review round.",
        );
    }

    if (!dueDateValue) {
        throw new Error(
            "A review deadline is required.",
        );
    }

    if (
        !VALID_BLIND_TYPES.includes(
            blindType,
        )
    ) {
        throw new Error(
            "Please select a valid review model.",
        );
    }

    const dueDate = new Date(
        `${dueDateValue}T23:59:59`,
    );

    if (
        Number.isNaN(dueDate.getTime())
    ) {
        throw new Error(
            "The selected review deadline is invalid.",
        );
    }

    if (dueDate <= new Date()) {
        throw new Error(
            "The review deadline must be in the future.",
        );
    }

    const submission =
        await prisma.submission.findUnique({
            where: {
                id: submissionId,
            },

            include: {
                journal: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                    },
                },

                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },

                    take: 1,

                    select: {
                        id: true,
                        versionNumber: true,
                        createdAt: true,
                    },
                },
            },
        });

    if (!submission) {
        throw new Error(
            "Submission not found.",
        );
    }

    const editorJournalRole =
        await prisma.userJournalRole.findFirst({
            where: {
                userId: editor.id,
                journalId: submission.journalId,

                role: {
                    in: EDITORIAL_ROLES,
                },
            },

            select: {
                id: true,
            },
        });

    if (!editorJournalRole) {
        throw new Error(
            "You do not have editorial permission for this journal.",
        );
    }

    if (!editor.isActive) {
        throw new Error(
            "This editor account is inactive.",
        );
    }

    const blockedStatuses = [
        "ACCEPTED",
        "REJECTED",
        "PUBLISHED",
        "WITHDRAWN",
    ] as const;

    if (
        blockedStatuses.includes(
            submission.status as
            (typeof blockedStatuses)[number],
        )
    ) {
        throw new Error(
            `A new review round cannot be started because this submission is currently ${submission.status
                .replaceAll("_", " ")
                .toLowerCase()}.`,
        );
    }

    const latestVersion =
        submission.versions[0];

    if (!latestVersion) {
        throw new Error(
            "No revised manuscript version was found. The author must upload a revision before another review round can begin.",
        );
    }

    const previousRound =
        submission.currentReviewRound || 1;

    const nextRound =
        previousRound + 1;

    const existingAssignments =
        await prisma.reviewAssignment.count({
            where: {
                submissionId,
                reviewRound: nextRound,
            },
        });

    if (existingAssignments > 0) {
        throw new Error(
            `Review round ${nextRound} has already been created for this submission.`,
        );
    }

    const reviewers =
        await prisma.user.findMany({
            where: {
                id: {
                    in: reviewerIds,
                },

                isActive: true,

                roles: {
                    some: {
                        journalId:
                            submission.journalId,
                        role: "REVIEWER",
                    },
                },
            },

            select: {
                id: true,
                name: true,
                email: true,
            },
        });

    if (
        reviewers.length !==
        reviewerIds.length
    ) {
        throw new Error(
            "One or more selected reviewers are inactive, unavailable, or do not have a reviewer role for this journal.",
        );
    }

    const invitedAt = new Date();

    const createdAssignments =
        await prisma.$transaction(
            async (tx) => {
                const assignments: Array<{
                    id: string;
                    reviewerId: string;
                    reviewerName: string;
                    reviewerEmail: string;
                }> = [];

                for (const reviewer of reviewers) {
                    const assignment =
                        await tx.reviewAssignment.create({
                            data: {
                                submissionId,
                                reviewerId: reviewer.id,

                                submissionVersionId:
                                    latestVersion.id,

                                reviewRound: nextRound,
                                status: "INVITED",
                                invitedAt,
                                dueDate,
                                blindType,
                            },

                            select: {
                                id: true,
                                reviewerId: true,
                            },
                        });

                    assignments.push({
                        id: assignment.id,
                        reviewerId:
                            assignment.reviewerId,
                        reviewerName:
                            reviewer.name,
                        reviewerEmail:
                            reviewer.email,
                    });

                    await tx.notification.create({
                        data: {
                            userId: reviewer.id,
                            type: "REVIEW",

                            title:
                                `Review invitation — Round ${nextRound}`,

                            message:
                                `You have been invited to review Version ${latestVersion.versionNumber} of "${submission.title}" in review round ${nextRound}.`,

                            link:
                                `/reviewer/reviews/${assignment.id}`,
                        },
                    });
                }

                await tx.submission.update({
                    where: {
                        id: submissionId,
                    },

                    data: {
                        currentReviewRound:
                            nextRound,

                        status:
                            "UNDER_PEER_REVIEW",
                    },
                });

                await tx.activityLog.create({
                    data: {
                        userId: editor.id,
                        action: "ASSIGN_REVIEWER",
                        entity: "Submission",
                        entityId: submissionId,

                        metadata: {
                            event:
                                "NEW_REVIEW_ROUND_STARTED",

                            submissionId,
                            submissionTitle:
                                submission.title,

                            journalId:
                                submission.journalId,

                            journalName:
                                submission.journal.name,

                            previousRound,
                            newRound: nextRound,

                            submissionVersionId:
                                latestVersion.id,

                            versionNumber:
                                latestVersion.versionNumber,

                            reviewerCount:
                                reviewers.length,

                            reviewerIds:
                                reviewers.map(
                                    (reviewer) =>
                                        reviewer.id,
                                ),

                            blindType,
                            dueDate:
                                dueDate.toISOString(),
                        },
                    },
                });

                return assignments;
            },
        );

    await Promise.allSettled(
        createdAssignments.map(
            (assignment) =>
                deliverReviewerInvitation({
                    reviewerName:
                        assignment.reviewerName,

                    reviewerEmail:
                        assignment.reviewerEmail,

                    journalName:
                        submission.journal.name,

                    manuscriptTitle:
                        submission.title,

                    reviewRound:
                        nextRound,

                    dueDate,

                    assignmentId:
                        assignment.id,
                }),
        ),
    );

    revalidatePath(
        `/editor/submissions/${submissionId}`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/revisions`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/reviewers`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/review-rounds`,
    );

    revalidatePath(
        `/editor/submissions/${submissionId}/review-rounds/new`,
    );

    revalidatePath(
        `/author/submissions/${submissionId}`,
    );

    revalidatePath(
        "/editor/dashboard",
    );

    revalidatePath(
        "/reviewer/dashboard",
    );

    revalidatePath(
        "/admin/reviews",
    );

    redirect(
        `/editor/submissions/${submissionId}/reviewers`,
    );
}