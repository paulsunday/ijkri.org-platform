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

export async function getSiteTotals() {
  const [users, journals, submissions, publishedArticles, activeReviewAssignments] =
    await Promise.all([
      prisma.user.count(),
      prisma.journal.count({ where: { isActive: true } }),
      prisma.submission.count(),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.reviewAssignment.count({
        where: { status: { in: ["INVITED", "ACCEPTED"] } },
      }),
    ]);

  return { users, journals, submissions, publishedArticles, activeReviewAssignments };
}

export async function getMonthlySubmissions(months = 12): Promise<MonthlyPoint[]> {
  const { start } = lastNMonthsRange(months);

  const submissions = await prisma.submission.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  });

  return bucketByMonth(
    submissions.map((submission) => submission.createdAt),
    months,
  );
}

export async function getMonthlyPublishedArticles(months = 12): Promise<MonthlyPoint[]> {
  const { start } = lastNMonthsRange(months);

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: start } },
    select: { publishedAt: true },
  });

  return bucketByMonth(
    articles
      .map((article) => article.publishedAt)
      .filter((date): date is Date => Boolean(date)),
    months,
  );
}

export async function getMonthlyUserSignups(months = 12): Promise<MonthlyPoint[]> {
  const { start } = lastNMonthsRange(months);

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  });

  return bucketByMonth(
    users.map((user) => user.createdAt),
    months,
  );
}

export async function getSubmissionsByStatus() {
  const grouped = await prisma.submission.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return grouped
    .map((entry) => ({ status: entry.status, count: entry._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getUsersByRole() {
  const grouped = await prisma.userJournalRole.groupBy({
    by: ["role"],
    _count: { _all: true },
  });

  return grouped
    .map((entry) => ({ role: entry.role, count: entry._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getTopJournalsByPublishedArticles(limit = 10) {
  const journals = await prisma.journal.findMany({
    select: {
      name: true,
      _count: { select: { articles: { where: { status: "PUBLISHED" } } } },
    },
  });

  return journals
    .map((journal) => ({ name: journal.name, count: journal._count.articles }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
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
