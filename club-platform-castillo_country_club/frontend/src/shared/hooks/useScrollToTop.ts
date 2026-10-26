// src/shared/hooks/useScrollToTop.ts
// ═══════════════════════════════════════════════════════════
// Scroll to top on route change
//
// Scrolls the main content area to top when pathname changes.
// Must be mounted inside the component that owns the scrollable
// container (DashboardLayout's <main>).
//
// Uses a MutationObserver fallback because React Router's
// scroll restoration can be unreliable with lazy routes.
// ═══════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useLocation } from "react-router";

export function useScrollToTop(containerId = "main-content") {
  const { pathname } = useLocation();

  useEffect(() => {
    // Small delay to let the new route render
    const timer = requestAnimationFrame(() => {
      const el = document.getElementById(containerId);
      if (el && el.scrollTop > 0) {
        el.scrollTo({ top: 0, behavior: "instant" });
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [pathname, containerId]);
}
