import type {
    Invoice,
    Prisma,
} from "@/lib/generated/prisma";

import { generateInvoiceNumber } from "@/lib/payments/invoice-number";

type TransactionClient = Prisma.TransactionClient;

type SubmissionWithInvoiceContext =
    Prisma.SubmissionGetPayload<{
        include: {
            journal: {
                select: {
                    id: true;
                    apcAmount: true;
                    currency: true;
                    isActive: true;
                };
            };
            invoice: true;
        };
    }>;

type CreateApcInvoiceResult = {
    submission: SubmissionWithInvoiceContext;
    invoice: Invoice;
};

/**
 * Creates one APC invoice for an accepted submission.
 *
 * Call this function inside prisma.$transaction().
 */
export async function createApcInvoice(
    tx: TransactionClient,
    submissionId: string,
): Promise<CreateApcInvoiceResult> {
    const submission = await tx.submission.findUnique({
        where: {
            id: submissionId,
        },
        include: {
            journal: {
                select: {
                    id: true,
                    apcAmount: true,
                    currency: true,
                    isActive: true,
                },
            },
            invoice: true,
        },
    });

    if (!submission) {
        throw new Error("Submission not found.");
    }

    if (!submission.journal.isActive) {
        throw new Error("The journal associated with this submission is inactive.");
    }

    /*
     * Idempotency:
     * Never create a second invoice for the same submission.
     */
    if (submission.invoice) {
        return {
            submission,
            invoice: submission.invoice,
        };
    }

    if (submission.journal.apcAmount.lessThanOrEqualTo(0)) {
        throw new Error("The journal APC amount must be greater than zero.");
    }

    const dueAt = new Date();
    dueAt.setUTCDate(dueAt.getUTCDate() + 14);

    const invoice = await tx.invoice.create({
        data: {
            journalId: submission.journalId,
            submissionId: submission.id,
            userId: submission.authorId,
            invoiceNumber: generateInvoiceNumber(),
            amount: submission.journal.apcAmount,
            currency: submission.journal.currency,
            status: "PENDING",
            dueAt,
        },
    });

    return {
        submission,
        invoice,
    };
}