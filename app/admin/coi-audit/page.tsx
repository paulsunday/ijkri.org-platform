import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import type { ConflictSeverity, ConflictType } from "@/lib/generated/prisma";

import { OverrideConflictForm } from "./CoiForms";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{ severity?: string; type?: string; page?: string }>;
};

function formatType(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-slate-100 text-slate-700",
};

export default async function CoiAuditPage({ searchParams }: Props) {
  await requireRole("SUPER_ADMIN");

  const { severity, type, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    ...(severity ? { severity: severity as ConflictSeverity } : {}),
    ...(type ? { conflictType: type as ConflictType } : {}),
  };

  const [checks, total] = await Promise.all([
    prisma.conflictOfInterestCheck.findMany({
      where,
      include: {
        submission: { select: { id: true, title: true } },
        reviewer: { select: { name: true, email: true } },
        overriddenBy: { select: { name: true } },
      },
      orderBy: { detectedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),

    prisma.conflictOfInterestCheck.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Conflict of Interest Audit</h1>

      <p className="mt-2 text-slate-600">
        Every conflict-of-interest check the system has run, whether or not it
        blocked an assignment.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {["", "HIGH", "MEDIUM", "LOW"].map((option) => (
          <a
            key={option || "all"}
            href={option ? `?severity=${option}` : "?"}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              (severity || "") === option
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {option || "All severities"}
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {checks.length === 0 && (
          <p className="text-slate-500">No conflict-of-interest checks recorded yet.</p>
        )}

        {checks.map((check) => (
          <div key={check.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${SEVERITY_BADGE_CLASS[check.severity]}`}
                >
                  {check.severity}
                </span>

                <span className="ml-2 text-sm font-semibold text-slate-700">
                  {formatType(check.conflictType)}
                </span>

                <p className="mt-2 font-medium">{check.submission.title}</p>

                <p className="text-sm text-slate-600">
                  Reviewer: {check.reviewer.name} ({check.reviewer.email})
                </p>

                <p className="mt-2 text-sm text-slate-600">{check.reason}</p>

                <p className="text-xs text-slate-400">
                  {check.detectedAt.toLocaleString()}
                  {check.blocked ? " — assignment blocked" : ""}
                </p>

                {check.overriddenAt && (
                  <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
                    Overridden by {check.overriddenBy?.name} on{" "}
                    {check.overriddenAt.toLocaleDateString()}: {check.overrideReason}
                  </p>
                )}
              </div>

              {check.severity !== "HIGH" && !check.overriddenAt && (
                <OverrideConflictForm conflictId={check.id} />
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <a href={`?page=${page - 1}`} className="font-semibold text-blue-700 hover:underline">
              ← Previous
            </a>
          ) : (
            <span />
          )}

          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <a href={`?page=${page + 1}`} className="font-semibold text-blue-700 hover:underline">
              Next →
            </a>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
