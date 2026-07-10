import Link from "next/link";
<Link href="/author/submit">Submit Manuscript</Link>

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-3 text-sm">
          Innovare Academic Publishing
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold text-slate-950">IJARI</h1>
          <p className="text-sm text-slate-600">
            International Journal of Advanced Research and Innovation
          </p>
        </Link>

        <nav className="hidden gap-6 text-sm font-medium md:flex">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/current-issue">Current Issue</Link>
          <Link href="/archives">Archives</Link>
          <Link href="/author-guidelines">Author Guidelines</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}