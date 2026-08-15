import Link from "next/link";
import type { Metadata } from "next";

import { unsubscribeFromNewsletter } from "@/lib/newsletter/actions";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: {
    index: false,
    follow: false,
  },
};

type UnsubscribePageProps = {
  params: Promise<{ token: string }>;
};

export default async function UnsubscribePage({
  params,
}: UnsubscribePageProps) {
  const { token } = await params;

  let result:
    | { success: true; email: string }
    | { success: false; message: string };

  try {
    const { email } = await unsubscribeFromNewsletter(token);
    result = { success: true, email };
  } catch (error) {
    result = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        {result.success ? (
          <>
            <h1 className="text-2xl font-bold text-slate-950">
              You&apos;ve been unsubscribed
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
              {result.email} will no longer receive IJKRI Research Update
              emails.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-950">
              Unable to unsubscribe
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
              {result.message}
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
