import { Resend } from "resend";

type EmailAttachment = {
    filename: string;
    content: Buffer | Uint8Array | string;
};

type SendEmailOptions = {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    attachments?: EmailAttachment[];
};

function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        throw new Error(
            "RESEND_API_KEY is not configured.",
        );
    }

    return new Resend(apiKey);
}

export async function sendEmail({
    to,
    subject,
    html,
    text,
    replyTo,
    attachments,
}: SendEmailOptions) {
    const from =
        process.env.EMAIL_FROM ||
        "IJKRI <no-reply@example.com>";

    const resolvedReplyTo =
        replyTo ||
        process.env.EMAIL_REPLY_TO ||
        undefined;

    const resend = getResendClient();

    const result = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
        replyTo: resolvedReplyTo,
        attachments: attachments?.map((attachment) => ({
            filename: attachment.filename,
            content:
                typeof attachment.content === "string"
                    ? attachment.content
                    : Buffer.from(attachment.content),
        })),
    });

    if (result.error) {
        console.error("Resend API Error:", result.error);

        throw new Error(
            JSON.stringify(result.error, null, 2),
        );
    }

    return result.data;
}