"use server";

import { revalidatePath } from "next/cache";

import { requireAnyActionRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

function refreshInvoicePages(invoiceId: string, submissionId: string | null) {
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/articles");
    revalidatePath(`/author/invoices/${invoiceId}`);
    revalidatePath("/author/invoices");

    if (submissionId) {
        revalidatePath(`/author/submissions/${submissionId}`);
        revalidatePath(`/admin/submissions/${submissionId}`);
        revalidatePath(`/editor/submissions/${submissionId}/publication`);
    }
}

async function loadInvoiceForAction(invoiceId: string) {
    if (!invoiceId) {
        throw new Error("Invoice ID is missing.");
    }

    const invoice = await prisma.invoice.findUnique({
        where: {
            id: invoiceId,
        },
        include: {
            submission: {
                select: {
                    id: true,
                    title: true,
                },
            },
            user: {
                select: {
                    id: true,
                    email: true,
                },
            },
        },
    });

    if (!invoice) {
        throw new Error("Invoice not found.");
    }

    return invoice;
}

export async function waiveInvoice(formData: FormData) {
    const administrator = await requireAnyActionRole(ADMIN_ROLES);

    const invoiceId = String(formData.get("invoiceId") || "").trim();
    const waiverReason = String(formData.get("waiverReason") || "").trim();

    if (!waiverReason) {
        throw new Error("A waiver reason is required.");
    }

    const invoice = await loadInvoiceForAction(invoiceId);

    if (invoice.status === "PAID") {
        throw new Error(
            "This invoice has already been paid and cannot be waived.",
        );
    }

    if (invoice.status === "WAIVED") {
        throw new Error("This invoice has already been waived.");
    }

    if (invoice.status === "VOID") {
        throw new Error("This invoice has been voided and cannot be waived.");
    }

    const waivedAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
            where: {
                id: invoice.id,
            },
            data: {
                status: "WAIVED",
                waivedAt,
                waivedAmount: invoice.amount,
                waivedReason: waiverReason,
                waivedById: administrator.id,
            },
        });

        await tx.notification.create({
            data: {
                userId: invoice.userId,
                type: "PAYMENT",
                title: "APC Waived",
                message:
                    `The Article Processing Charge for "${invoice.submission?.title ?? "your manuscript"
                    }" (Invoice ${invoice.invoiceNumber}) has been waived. ` +
                    "No payment is required.",
                link: `/author/invoices/${invoice.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Invoice",
                entityId: invoice.id,
                metadata: {
                    event: "APC_INVOICE_WAIVED",
                    invoiceNumber: invoice.invoiceNumber,
                    submissionId: invoice.submissionId,
                    previousStatus: invoice.status,
                    waivedAmount: invoice.amount.toFixed(2),
                    waiverReason,
                },
            },
        });
    });

    refreshInvoicePages(invoice.id, invoice.submissionId);
}

export async function recordManualPayment(formData: FormData) {
    const administrator = await requireAnyActionRole(ADMIN_ROLES);

    const invoiceId = String(formData.get("invoiceId") || "").trim();
    const paymentMethod = String(formData.get("paymentMethod") || "").trim();
    const paymentReference = String(
        formData.get("paymentReference") || "",
    ).trim();
    const notes = String(formData.get("notes") || "").trim();

    if (!paymentMethod) {
        throw new Error(
            "Describe how the payment was received (e.g. bank transfer).",
        );
    }

    const invoice = await loadInvoiceForAction(invoiceId);

    if (invoice.status === "PAID") {
        throw new Error("This invoice has already been paid.");
    }

    if (
        invoice.status === "WAIVED" ||
        invoice.status === "PARTIALLY_WAIVED" ||
        invoice.status === "VOID"
    ) {
        throw new Error(
            `A manual payment cannot be recorded because this invoice's status is ${invoice.status
                .replaceAll("_", " ")
                .toLowerCase()}.`,
        );
    }

    const paidAt = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
            where: {
                id: invoice.id,
            },
            data: {
                status: "PAID",
                paidAt,
            },
        });

        await tx.notification.create({
            data: {
                userId: invoice.userId,
                type: "PAYMENT",
                title: "Payment Confirmed",
                message:
                    `Invoice ${invoice.invoiceNumber} for "${invoice.submission?.title ?? "your manuscript"
                    }" has been marked paid (${paymentMethod}).`,
                link: `/author/invoices/${invoice.id}`,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: administrator.id,
                action: "UPDATE",
                entity: "Invoice",
                entityId: invoice.id,
                metadata: {
                    event: "APC_MANUAL_PAYMENT_RECORDED",
                    invoiceNumber: invoice.invoiceNumber,
                    submissionId: invoice.submissionId,
                    amount: invoice.amount.toFixed(2),
                    currency: invoice.currency,
                    paymentMethod,
                    paymentReference: paymentReference || null,
                    notes: notes || null,
                    recordedById: administrator.id,
                },
            },
        });
    });

    refreshInvoicePages(invoice.id, invoice.submissionId);
}
