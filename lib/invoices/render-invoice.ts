import "server-only";

import { renderHtmlToImage, renderHtmlToPdf } from "@/lib/pdf/html-to-pdf";

export type InvoiceDocumentData = {
  invoiceNumber: string;
  status: string;
  currency: string;
  amount: number;
  createdAt: Date;
  dueAt: Date | null;
  paidAt: Date | null;
  waivedAt: Date | null;
  waivedAmount: number | null;
  waivedReason: string | null;
  voidedAt: Date | null;

  journalName: string;
  journalContactEmail: string | null;
  journalWebsiteUrl: string | null;

  billedToName: string;
  billedToEmail: string;
  billedToAffiliation: string | null;
  billedToCountry: string | null;

  manuscriptTitle: string;

  latestPayment: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paidAt: Date | null;
    createdAt: Date;
    provider: string;
  } | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value: Date | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatStatus(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "#15803d",
  OVERDUE: "#b91c1c",
  WAIVED: "#1d4ed8",
  PARTIALLY_WAIVED: "#7e22ce",
  VOID: "#64748b",
  PENDING: "#b45309",
};

function buildInvoiceHtml(data: InvoiceDocumentData): string {
  const statusColor = STATUS_COLORS[data.status] ?? "#334155";

  const waivedRow =
    data.waivedAt || data.waivedAmount
      ? `
    <tr>
      <td style="padding:6px 0; color:#64748b;">Waived</td>
      <td style="padding:6px 0; text-align:right;">
        ${
          data.waivedAmount !== null
            ? escapeHtml(formatMoney(data.waivedAmount, data.currency))
            : ""
        }
        ${data.waivedAt ? ` on ${escapeHtml(formatDate(data.waivedAt))}` : ""}
      </td>
    </tr>
    ${
      data.waivedReason
        ? `<tr><td colspan="2" style="padding:0 0 6px; color:#64748b; font-size:11px;">Reason: ${escapeHtml(
            data.waivedReason,
          )}</td></tr>`
        : ""
    }`
      : "";

  const paymentSection = data.latestPayment
    ? `
    <h2 style="margin:32px 0 12px; font-size:14px; letter-spacing:0.04em; text-transform:uppercase; color:#0f172a;">
      Payment Record
    </h2>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr>
        <td style="padding:6px 0; color:#64748b; width:50%;">Reference</td>
        <td style="padding:6px 0; text-align:right;">${escapeHtml(data.latestPayment.reference)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:#64748b;">Provider</td>
        <td style="padding:6px 0; text-align:right;">${escapeHtml(data.latestPayment.provider)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:#64748b;">Status</td>
        <td style="padding:6px 0; text-align:right;">${escapeHtml(formatStatus(data.latestPayment.status))}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:#64748b;">Amount Paid</td>
        <td style="padding:6px 0; text-align:right;">${escapeHtml(
          formatMoney(data.latestPayment.amount, data.latestPayment.currency),
        )}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:#64748b;">Date</td>
        <td style="padding:6px 0; text-align:right;">${escapeHtml(
          formatDate(data.latestPayment.paidAt ?? data.latestPayment.createdAt),
        )}</td>
      </tr>
    </table>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
</head>
<body style="margin:0; padding:40px; font-family: Calibri, Arial, sans-serif; color:#0f172a; background:#ffffff;">
  <div style="max-width:720px; margin:0 auto;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:20px;">
      <div>
        <p style="margin:0; font-size:22px; font-weight:700;">${escapeHtml(data.journalName)}</p>
        ${
          data.journalWebsiteUrl
            ? `<p style="margin:4px 0 0; font-size:12px; color:#64748b;">${escapeHtml(data.journalWebsiteUrl)}</p>`
            : ""
        }
        ${
          data.journalContactEmail
            ? `<p style="margin:2px 0 0; font-size:12px; color:#64748b;">${escapeHtml(data.journalContactEmail)}</p>`
            : ""
        }
      </div>
      <div style="text-align:right;">
        <p style="margin:0; font-size:20px; font-weight:700; letter-spacing:0.05em;">INVOICE</p>
        <p style="margin:4px 0 0; font-size:13px; color:#64748b;">${escapeHtml(data.invoiceNumber)}</p>
        <p style="margin:10px 0 0;">
          <span style="display:inline-block; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#ffffff; background:${statusColor};">
            ${escapeHtml(formatStatus(data.status))}
          </span>
        </p>
      </div>
    </div>

    <table style="width:100%; margin-top:28px; border-collapse:collapse;">
      <tr>
        <td style="vertical-align:top; width:50%;">
          <p style="margin:0 0 6px; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#64748b;">Billed To</p>
          <p style="margin:0; font-size:14px; font-weight:600;">${escapeHtml(data.billedToName)}</p>
          <p style="margin:2px 0 0; font-size:13px; color:#334155;">${escapeHtml(data.billedToEmail)}</p>
          ${
            data.billedToAffiliation
              ? `<p style="margin:2px 0 0; font-size:13px; color:#334155;">${escapeHtml(data.billedToAffiliation)}</p>`
              : ""
          }
          ${
            data.billedToCountry
              ? `<p style="margin:2px 0 0; font-size:13px; color:#334155;">${escapeHtml(data.billedToCountry)}</p>`
              : ""
          }
        </td>
        <td style="vertical-align:top; width:50%; text-align:right;">
          <p style="margin:0 0 6px; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#64748b;">Dates</p>
          <p style="margin:0; font-size:13px;"><span style="color:#64748b;">Issued:</span> ${escapeHtml(formatDate(data.createdAt))}</p>
          <p style="margin:2px 0 0; font-size:13px;"><span style="color:#64748b;">Due:</span> ${escapeHtml(formatDate(data.dueAt))}</p>
        </td>
      </tr>
    </table>

    <table style="width:100%; margin-top:32px; border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px solid #cbd5e1;">
          <th style="text-align:left; padding:8px 0; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#64748b;">Description</th>
          <th style="text-align:right; padding:8px 0; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#64748b;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:14px 0; font-size:13px;">
            Article Processing Charge (APC)
            <br />
            <span style="color:#64748b; font-size:12px;">${escapeHtml(data.manuscriptTitle)}</span>
          </td>
          <td style="padding:14px 0; text-align:right; font-size:13px;">${escapeHtml(
            formatMoney(data.amount, data.currency),
          )}</td>
        </tr>
      </tbody>
    </table>

    <table style="width:100%; margin-top:12px; border-collapse:collapse;">
      <tr>
        <td style="padding:6px 0; text-align:right; font-size:13px; color:#64748b; width:80%;">Total Due</td>
        <td style="padding:6px 0; text-align:right; font-size:16px; font-weight:700; width:20%;">${escapeHtml(
          formatMoney(data.amount, data.currency),
        )}</td>
      </tr>
      ${waivedRow}
    </table>

    ${paymentSection}

    <p style="margin-top:48px; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:16px;">
      This invoice was generated automatically by ${escapeHtml(data.journalName)} and reflects the Article Processing Charge
      associated with the manuscript referenced above.
    </p>
  </div>
</body>
</html>`;
}

export async function renderInvoicePdf(
  data: InvoiceDocumentData,
): Promise<Uint8Array> {
  return renderHtmlToPdf(buildInvoiceHtml(data));
}

export async function renderInvoiceImage(
  data: InvoiceDocumentData,
): Promise<Uint8Array> {
  return renderHtmlToImage(buildInvoiceHtml(data), { width: 900 });
}
