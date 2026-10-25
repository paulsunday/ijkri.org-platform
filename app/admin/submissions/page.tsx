import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/permissions";
import { ADMIN_ROLES } from "@/lib/auth/role-groups";
import type {
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  SubmissionStatus,
} from "@/lib/generated/prisma";

const PAGE_SIZE = 25;

const STATUS_OPTIONS: Array<{
  value: SubmissionStatus;
  label: string;
}> = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Received" },
  { value: "UNDER_INITIAL_REVIEW", label: "Screening" },
  { value: "UNDER_PEER_REVIEW", label: "Under Review" },
  { value: "REVISION_REQUIRED", label: "Revision" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "COPYEDITING", label: "Copyediting" },
  { value: "TYPESETTING", label: "Typesetting" },
  { value: "PROOFREADING", label: "Proofreading" },
  { value: "AUTHOR_PROOF_APPROVAL", label: "Author Proof Approval" },
  { value: "READY_FOR_PUBLICATION", label: "Ready for Publication" },
  { value: "PUBLISHED", label: "Published" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

function formatEnumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "PUBLISHED":
    case "ACCEPTED":
    case "PAID":
    case "SIGNED":
      return "border-green-200 bg-green-50 text-green-800";

    case "REJECTED":
    case "WITHDRAWN":
    case "OVERDUE":
    case "FAILED":
    case "CANCELLED":
    case "DECLINED":
      return "border-red-200 bg-red-50 text-red-800";

    case "REVISION_REQUIRED":
    case "PENDING":
    case "PROCESSING":
    case "PARTIALLY_SIGNED":
      return "border-amber-200 bg-amber-50 text-amber-800";

    case "UNDER_PEER_REVIEW":
    case "UNDER_INITIAL_REVIEW":
    case "SENT":
      return "border-blue-200 bg-blue-50 text-blue-800";

    case "WAIVED":
    case "PARTIALLY_WAIVED":
      return "border-purple-200 bg-purple-50 text-purple-800";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
        status,
      )}`}
    >
      {formatEnumLabel(status)}
    </span>
  );
}

type AdminSubmissionsPageProps = {
  searchParams: Promise<{
    status?: string;
    query?: string;
    page?: string;
  }>;
};

export default async function AdminSubmissionsPage({
  searchParams,
}: AdminSubmissionsPageProps) {
  await requireAnyRole(ADMIN_ROLES);

  const { status, query, page: pageParam } = await searchParams;

  const trimmedQuery = (query ?? "").trim();
  const isValidStatus = STATUS_OPTIONS.some(
    (option) => option.value === status,
  );

  const currentPage = Math.max(
    1,
    Number.parseInt(pageParam ?? "1", 10) || 1,
  );

  const where: Prisma.SubmissionWhereInput = {
    ...(isValidStatus
      ? { status: status as SubmissionStatus }
      : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            {
              displayId: {
                contains: trimmedQuery,
                mode: "insensitive",
              },
            },
            {
              author: {
                name: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  const [submissions, totalCount] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: true,
        journal: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            payments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { status: true },
            },
          },
        },
        agreement: {
          select: { status: true },
        },
      },
    }),
    prisma.submission.count({ where }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE),
  );

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams();

    if (isValidStatus && status) params.set("status", status);
    if (trimmedQuery) params.set("query", trimmedQuery);
    params.set("page", String(targetPage));

    return `/admin/submissions?${params.toString()}`;
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-4xl font-bold">Submissions</h1>

      <p className="mt-4 text-slate-600">
        Manage manuscript submissions and editorial workflow.
      </p>

      <form
        method="get"
        className="mt-8 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-[1fr_220px_auto]"
      >
        <div>
          <label
            htmlFor="query"
            className="mb-1.5 block text-sm font-semibold"
          >
            Search
          </label>

          <input
            id="query"
            name="query"
            type="search"
            defaultValue={trimmedQuery}
            placeholder="Title, manuscript ID, or author name"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="mb-1.5 block text-sm font-semibold"
          >
            Status
          </label>

          <select
            id="status"
            name="status"
            defaultValue={isValidStatus ? status : ""}
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          >
            <option value="">All statuses</option>

            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 sm:w-auto"
          >
            Filter
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">Submitted Manuscripts</h2>

          <p className="mt-1 text-sm text-slate-500">
            {totalCount} {totalCount === 1 ? "submission" : "submissions"}
            {isValidStatus || trimmedQuery ? " matching your filters" : ""}
          </p>
        </div>

        <div className="overflow-x-auto p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Manuscript ID</th>
                <th className="p-3">Title</th>
                <th className="p-3">Author</th>
                <th className="p-3">Journal</th>
                <th className="p-3">Status</th>
                <th className="p-3">Invoice</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Agreement</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((submission) => {
                const latestPaymentStatus: PaymentStatus | null =
                  submission.invoice?.payments[0]?.status ?? null;

                const invoiceStatus: InvoiceStatus | null =
                  submission.invoice?.status ?? null;

                const agreementStatus = submission.agreement?.status ?? null;

                return (
                  <tr
                    key={submission.id}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="p-3 font-mono text-sm">
                      {submission.displayId || "—"}
                    </td>
                    <td className="p-3 font-medium">
                      {submission.title}
                    </td>
                    <td className="p-3">{submission.author.name}</td>
                    <td className="p-3">
                      {submission.journal.shortName}
                    </td>
                    <td className="p-3">
                      <StatusPill status={submission.status} />
                    </td>
                    <td className="p-3">
                      {invoiceStatus ? (
                        <StatusPill status={invoiceStatus} />
                      ) : (
                        <span className="text-slate-400">
                          Not invoiced
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {latestPaymentStatus ? (
                        <StatusPill status={latestPaymentStatus} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {agreementStatus ? (
                        <StatusPill status={agreementStatus} />
                      ) : (
                        <span className="text-slate-400">Not sent</span>
                      )}
                    </td>
                    <td className="p-3">
                      {submission.submittedAt
                        ? submission.submittedAt.toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/submissions/${submission.id}`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {submissions.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-slate-500"
                  >
                    No submissions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-6">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={buildPageHref(currentPage - 1)}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Previous
                </Link>
              )}

              {currentPage < totalPages && (
                <Link
                  href={buildPageHref(currentPage + 1)}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
