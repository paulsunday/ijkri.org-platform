"use client";

import Script from "next/script";

/**
 * Renders a Cloudflare Turnstile challenge inside a <form>.
 *
 * Cloudflare's script finds this div by class, renders the widget,
 * and injects a hidden `cf-turnstile-response` input into the
 * surrounding form automatically — lib/security/verify-turnstile.ts
 * reads that same field name server-side.
 *
 * Renders nothing if no site key is configured, so local development
 * without a Cloudflare account isn't blocked.
 */
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </>
  );
}
