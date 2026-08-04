"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { REVIEWER_NAV_LINKS as reviewerLinks } from "@/lib/constants/reviewer-nav-links";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {reviewerLinks.map(([label, href]) => {
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`block rounded-md px-3 py-2 text-sm font-medium ${
              active
                ? "bg-slate-950 text-white"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ReviewerNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm lg:hidden">
        <h2 className="text-base font-bold text-slate-950">
          Reviewer Area
        </h2>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="reviewer-mobile-nav"
          className="rounded-md border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {isOpen ? "Close" : "Menu"}
        </button>
      </div>

      {isOpen && (
        <div
          id="reviewer-mobile-nav"
          className="mb-4 rounded-xl border bg-white p-4 shadow-sm lg:hidden"
        >
          <NavLinks onNavigate={() => setIsOpen(false)} />
        </div>
      )}

      <aside className="sticky top-8 hidden w-64 shrink-0 self-start rounded-xl border bg-white p-5 shadow-sm lg:block">
        <h2 className="text-lg font-bold text-slate-950">Reviewer Area</h2>

        <div className="mt-6">
          <NavLinks />
        </div>
      </aside>
    </>
  );
}
