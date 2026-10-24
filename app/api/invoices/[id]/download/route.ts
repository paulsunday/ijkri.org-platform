import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  renderInvoiceImage,
  renderInvoicePdf,
  type InvoiceDocumentData,
} from "@/lib/invoices/render-invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const INVOICE_ACCESS_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

function sanitiseFileName(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "invoice";
}

export async function GET(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { message: "Invoice ID is missing." },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "pdf").toLowerCase();

  if (format !== "pdf" && format !== "png") {
    return NextResponse.json(
      { message: 'Unsupported format. Use "pdf" or "png".' },
      { status: 400 },
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      journal: {
        select: {
          name: true,
          contactEmail: true,
          websiteUrl: true,
        },
      },
      submission: {
        select: {
          title: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
          affiliation: true,
          country: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { message: "Invoice not found." },
      { status: 404 },
    );
  }

  const isOwner = invoice.userId === user.id;

  const hasStaffAccess = user.roles.some(
    (role) =>
      role.journalId === invoice.journalId &&
      (INVOICE_ACCESS_ROLES as readonly string[]).includes(role.role),
  );

  if (!isOwner && !hasStaffAccess) {
    return NextResponse.json(
      { message: "You do not have access to this invoice." },
      { status: 403 },
    );
  }

  const latestPayment = invoice.payments[0] ?? null;

  const data: InvoiceDocumentData = {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    currency: invoice.currency,
    amount: invoice.amount.toNumber(),
    createdAt: invoice.createdAt,
    dueAt: invoice.dueAt,
    paidAt: invoice.paidAt,
    waivedAt: invoice.waivedAt,
    waivedAmount: invoice.waivedAmount ? invoice.waivedAmount.toNumber() : null,
    waivedReason: invoice.waivedReason,
    voidedAt: invoice.voidedAt,

    journalName: invoice.journal.name,
    journalContactEmail: invoice.journal.contactEmail,
    journalWebsiteUrl: invoice.journal.websiteUrl,

    billedToName: invoice.user.name,
    billedToEmail: invoice.user.email,
    billedToAffiliation: invoice.user.affiliation,
    billedToCountry: invoice.user.country,

    manuscriptTitle: invoice.submission?.title ?? "Article Processing Charge",

    latestPayment: latestPayment
      ? {
          reference:
            latestPayment.providerReference ?? latestPayment.internalReference,
          status: latestPayment.status,
          amount: latestPayment.amount.toNumber(),
          currency: latestPayment.currency,
          paidAt: latestPayment.paidAt,
          createdAt: latestPayment.createdAt,
          provider: latestPayment.provider,
        }
      : null,
  };

  const fileName = sanitiseFileName(
    `invoice-${invoice.invoiceNumber}.${format}`,
  );

  try {
    if (format === "png") {
      const image = await renderInvoiceImage(data);

      return new Response(Buffer.from(image), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String(image.byteLength),
        },
      });
    }

    const pdf = await renderInvoicePdf(data);

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdf.byteLength),
      },
    });
  } catch (error) {
    logger.error("Invoice document render failed", error, {
      event: "INVOICE_DOCUMENT_RENDER_FAILED",
      invoiceId: invoice.id,
      format,
    });

    return NextResponse.json(
      { message: "The invoice document could not be generated. Please try again." },
      { status: 500 },
    );
  }
}
