import {
    PDFDocument,
    PDFFont,
    PDFPage,
    StandardFonts,
    rgb,
} from "pdf-lib";

export type ReceiptPaymentData = {
    receiptNumber: string;
    invoiceNumber?: string | null;
    internalReference: string;
    providerReference?: string | null;
    provider: string;
    providerChannel?: string | null;
    status: string;
    currency: string;
    amount: string | number;
    paidAmount?: string | number | null;
    providerFees?: string | number | null;
    paidAt?: Date | string | null;
    verifiedAt?: Date | string | null;
};

export type ReceiptCustomerData = {
    name: string;
    email: string;
    userId: string;
};

export type ReceiptJournalData = {
    name: string;
    website?: string | null;
    supportEmail?: string | null;
    address?: string | null;
};

export type ReceiptInvoiceData = {
    description: string;
    manuscriptTitle?: string | null;
    volume?: string | null;
    issue?: string | null;
};

export type GenerateReceiptInput = {
    payment: ReceiptPaymentData;
    customer: ReceiptCustomerData;
    journal: ReceiptJournalData;
    invoice: ReceiptInvoiceData;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 48;

function formatMoney(
    value: string | number | null | undefined,
    currency: string,
) {
    const numericValue =
        value === null || value === undefined
            ? 0
            : Number(value);

    if (!Number.isFinite(numericValue)) {
        return `${currency} 0.00`;
    }

    try {
        return new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericValue);
    } catch {
        return `${currency} ${numericValue.toFixed(2)}`;
    }
}

function formatDate(
    value: Date | string | null | undefined,
) {
    if (!value) {
        return "Not available";
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "UTC",
    }).format(date);
}

function cleanText(
    value: string | null | undefined,
) {
    return value?.trim() || "Not available";
}

function normaliseLabel(value: string) {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) =>
            character.toUpperCase(),
        );
}

function drawText({
    page,
    font,
    text,
    x,
    y,
    size,
    bold = false,
}: {
    page: PDFPage;
    font: PDFFont;
    text: string;
    x: number;
    y: number;
    size: number;
    bold?: boolean;
}) {
    page.drawText(text, {
        x,
        y,
        size,
        font,
        color: bold
            ? rgb(0.08, 0.08, 0.08)
            : rgb(0.22, 0.22, 0.22),
    });
}

function drawWrappedText({
    page,
    font,
    text,
    x,
    y,
    size,
    maxWidth,
    lineHeight,
}: {
    page: PDFPage;
    font: PDFFont;
    text: string;
    x: number;
    y: number;
    size: number;
    maxWidth: number;
    lineHeight: number;
}) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        const candidate = currentLine
            ? `${currentLine} ${word}`
            : word;

        const candidateWidth =
            font.widthOfTextAtSize(
                candidate,
                size,
            );

        if (
            candidateWidth <= maxWidth ||
            !currentLine
        ) {
            currentLine = candidate;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    lines.forEach((line, index) => {
        page.drawText(line, {
            x,
            y: y - index * lineHeight,
            size,
            font,
            color: rgb(
                0.22,
                0.22,
                0.22,
            ),
        });
    });

    return y - lines.length * lineHeight;
}

function drawSectionTitle({
    page,
    font,
    title,
    y,
}: {
    page: PDFPage;
    font: PDFFont;
    title: string;
    y: number;
}) {
    page.drawRectangle({
        x: PAGE_MARGIN,
        y: y - 6,
        width:
            PAGE_WIDTH -
            PAGE_MARGIN * 2,
        height: 24,
        color: rgb(
            0.94,
            0.95,
            0.97,
        ),
    });

    page.drawText(title, {
        x: PAGE_MARGIN + 10,
        y,
        size: 11,
        font,
        color: rgb(
            0.08,
            0.12,
            0.2,
        ),
    });

    return y - 34;
}

function drawField({
    page,
    regularFont,
    boldFont,
    label,
    value,
    y,
    valueX = 215,
}: {
    page: PDFPage;
    regularFont: PDFFont;
    boldFont: PDFFont;
    label: string;
    value: string;
    y: number;
    valueX?: number;
}) {
    drawText({
        page,
        font: boldFont,
        text: label,
        x: PAGE_MARGIN,
        y,
        size: 9,
        bold: true,
    });

    const availableWidth =
        PAGE_WIDTH -
        PAGE_MARGIN -
        valueX;

    const nextY = drawWrappedText({
        page,
        font: regularFont,
        text: value,
        x: valueX,
        y,
        size: 9,
        maxWidth: availableWidth,
        lineHeight: 12,
    });

    return Math.min(y - 18, nextY - 6);
}

export async function generatePaymentReceipt(
    input: GenerateReceiptInput,
) {
    if (
        !input.payment.receiptNumber.trim()
    ) {
        throw new Error(
            "Receipt number is required.",
        );
    }

    if (
        input.payment.status !== "PAID"
    ) {
        throw new Error(
            "A receipt can only be generated for a paid payment.",
        );
    }

    const pdfDocument =
        await PDFDocument.create();

    const regularFont =
        await pdfDocument.embedFont(
            StandardFonts.Helvetica,
        );

    const boldFont =
        await pdfDocument.embedFont(
            StandardFonts.HelveticaBold,
        );

    const page = pdfDocument.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
    ]);

    let y = PAGE_HEIGHT - PAGE_MARGIN;

    page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - 118,
        width: PAGE_WIDTH,
        height: 118,
        color: rgb(
            0.08,
            0.12,
            0.2,
        ),
    });

    page.drawText(
        input.journal.name,
        {
            x: PAGE_MARGIN,
            y: PAGE_HEIGHT - 54,
            size: 17,
            font: boldFont,
            color: rgb(1, 1, 1),
        },
    );

    page.drawText(
        "OFFICIAL PAYMENT RECEIPT",
        {
            x: PAGE_MARGIN,
            y: PAGE_HEIGHT - 81,
            size: 11,
            font: regularFont,
            color: rgb(
                0.86,
                0.9,
                0.96,
            ),
        },
    );

    page.drawText(
        input.payment.receiptNumber,
        {
            x: PAGE_WIDTH - 225,
            y: PAGE_HEIGHT - 80,
            size: 10,
            font: boldFont,
            color: rgb(1, 1, 1),
        },
    );

    y = PAGE_HEIGHT - 152;

    y = drawSectionTitle({
        page,
        font: boldFont,
        title: "Receipt Information",
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Receipt number",
        value:
            input.payment
                .receiptNumber,
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Invoice number",
        value: cleanText(
            input.payment
                .invoiceNumber,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Internal reference",
        value:
            input.payment
                .internalReference,
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Provider reference",
        value: cleanText(
            input.payment
                .providerReference,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Payment date",
        value: formatDate(
            input.payment.paidAt,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Verification date",
        value: formatDate(
            input.payment
                .verifiedAt,
        ),
        y,
    });

    y -= 8;

    y = drawSectionTitle({
        page,
        font: boldFont,
        title: "Customer",
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Name",
        value: input.customer.name,
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Email",
        value: input.customer.email,
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "User ID",
        value: input.customer.userId,
        y,
    });

    y -= 8;

    y = drawSectionTitle({
        page,
        font: boldFont,
        title: "Invoice",
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Description",
        value:
            input.invoice
                .description,
        y,
    });

    if (
        input.invoice
            .manuscriptTitle
    ) {
        y = drawField({
            page,
            regularFont,
            boldFont,
            label: "Manuscript",
            value:
                input.invoice
                    .manuscriptTitle,
            y,
        });
    }

    if (
        input.invoice.volume ||
        input.invoice.issue
    ) {
        y = drawField({
            page,
            regularFont,
            boldFont,
            label: "Publication",
            value: [
                input.invoice.volume
                    ? `Volume ${input.invoice.volume}`
                    : null,
                input.invoice.issue
                    ? `Issue ${input.invoice.issue}`
                    : null,
            ]
                .filter(Boolean)
                .join(", "),
            y,
        });
    }

    y -= 8;

    y = drawSectionTitle({
        page,
        font: boldFont,
        title: "Payment Summary",
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Provider",
        value: normaliseLabel(
            input.payment.provider,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Channel",
        value: cleanText(
            input.payment
                .providerChannel,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Status",
        value: normaliseLabel(
            input.payment.status,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Amount due",
        value: formatMoney(
            input.payment.amount,
            input.payment.currency,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Amount paid",
        value: formatMoney(
            input.payment.paidAmount ??
            input.payment.amount,
            input.payment.currency,
        ),
        y,
    });

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Provider fee",
        value: formatMoney(
            input.payment.providerFees,
            input.payment.currency,
        ),
        y,
    });

    const paidAmount = Number(
        input.payment.paidAmount ??
        input.payment.amount,
    );

    const providerFees = Number(
        input.payment.providerFees ?? 0,
    );

    const netAmount =
        Number.isFinite(paidAmount) &&
            Number.isFinite(providerFees)
            ? paidAmount - providerFees
            : paidAmount;

    y = drawField({
        page,
        regularFont,
        boldFont,
        label: "Net amount",
        value: formatMoney(
            netAmount,
            input.payment.currency,
        ),
        y,
    });

    const footerY = 74;

    page.drawLine({
        start: {
            x: PAGE_MARGIN,
            y: footerY + 33,
        },
        end: {
            x:
                PAGE_WIDTH -
                PAGE_MARGIN,
            y: footerY + 33,
        },
        thickness: 0.7,
        color: rgb(
            0.75,
            0.77,
            0.8,
        ),
    });

    page.drawText(
        "This receipt is computer generated. No signature is required.",
        {
            x: PAGE_MARGIN,
            y: footerY + 16,
            size: 8,
            font: regularFont,
            color: rgb(
                0.38,
                0.38,
                0.38,
            ),
        },
    );

    page.drawText(
        input.journal.name,
        {
            x: PAGE_MARGIN,
            y: footerY,
            size: 8,
            font: boldFont,
            color: rgb(
                0.2,
                0.2,
                0.2,
            ),
        },
    );

    const contactDetails = [
        input.journal.website,
        input.journal.supportEmail,
        input.journal.address,
    ]
        .filter(
            (
                value,
            ): value is string =>
                Boolean(
                    value?.trim(),
                ),
        )
        .join(" | ");

    if (contactDetails) {
        const shortenedContact =
            contactDetails.length > 100
                ? `${contactDetails.slice(
                    0,
                    97,
                )}...`
                : contactDetails;

        page.drawText(
            shortenedContact,
            {
                x: PAGE_MARGIN,
                y: footerY - 14,
                size: 7,
                font: regularFont,
                color: rgb(
                    0.38,
                    0.38,
                    0.38,
                ),
            },
        );
    }

    pdfDocument.setTitle(
        `Payment Receipt ${input.payment.receiptNumber}`,
    );

    pdfDocument.setAuthor(
        input.journal.name,
    );

    pdfDocument.setSubject(
        "Official payment receipt",
    );

    pdfDocument.setCreator(
        input.journal.name,
    );

    pdfDocument.setProducer(
        input.journal.name,
    );

    pdfDocument.setCreationDate(
        new Date(),
    );

    return pdfDocument.save();
}