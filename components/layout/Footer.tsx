import Image from "next/image";
import Link from "next/link";

const journalLinks = [
  {
    label: "About the Journal",
    href: "/about",
  },
  {
    label: "Aims and Scope",
    href: "/aims-scope",
  },
  {
    label: "Editorial Board",
    href: "/editorial-board",
  },
  {
    label: "Peer Review Process",
    href: "/peer-review",
  },
  {
    label: "Publication Ethics",
    href: "/publication-ethics",
  },
];

const authorLinks = [
  {
    label: "Author Guidelines",
    href: "/author-guidelines",
  },
  {
    label: "Submit Manuscript",
    href: "/author/submit",
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
    label: "Call for Papers",
    href: "/call-for-papers",
  },
];

const opportunityLinks = [
  {
    label: "Become a Reviewer and Earn",
    href: "/reviewer/apply",
  },
  {
    label: "Careers and Opportunities",
    href: "/careers",
  },
  {
    label: "Register",
    href: "/register",
  },
  {
    label: "Login",
    href: "/login",
  },
  {
    label: "Contact the Journal",
    href: "/contact",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white p-2">
              <Image
                src="/logo.png"
                alt="IJKRI logo"
                width={80}
                height={80}
                className="h-16 w-16 object-contain"
              />
            </div>

            <div>
              <p className="text-2xl font-bold">
                IJKRI
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-300">
                International Journal of Knowledge, Research and Innovation
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-md text-sm leading-7 text-slate-300">
            A multidisciplinary, peer-reviewed and
            open-access journal committed to advancing
            knowledge, innovation and research impact.
          </p>

          <div className="mt-6 space-y-2 text-sm text-slate-300">
            <p>
              <strong className="text-white">
                Publisher:
              </strong>{" "}
              Innovare Academic Publishing
            </p>

            <p>
              <strong className="text-white">
                Review model:
              </strong>{" "}
              Double-blind peer review
            </p>

            <p>
              <strong className="text-white">
                Access:
              </strong>{" "}
              Open access
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
            The Journal
          </h2>

          <ul className="mt-5 space-y-3 text-sm text-slate-300">
            {journalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
            Authors
          </h2>

          <ul className="mt-5 space-y-3 text-sm text-slate-300">
            {authorLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
            Opportunities
          </h2>

          <ul className="mt-5 space-y-3 text-sm text-slate-300">
            {opportunityLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-slate-400">
          <p>
            © {new Date().getFullYear()} Innovare Academic
            Publishing. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-5">
            <Link
              href="/publication-ethics"
              className="hover:text-white"
            >
              Ethics
            </Link>

            <Link
              href="/contact"
              className="hover:text-white"
            >
              Contact
            </Link>

            <Link
              href="/privacy"
              className="hover:text-white"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

