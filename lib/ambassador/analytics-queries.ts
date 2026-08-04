import { prisma } from "@/lib/prisma";

export type MonthlyPoint = { month: string; count: number };

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastNMonthsRange(months: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));

  return { start, end: now };
}

function bucketByMonth(dates: Date[], months: number): MonthlyPoint[] {
  const { start } = lastNMonthsRange(months);
  const buckets = new Map<string, number>();

  for (let index = 0; index < months; index += 1) {
    const bucketDate = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
    );
    buckets.set(monthKey(bucketDate), 0);
  }

  for (const date of dates) {
    const key = monthKey(date);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
}

export async function getMonthlyReferrals(months = 12): Promise<MonthlyPoint[]> {
  const { start } = lastNMonthsRange(months);

  const users = await prisma.user.findMany({
    where: { referredByReviewerId: { not: null }, referredAt: { gte: start } },
    select: { referredAt: true },
  });

  return bucketByMonth(
    users.map((user) => user.referredAt as Date).filter(Boolean),
    months,
  );
}

export async function getMonthlyPublications(months = 12): Promise<MonthlyPoint[]> {
  const { start } = lastNMonthsRange(months);

  const submissions = await prisma.submission.findMany({
    where: {
      referrerReviewerId: { not: null },
      status: "PUBLISHED",
      article: { publishedAt: { gte: start } },
    },
    select: { article: { select: { publishedAt: true } } },
  });

  return bucketByMonth(
    submissions
      .map((submission) => submission.article?.publishedAt)
      .filter((date): date is Date => Boolean(date)),
    months,
  );
}

export async function getReferralConversionRate(): Promise<{
  registered: number;
  published: number;
  rate: number;
}> {
  const [registered, published] = await Promise.all([
    prisma.user.count({ where: { referredByReviewerId: { not: null } } }),
    prisma.submission.count({
      where: { referrerReviewerId: { not: null }, status: "PUBLISHED" },
    }),
  ]);

  return {
    registered,
    published,
    rate: registered > 0 ? published / registered : 0,
  };
}

export async function getTopAmbassadors(limit = 10) {
  const ambassadors = await prisma.reviewerAmbassador.findMany({
    where: { status: "ACTIVE" },
    orderBy: { publishedReferralCount: "desc" },
    take: limit,
    select: {
      publishedReferralCount: true,
      user: { select: { name: true } },
    },
  });

  return ambassadors.map((ambassador) => ({
    name: ambassador.user.name,
    publishedReferrals: ambassador.publishedReferralCount,
  }));
}

export async function getTopInstitutions(limit = 10) {
  const referredUsers = await prisma.user.findMany({
    where: { referredByReviewerId: { not: null } },
    select: { affiliation: true },
  });

  const counts = new Map<string, number>();

  for (const user of referredUsers) {
    const institution = user.affiliation?.trim() || "Unspecified";
    counts.set(institution, (counts.get(institution) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([institution, count]) => ({ institution, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getReferralRevenue(): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: {
      purpose: "APC",
      status: "PAID",
      invoice: {
        submission: { referrerReviewerId: { not: null } },
      },
    },
    _sum: { paidAmount: true, amount: true },
  });

  return Number(result._sum.paidAmount ?? result._sum.amount ?? 0);
}

export async function getAverageReviewCompletionTimeHours(): Promise<number | null> {
  const assignments = await prisma.reviewAssignment.findMany({
    where: { status: "SUBMITTED", acceptedAt: { not: null }, completedAt: { not: null } },
    select: { acceptedAt: true, completedAt: true },
  });

  if (assignments.length === 0) {
    return null;
  }

  const totalHours = assignments.reduce((sum, assignment) => {
    const hours =
      (assignment.completedAt!.getTime() - assignment.acceptedAt!.getTime()) /
      (1000 * 60 * 60);

    return sum + Math.max(0, hours);
  }, 0);

  return totalHours / assignments.length;
}
