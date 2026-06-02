"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function VisitorTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    const p = pathname || window.location.pathname;

    // Don't track admin routes
    if (p.startsWith("/admin")) return;

    // Skip if same path as last tracked (prevent double-fire in dev)
    if (p === lastPath.current) return;
    lastPath.current = p;

    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_url: window.location.href,
        pathname: p,
        referrer: document.referrer || "",
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
