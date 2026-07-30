import Image from "next/image";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getDashboardPath } from "@/lib/auth/dashboard-path";

const navigation = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Aims & Scope",
    href: "/aims-scope",
  },
  {
    label: "Editorial Board",
    href: "/editorial-board",
  },
  {
    label: "Current Issue",
    href: "/current-issue",
  },
  {
    label: "Archives",
    href: "/archives",
  },
  {
    label: "Author Guidelines",
    href: "/author-guidelines",
  },
  {
    label: "Careers",
    href: "/careers",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export default async function Header() {
  const user = await getCurrentUser();

  const dashboardPath = user
    ? getDashboardPath(user.roles) ?? "/account"
    : null;

  return (
    <header className="relative z-50 border-b border-slate-200 bg-white">
      <div className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2 text-xs sm:text-sm">
          <p className="font-medium">
            Innovare Academic Publishing
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/call-for-papers"
              className="text-amber-300 transition hover:text-amber-200"
            >
              Call for Papers
            </Link>

            <Link
              href="/peer-review"
              className="text-slate-200 transition hover:text-white"
            >
              Peer Review
            </Link>

            <Link
              href="/publication-ethics"
              className="text-slate-200 transition hover:text-white"
            >
              Publication Ethics
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="flex min-h-24 flex-wrap items-center justify-between gap-5 py-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-4"
          >
            <Image
              src="/logo.png"
              alt="International Journal of Knowledge, Research and Innovation logo"
              width={90}
              height={90}
              priority
              className="h-16 w-16 rounded-lg object-contain sm:h-20 sm:w-20"
            />

            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight text-slate-950">
                IJKRI
              </p>

              <p className="hidden max-w-md text-sm leading-5 text-slate-600 sm:block">
                International Journal of Knowledge, Research and Innovation
              </p>

              <p className="mt-1 hidden text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 lg:block">
                Knowledge · Research · Innovation
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/account"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-950 hover:bg-slate-50"
                >
                  My Account
                </Link>

                <Link
                  href={dashboardPath ?? "/account"}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-950 hover:bg-slate-50"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Register
                </Link>
              </>
            )}

            <Link
              href="/author/submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Submit Manuscript
            </Link>
          </div>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="border-t border-slate-200 bg-slate-50"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-3 px-6 py-4 text-sm font-semibold text-slate-700">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-amber-700"
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/reviewer/apply"
            className="ml-auto rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800 transition hover:bg-amber-100"
          >
            Become a Reviewer
          </Link>
        </div>
      </nav>
    </header>
  );
}
