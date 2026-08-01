"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

export default function MobileNav({
  navigation,
}: {
  navigation: NavItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:hidden">
        <span className="text-sm font-semibold text-slate-700">
          Browse the journal
        </span>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="main-mobile-nav"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {isOpen ? "Close" : "Menu"}
        </button>
      </div>

      {isOpen && (
        <div
          id="main-mobile-nav"
          className="border-t border-slate-200 px-6 py-4 lg:hidden"
        >
          <nav
            aria-label="Main navigation"
            className="flex flex-col gap-1 text-sm font-semibold text-slate-700"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-amber-700"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/reviewer/apply"
              onClick={() => setIsOpen(false)}
              className="mt-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-center text-amber-800 hover:bg-amber-100"
            >
              Become a Reviewer
            </Link>
          </nav>
        </div>
      )}

      <div className="hidden lg:block">
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
      </div>
    </>
  );
}
