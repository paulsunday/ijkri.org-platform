import { NextRequest } from "next/server";

import { requireActionUser } from "@/lib/auth/current-user";
import { getCommissionHistory, type CommissionFilter } from "@/lib/ambassador/commission-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsvRow(values: (string | number)[]) {
  return values.map((value) => csvEscape(String(value))).join(",");
}

export async function GET(request: NextRequest) {
  const reviewer = await requireActionUser();

  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter") as CommissionFilter | null;
  const search = searchParams.get("search") ?? undefined;

  // Export the full result set, not just one page.
  const allRows: Awaited<ReturnType<typeof getCommissionHistory>>["rows"] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await getCommissionHistory({
      reviewerId: reviewer.id,
      filter: filter ?? undefined,
      search,
      page,
    });

    allRows.push(...result.rows);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);

  const header = toCsvRow([
    "Manuscript ID",
    "Manuscript Title",
    "Referral Date",
    "Editorial Status",
    "Reward Type",
    "Reward Amount",
    "Payment Status",
    "Wallet Transaction ID",
    "Date Paid",
  ]);

  const rows = allRows.map((row) =>
    toCsvRow([
      row.submissionId,
      row.manuscriptTitle,
      row.referralDate?.toISOString() ?? "",
      row.editorialStatus,
      row.rewardType ?? "",
      row.rewardAmount ?? "",
      row.paymentStatus,
      row.walletTransactionId ?? "",
      row.datePaid?.toISOString() ?? "",
    ]),
  );

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="referral-commissions.csv"',
    },
  });
}
