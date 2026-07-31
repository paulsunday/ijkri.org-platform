"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const adminLinks = [
  ["Dashboard", "/admin"],
  ["Journals", "/admin/journals"],
  ["Editorial Board", "/admin/editorial-board"],
  ["Submissions", "/admin/submissions"],
  ["Users & Roles", "/admin/users"],
  ["Volumes", "/admin/volumes"],
  ["Issues", "/admin/issues"],
  ["Articles", "/admin/articles"],
  ["Reviews", "/admin/reviews"],
  ["Reviewer Applications", "/admin/reviewer-applications"],
  ["Career Applications", "/admin/career-applications"],
  ["Payments", "/admin/payments"],
  ["DOI Records", "/admin/doi-records"],
  ["Settings", "/admin/settings"],
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {adminLinks.map(([label, href]) => {
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

export function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm lg:hidden">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            Publisher Admin
          </h2>
          <p className="text-xs text-slate-500">
            Innovare Academic Publishing
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="admin-mobile-nav"
          className="rounded-md border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {isOpen ? "Close" : "Menu"}
        </button>
      </div>

      {isOpen && (
        <div
          id="admin-mobile-nav"
          className="mb-4 rounded-xl border bg-white p-4 shadow-sm lg:hidden"
        >
          <NavLinks onNavigate={() => setIsOpen(false)} />
        </div>
      )}

      <aside className="sticky top-8 hidden max-h-[calc(100vh-4rem)] w-64 shrink-0 self-start overflow-y-auto rounded-xl border bg-white p-5 shadow-sm lg:block">
        <h2 className="text-lg font-bold text-slate-950">Publisher Admin</h2>
        <p className="mt-1 text-sm text-slate-500">
          Innovare Academic Publishing
        </p>

        <div className="mt-6">
          <NavLinks />
        </div>
      </aside>
    </>
  );
}
