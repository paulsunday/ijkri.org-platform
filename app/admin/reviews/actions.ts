"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { sendEmail } from "@/lib/email/send-email";
import { prisma } from "@/lib/prisma";

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

function formatDate(value: Date | null) {
    if (!value) {
        return "No deadline has been specified.";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(value);
}

export async function sendReviewerReminder(
    formData: FormData,
) {
    const admin =
        await requireAnyActionRole(ADMIN_ROLES);

    const assignmentId = String(
        formData.get("assignmentId") || "",
    ).trim();

    if (!assignmentId) {
        throw new Error(
            "Review assignment ID is missing.",
        );
    }

    const assignment =
        await prisma.reviewAssignment.findUnique({
            where: {
                id: assignmentId,
            },

            include: {
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isActive: true,
                    },
                },

                submission: {
                    select: {
                        id: true,
                        title: true,

                        journal: {
                            select: {
                                name: true,
                                shortName: true,
                            },
                        },
                    },
                },
            },
        });

    if (!assignment) {
        throw new Error(
            "Review assignment not found.",
        );
    }

    if (!assignment.reviewer.isActive) {
        throw new Error(
            "The reviewer account is inactive.",
        );
    }

    if (
        assignment.status !== "INVITED" &&
        assignment.status !== "ACCEPTED"
    ) {
        throw new Error(
            "A reminder can only be sent for an invited or accepted review assignment.",
        );
    }

    const reviewUrl =
        `${getAppUrl()}/reviewer/reviews/${assignment.id}`;

    const dueDateText =
        formatDate(assignment.dueDate);

    const subject =
        assignment.status === "INVITED"
            ? `Reminder: review invitation for "${assignment.submission.title}"`
            : `Reminder: review due for "${assignment.submission.title}"`;

    const text = [
        `Dear ${assignment.reviewer.name},`,
        "",
        `This is a reminder concerning the manuscript "${assignment.submission.title}" for ${assignment.submission.journal.name}.`,
        "",
        assignment.status === "INVITED"
            ? "You have not yet responded to the review invitation."
            : "You accepted this review assignment, but the review report has not yet been submitted.",
        "",
        `Review round: ${assignment.reviewRound}`,
        `Deadline: ${dueDateText}`,
        "",
        `Open the review assignment: ${reviewUrl}`,
        "",
        "Thank you for supporting the journal's peer-review process.",
    ].join("\n");

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Dear ${assignment.reviewer.name},</p>

      <p>
        This is a reminder concerning the manuscript
        <strong>${assignment.submission.title}</strong>
        for ${assignment.submission.journal.name}.
      </p>

      <p>
        ${assignment.status === "INVITED"
            ? "You have not yet responded to the review invitation."
            : "You accepted this review assignment, but the review report has not yet been submitted."
        }
      </p>

      <p>
        <strong>Review round:</strong>
        ${assignment.reviewRound}<br />
        <strong>Deadline:</strong>
        ${dueDateText}
      </p>

      <p>
        <a
          href="${reviewUrl}"
          style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;"
        >
          Open Review Assignment
        </a>
      </p>

      <p>
        Thank you for supporting the journal's peer-review process.
      </p>
    </div>
  `;

    await sendEmail({
        to: assignment.reviewer.email,
        subject,
        html,
        text,
    });

    await prisma.$transaction(async (tx) => {
        await tx.notification.create({
            data: {
                userId: assignment.reviewer.id,
                type: "REVIEW",
                title: "Review reminder",
                message:
                    `A reminder was sent for "${assignment.submission.title}" in review round ${assignment.reviewRound}.`,
                link:
                    `/reviewer/reviews/${assignment.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: admin.id,
                action: "UPDATE",
                entity: "ReviewAssignment",
                entityId: assignment.id,

                metadata: {
                    event: "REVIEW_REMINDER_SENT",
                    submissionId:
                        assignment.submission.id,
                    reviewerId:
                        assignment.reviewer.id,
                    reviewerEmail:
                        assignment.reviewer.email,
                    reviewRound:
                        assignment.reviewRound,
                    status:
                        assignment.status,
                    dueDate:
                        assignment.dueDate?.toISOString() ||
                        null,
                },
            },
        });
    });

    revalidatePath("/admin/reviews");

    revalidatePath(
        `/editor/submissions/${assignment.submission.id}/reviewers`,
    );

    revalidatePath(
        `/editor/submissions/${assignment.submission.id}/review-rounds`,
    );

    revalidatePath("/reviewer/dashboard");

    revalidatePath(
        `/reviewer/reviews/${assignment.id}`,
    );
}