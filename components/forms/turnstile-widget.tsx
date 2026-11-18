"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: { sitekey: string; "response-field-name"?: string },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Renders a Cloudflare Turnstile challenge inside a <form>.
 *
 * The widget injects a hidden `cf-turnstile-response` input into the
 * surrounding form; lib/security/verify-turnstile.ts reads that field.
 *
 * Rendered explicitly (not by Cloudflare's auto-scan) so it also appears
 * when the page is reached by in-app navigation after the script has
 * already loaded.
 *
 * Renders nothing if no site key is configured, so local development
 * without a Cloudflare account isn't blocked.
 */
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.turnstile),
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!siteKey || !scriptReady || !container || !window.turnstile) {
      return;
    }

    const widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
    });

    return () => {
      window.turnstile?.remove(widgetId);
    };
  }, [siteKey, scriptReady]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
}
