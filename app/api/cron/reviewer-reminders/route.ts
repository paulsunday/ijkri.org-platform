import { NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPEN_REVIEW_STATUSES = [
    "INVITED",
    "ACCEPTED",
] as const;

const MILLISECONDS_PER_DAY =
    24 * 60 * 60 * 1000;

type ReminderCategory =
    | "INVITATION_PENDING"
    | "DUE_IN_THREE_DAYS"
    | "DUE_TOMORROW"
    | "OVERDUE";

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

function getStartOfDay(value: Date) {
    const date = new Date(value);

    date.setUTCHours(0, 0, 0, 0);

    return date;
}

function getDaysUntil(
    dueDate: Date,
    now: Date,
) {
    const dueDay = getStartOfDay(dueDate);
    const currentDay = getStartOfDay(now);

    return Math.round(
        (dueDay.getTime() - currentDay.getTime()) /
        MILLISECONDS_PER_DAY,
    );
}

function formatDate(value: Date | null) {
    if (!value) {
        return "No deadline specified";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(value);
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function determineReminderCategory({
    status,
    invitedAt,
    dueDate,
    now,
}: {
    status: string;
    invitedAt: Date;
    dueDate: Date | null;
    now: Date;
}): ReminderCategory | null {
    if (
        !OPEN_REVIEW_STATUSES.includes(
            status as
            (typeof OPEN_REVIEW_STATUSES)[number],
        )
    ) {
        return null;
    }

    if (dueDate) {
        const daysUntilDue = getDaysUntil(
            dueDate,
            now,
        );

        if (daysUntilDue < 0) {
            return "OVERDUE";
        }

        if (daysUntilDue === 1) {
            return "DUE_TOMORROW";
        }

        if (daysUntilDue === 3) {
            return "DUE_IN_THREE_DAYS";
        }
    }

    if (status === "INVITED") {
        const invitationAge =
            now.getTime() - invitedAt.getTime();

        if (
            invitationAge >=
            3 * MILLISECONDS_PER_DAY
        ) {
            return "INVITATION_PENDING";
        }
    }

    return null;
}

function getReminderContent({
    category,
    reviewerName,
    manuscriptTitle,
    journalName,
    reviewRound,
    dueDate,
    reviewUrl,
}: {
    category: ReminderCategory;
    reviewerName: string;
    manuscriptTitle: string;
    journalName: string;
    reviewRound: number;
    dueDate: Date | null;
    reviewUrl: string;
}) {
    let subject = "";
    let message = "";

    switch (category) {
        case "INVITATION_PENDING":
            subject =
                `Reminder: review invitation for "${manuscriptTitle}"`;

            message =
                "You have not yet accepted or declined this review invitation.";
            break;

        case "DUE_IN_THREE_DAYS":
            subject =
                `Review due in three days: "${manuscriptTitle}"`;

            message =
                "Your accepted review assignment is due in three days.";
            break;

        case "DUE_TOMORROW":
            subject =
                `Review due tomorrow: "${manuscriptTitle}"`;

            message =
                "Your accepted review assignment is due tomorrow.";
            break;

        case "OVERDUE":
            subject =
                `Overdue review reminder: "${manuscriptTitle}"`;

            message =
                "The deadline for this review assignment has passed, and the report is still outstanding.";
            break;
    }

    const safeReviewerName =
        escapeHtml(reviewerName);

    const safeManuscriptTitle =
        escapeHtml(manuscriptTitle);

    const safeJournalName =
        escapeHtml(journalName);

    const safeMessage =
        escapeHtml(message);

    const dueDateText =
        formatDate(dueDate);

    const text = [
        `Dear ${reviewerName},`,
        "",
        message,
        "",
        `Manuscript: ${manuscriptTitle}`,
        `Journal: ${journalName}`,
        `Review round: ${reviewRound}`,
        `Deadline: ${dueDateText}`,
        "",
        `Open the review assignment: ${reviewUrl}`,
        "",
        "Thank you for supporting the journal's peer-review process.",
    ].join("\n");

    const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
      <p>Dear ${safeReviewerName},</p>

      <p>${safeMessage}</p>

      <table style="border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:5px 15px 5px 0;font-weight:bold;">
            Manuscript:
          </td>
          <td style="padding:5px 0;">
            ${safeManuscriptTitle}
          </td>
        </tr>

        <tr>
          <td style="padding:5px 15px 5px 0;font-weight:bold;">
            Journal:
          </td>
          <td style="padding:5px 0;">
            ${safeJournalName}
          </td>
        </tr>

        <tr>
          <td style="padding:5px 15px 5px 0;font-weight:bold;">
            Review round:
          </td>
          <td style="padding:5px 0;">
            ${reviewRound}
          </td>
        </tr>

        <tr>
          <td style="padding:5px 15px 5px 0;font-weight:bold;">
            Deadline:
          </td>
          <td style="padding:5px 0;">
            ${escapeHtml(dueDateText)}
          </td>
        </tr>
      </table>

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

    return {
        subject,
        text,
        html,
    };
}

function isAuthorized(request: NextRequest) {
    const cronSecret =
        process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error(
            "CRON_SECRET is not configured.",
        );

        return false;
    }

    const authorization =
        request.headers.get("authorization");

    return authorization ===
        `Bearer ${cronSecret}`;
}

export async function GET(
    request: NextRequest,
) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            {
                success: false,
                error: "Unauthorized.",
            },
            {
                status: 401,
            },
        );
    }

    const now = new Date();
    const startOfToday =
        getStartOfDay(now);

    const assignments =
        await prisma.reviewAssignment.findMany({
            where: {
                status: {
                    in: [
                        "INVITED",
                        "ACCEPTED",
                    ],
                },

                reviewer: {
                    isActive: true,
                },
            },

            include: {
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                submission: {
                    select: {
                        id: true,
                        title: true,

                        journal: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                            },
                        },
                    },
                },
            },
        });

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const results: Array<{
        assignmentId: string;
        category?: ReminderCategory;
        status: string;
        message?: string;
    }> = [];

    for (const assignment of assignments) {
        const category =
            determineReminderCategory({
                status: assignment.status,
                invitedAt: assignment.invitedAt,
                dueDate: assignment.dueDate,
                now,
            });

        if (!category) {
            skippedCount += 1;

            results.push({
                assignmentId: assignment.id,
                status: "SKIPPED",
                message:
                    "No reminder is due today.",
            });

            continue;
        }

        const existingReminder =
            await prisma.activityLog.findFirst({
                where: {
                    entity: "ReviewAssignment",
                    entityId: assignment.id,
                    action: "UPDATE",
                    createdAt: {
                        gte: startOfToday,
                    },

                    metadata: {
                        path: ["event"],
                        equals:
                            "AUTOMATIC_REVIEW_REMINDER_SENT",
                    },
                },

                select: {
                    id: true,
                },
            });

        if (existingReminder) {
            skippedCount += 1;

            results.push({
                assignmentId: assignment.id,
                category,
                status: "SKIPPED",
                message:
                    "A reminder was already sent today.",
            });

            continue;
        }

        const reviewUrl =
            `${getAppUrl()}/reviewer/reviews/${assignment.id}`;

        const content =
            getReminderContent({
                category,
                reviewerName:
                    assignment.reviewer.name,
                manuscriptTitle:
                    assignment.submission.title,
                journalName:
                    assignment.submission.journal.name,
                reviewRound:
                    assignment.reviewRound,
                dueDate:
                    assignment.dueDate,
                reviewUrl,
            });

        try {
            await sendEmail({
                to: assignment.reviewer.email,
                subject: content.subject,
                html: content.html,
                text: content.text,
            });

            await prisma.$transaction(
                async (tx) => {
                    await tx.notification.create({
                        data: {
                            userId:
                                assignment.reviewer.id,
                            type: "REVIEW",
                            title:
                                category === "OVERDUE"
                                    ? "Review overdue"
                                    : "Review reminder",
                            message:
                                `A reminder was sent for "${assignment.submission.title}" in review round ${assignment.reviewRound}.`,
                            link:
                                `/reviewer/reviews/${assignment.id}`,
                        },
                    });

                    await tx.activityLog.create({
                        data: {
                            userId: null,
                            action: "UPDATE",
                            entity:
                                "ReviewAssignment",
                            entityId:
                                assignment.id,

                            metadata: {
                                event:
                                    "AUTOMATIC_REVIEW_REMINDER_SENT",
                                category,
                                submissionId:
                                    assignment.submission.id,
                                journalId:
                                    assignment.submission
                                        .journal.id,
                                reviewerId:
                                    assignment.reviewer.id,
                                reviewerEmail:
                                    assignment.reviewer.email,
                                reviewRound:
                                    assignment.reviewRound,
                                assignmentStatus:
                                    assignment.status,
                                dueDate:
                                    assignment.dueDate
                                        ?.toISOString() ||
                                    null,
                                sentAt:
                                    new Date().toISOString(),
                            },
                        },
                    });
                },
            );

            sentCount += 1;

            results.push({
                assignmentId: assignment.id,
                category,
                status: "SENT",
            });
        } catch (error) {
            failedCount += 1;

            console.error(
                "Automatic reviewer reminder failed:",
                {
                    assignmentId:
                        assignment.id,
                    reviewerEmail:
                        assignment.reviewer.email,
                    category,
                    error,
                },
            );

            results.push({
                assignmentId: assignment.id,
                category,
                status: "FAILED",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }

    return NextResponse.json({
        success: true,
        processed:
            assignments.length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        executedAt:
            new Date().toISOString(),
        results,
    });
}