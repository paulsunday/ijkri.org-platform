import { prisma } from "@/lib/prisma";
import { hashAgreementToken } from "@/lib/agreements/send-agreement";
import { HoneypotField } from "@/components/forms/honeypot-field";

import { signAgreementByToken } from "./actions";

type AgreementSigningPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AgreementSigningPage({
  params,
  searchParams,
}: AgreementSigningPageProps) {
  const { token } = await params;
  const { error } = await searchParams;

  const signature = await prisma.agreementSignature.findUnique({
    where: { tokenHash: hashAgreementToken(token) },
    include: {
      agreement: {
        include: {
          submission: {
            select: {
              id: true,
              title: true,
              displayId: true,
              journal: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!signature) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Link not found</h1>
        <p className="mt-4 text-slate-600">
          This signing link is invalid. Please contact the editorial office
          if you believe this is an error.
        </p>
      </main>
    );
  }

  if (signature.signedAt) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Already signed</h1>
        <p className="mt-4 text-slate-600">
          This publication agreement has already been signed. No further
          action is needed.
        </p>
      </main>
    );
  }

  const tokenExpired = signature.tokenExpiresAt
    ? signature.tokenExpiresAt < new Date()
    : false;

  if (tokenExpired) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Link expired</h1>
        <p className="mt-4 text-slate-600">
          This signing link has expired. Please contact the editorial office
          to request a new one.
        </p>
      </main>
    );
  }

  const { submission } = signature.agreement;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Publication Agreement</h1>

      <p className="mt-2 text-slate-600">
        {submission.journal.name} · Manuscript{" "}
        {submission.displayId ?? submission.id}
      </p>

      <p className="mt-1 font-semibold">{submission.title}</p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-8 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-slate-50 p-6 text-sm leading-6 text-slate-800">
        {signature.agreement.agreementText}
      </div>

      <form
        action={signAgreementByToken}
        className="mt-8 space-y-6"
      >
        <input type="hidden" name="token" value={token} />

        <HoneypotField />

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1"
          />
          <span>
            I have read and agree to be bound by the terms of this
            Publication Agreement.
          </span>
        </label>

        <div>
          <label
            htmlFor="typedLegalName"
            className="mb-2 block font-medium"
          >
            Type your full legal name to sign
          </label>

          <input
            id="typedLegalName"
            name="typedLegalName"
            type="text"
            required
            placeholder={signature.signerName}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-black px-8 py-3 font-semibold text-white hover:bg-gray-800"
        >
          Sign Agreement
        </button>
      </form>
    </main>
  );
}
