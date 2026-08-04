import { requireAnyRole } from "@/lib/auth/permissions";
import { REVIEWER_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";
import { ReviewerNav } from "@/components/reviewer/reviewer-nav";

export default async function ReviewerCertificatesPage() {
  const reviewer = await requireAnyRole(REVIEWER_ROLES);

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: {
      certificates: {
        where: { revoked: false },
        orderBy: { issuedAt: "desc" },
      },
    },
  });

  const certificates = ambassador?.certificates ?? [];

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <ReviewerNav />

        <main className="min-w-0 flex-1 space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Certificates</h1>
            <p className="mt-2 text-slate-600">
              Certificates you have earned as a reviewer and ambassador.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            {certificates.length === 0 ? (
              <p className="text-slate-500">
                You have not earned any certificates yet.
              </p>
            ) : (
              <div className="space-y-4">
                {certificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-semibold">{certificate.title}</p>

                      <p className="text-sm text-slate-500">
                        Issued {certificate.issuedAt.toLocaleDateString()} ·{" "}
                        {certificate.certificateNumber}
                      </p>
                    </div>

                    <a
                      href={`/reviewer/certificates/${certificate.id}/download`}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                    >
                      Download PDF
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
