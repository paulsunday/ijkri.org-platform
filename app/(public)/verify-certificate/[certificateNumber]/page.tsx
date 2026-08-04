import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ certificateNumber: string }>;
};

export default async function VerifyCertificatePage({ params }: Props) {
  const { certificateNumber } = await params;

  const certificate = await prisma.ambassadorCertificate.findUnique({
    where: { certificateNumber },
    select: {
      title: true,
      certificateNumber: true,
      issuedAt: true,
      revoked: true,
      ambassador: {
        select: {
          journal: { select: { name: true } },
          user: { select: { name: true, affiliation: true, country: true } },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Certificate Verification</h1>

      {!certificate ? (
        <div className="mt-8 rounded-xl border border-red-300 bg-red-50 p-6 text-red-900">
          No certificate was found with the number{" "}
          <strong>{certificateNumber}</strong>.
        </div>
      ) : certificate.revoked ? (
        <div className="mt-8 rounded-xl border border-red-300 bg-red-50 p-6 text-red-900">
          This certificate has been revoked and is no longer valid.
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-emerald-300 bg-emerald-50 p-6">
          <span className="inline-flex rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
            Valid Certificate
          </span>

          <h2 className="mt-4 text-2xl font-bold">{certificate.title}</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-semibold text-slate-600">Recipient</dt>
              <dd>{certificate.ambassador.user.name}</dd>
            </div>

            {certificate.ambassador.user.affiliation && (
              <div>
                <dt className="font-semibold text-slate-600">Affiliation</dt>
                <dd>{certificate.ambassador.user.affiliation}</dd>
              </div>
            )}

            <div>
              <dt className="font-semibold text-slate-600">Journal</dt>
              <dd>{certificate.ambassador.journal.name}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-600">Issued</dt>
              <dd>{certificate.issuedAt.toLocaleDateString()}</dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-600">
                Certificate number
              </dt>
              <dd className="font-mono">{certificate.certificateNumber}</dd>
            </div>
          </dl>
        </div>
      )}
    </main>
  );
}
