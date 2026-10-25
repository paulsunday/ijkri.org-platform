import { logger } from "@/lib/logger";

type ChatNotification = {
  title: string;
  message: string;
  link?: string;
};

/**
 * Sends a notification to the editorial team's chat (currently
 * Discord). Swapping to Slack later only means rewriting the body
 * of this function — every call site stays the same.
 *
 * Never throws: a chat outage must never break the submission,
 * payment, or agreement flow that triggered the notification. Call
 * this after the triggering database transaction has committed.
 */
export async function sendChatNotification({
  title,
  message,
  link,
}: ChatNotification): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const description = link
    ? `${message}\n\n[Open in dashboard](${link})`
    : message;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description,
            color: 0xf59e0b,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.error("Discord webhook returned a non-OK status", {
        event: "CHAT_NOTIFICATION_FAILED",
        status: response.status,
      });
    }
  } catch (error) {
    logger.error("Discord webhook request failed", error, {
      event: "CHAT_NOTIFICATION_FAILED",
    });
  }
}
