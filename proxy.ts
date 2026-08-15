import { NextResponse } from "next/server";

import { auth } from "@/auth";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/aims-scope",
  "/archives",
  "/articles",
  "/author-guidelines",
  "/call-for-papers",
  "/careers",
  "/community",
  "/contact",
  "/current-issue",
  "/editorial-board",
  "/events",
  "/faq",
  "/insights",
  "/issues",
  "/peer-review",
  "/privacy",
  "/publication-ethics",
  "/resources",
  "/reviewer-centre",
  "/search",
  "/terms",
  "/unsubscribe",
  "/why-ijkri",
];

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/activate-account",
];

function matchesRoute(pathname: string, route: string): boolean {
  if (route === "/") {
    return pathname === "/";
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isAuthenticated = Boolean(request.auth?.user);

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  const isAuthenticationRoute = AUTH_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  /*
   * Signed-in users should not return to login,
   * registration, activation, or password-reset pages.
   */
  if (isAuthenticationRoute) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/post-login", request.url));
    }

    return NextResponse.next();
  }

  /*
   * Public journal pages remain accessible
   * without authentication.
   */
  if (isPublicRoute) {
    return NextResponse.next();
  }

  /*
   * Every remaining matched page requires
   * an authenticated session.
   */
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Exclude API routes, Next.js internals,
     * metadata files, public asset directories,
     * and files containing extensions.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|uploads|.*\\..*).*)",
  ],
};
