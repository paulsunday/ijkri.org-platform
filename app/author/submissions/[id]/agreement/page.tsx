import Link from "next/link";

import { isSuperAdmin, requireAnyRole } from "@/lib/auth/permissions";
import { AUTHOR_ROLES } from "@/lib/auth/role-groups";
import { prisma } from "@/lib/prisma";

import { signAgreementAsAuthor } from "./actions";

type AuthorAgreementPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthorAgreementPage({
  params,
  searchParams,
}: AuthorAgreementPageProps) {
  const author = await requireAnyRole(AUTHOR_ROLES);
  const { id: submissionId } = await params;
  const { error } = await searchParams;

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      ...(isSuperAdmin(author) ? {} : { authorId: author.id }),
    },
    select: {
      id: true,
      title: true,
      displayId: true,
      journal: { select: { name: true } },
      agreement: {
        include: {
          signatures: true,
        },
      },
    },
  });

  if (!submission) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Submission not found</h1>
      </main>
    );
  }

  if (!submission.agreement) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">No agreement yet</h1>
        <p className="mt-4 text-slate-600">
          A publication agreement has not been sent for this manuscript yet.
          This happens automatically once the Article Processing Charge is
          paid or waived.
        </p>
        <Link
          href={`/author/submissions/${submission.id}`}
          className="mt-6 inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
        >
          Back to submission
        </Link>
      </main>
    );
  }

  const mySignature = submission.agreement.signatures.find(
    (signature) => signature.userId === author.id,
  );

  if (!mySignature) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">
          You are not a required signer
        </h1>
        <p className="mt-4 text-slate-600">
          This journal requires every co-author to sign individually; you
          should have received a separate signing link by email.
        </p>
      </main>
    );
  }

  if (mySignature.signedAt) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Already signed</h1>
        <p className="mt-4 text-slate-600">
          You signed this publication agreement on{" "}
          {mySignature.signedAt.toLocaleDateString()}.
          {submission.agreement.status === "SIGNED" &&
            " All required signatures have been collected."}
        </p>
      </main>
    );
  }

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
        {submission.agreement.agreementText}
      </div>

      <form action={signAgreementAsAuthor} className="mt-8 space-y-6">
        <input type="hidden" name="submissionId" value={submission.id} />

        <label className="flex items-start gap-3">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>
            I have read and agree to be bound by the terms of this
            Publication Agreement.
          </span>
        </label>

        <div>
          <label htmlFor="typedLegalName" className="mb-2 block font-medium">
            Type your full legal name to sign
          </label>

          <input
            id="typedLegalName"
            name="typedLegalName"
            type="text"
            required
            placeholder={mySignature.signerName}
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
