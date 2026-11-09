import { sendEmail } from "@/lib/email/send-email";
import { articlePublishedEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * Tells the submitting author their article is live: an in-app
 * notification (unless the caller already created one) and an email.
 * Never throws, so it can't undo a publication that already committed.
 */
export async function notifyArticlePublished({
    articleId,
    createInAppNotification = true,
}: {
    articleId: string;
    createInAppNotification?: boolean;
}) {
    try {
        const article = await prisma.article.findUnique({
            where: { id: articleId },
            select: {
                id: true,
                title: true,
                slug: true,
                doi: true,
                status: true,
                submissionId: true,
                journal: { select: { name: true } },
                submission: {
                    select: {
                        authorId: true,
                        author: { select: { name: true, email: true } },
                    },
                },
            },
        });

        if (!article?.submission || article.status !== "PUBLISHED") {
            return;
        }

        const { author, authorId } = article.submission;
        const appUrl = (
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        ).replace(/\/$/, "");
        const articleUrl = `${appUrl}/articles/${article.slug}`;

        if (createInAppNotification) {
            await prisma.notification.create({
                data: {
                    userId: authorId,
                    type: "PUBLICATION",
                    title: "Article Published",
                    message: `Your article "${article.title}" has been published.`,
                    link: `/author/submissions/${article.submissionId}`,
                },
            });
        }

        if (!author.email) {
            return;
        }

        const email = articlePublishedEmail({
            authorName: author.name || "Author",
            journalName: article.journal.name,
            articleTitle: article.title,
            articleUrl,
            doi: article.doi,
        });

        await sendEmail({ to: author.email, ...email });

        await prisma.activityLog.create({
            data: {
                userId: authorId,
                action: "UPDATE",
                entity: "Article",
                entityId: article.id,
                metadata: {
                    event: "ARTICLE_PUBLISHED_EMAIL_SENT",
                    to: author.email,
                },
            },
        });
    } catch (error) {
        logger.error("Article published notification failed", error, {
            event: "ARTICLE_PUBLISHED_NOTIFICATION_FAILED",
            articleId,
        });
    }
}
