import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/current-user";
import type { UserRole } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  // requireRole redirects on the page path; for a route handler we
  // check membership directly against ADMIN_ROLES-equivalent roles.
  const user = await requireCurrentUser();

  const isAdmin = user.roles.some(
    (role: { role: UserRole }) => role.role === "SUPER_ADMIN" || role.role === "ADMIN",
  );

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ambassadors = await prisma.reviewerAmbassador.findMany({
    include: {
      user: { select: { name: true, email: true, affiliation: true, country: true } },
      wallet: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const header = toCsvRow([
    "Name",
    "Email",
    "Institution",
    "Country",
    "Referral Code",
    "Level",
    "Status",
    "Published Referrals",
    "Total Referrals",
    "Current Balance",
    "Lifetime Earnings",
    "Withdrawn",
    "Currency",
  ]);

  const rows = ambassadors.map((ambassador) =>
    toCsvRow([
      ambassador.user.name,
      ambassador.user.email,
      ambassador.user.affiliation ?? "",
      ambassador.user.country ?? "",
      ambassador.referralCode,
      ambassador.level,
      ambassador.status,
      ambassador.publishedReferralCount,
      ambassador.totalReferralCount,
      ambassador.wallet?.currentBalance.toString() ?? "0",
      ambassador.wallet?.lifetimeEarnings.toString() ?? "0",
      ambassador.wallet?.totalWithdrawn.toString() ?? "0",
      ambassador.wallet?.currency ?? "USD",
    ]),
  );

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reviewer-ambassadors.csv"',
    },
  });
}
