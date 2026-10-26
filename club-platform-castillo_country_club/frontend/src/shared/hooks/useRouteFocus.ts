// src/shared/hooks/useRouteFocus.ts
// ═══════════════════════════════════════════════════════════
// Route Focus — Move focus to h1 on route change
//
// WCAG 2.1: Single-page apps must announce page changes
// to screen readers. Focus on h1 signals "new page loaded".
//
// Mount once in DashboardLayout. Finds the first h1 in
// <main> and focuses it after each navigation.
// ═══════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useLocation } from "react-router";

export function useRouteFocus(containerId = "main-content") {
  const { pathname } = useLocation();

  useEffect(() => {
    // Let the new route render first
    const timer = requestAnimationFrame(() => {
      const container = document.getElementById(containerId);
      if (!container) return;

      const h1 = container.querySelector("h1");
      if (h1) {
        // Make focusable if not already
        if (!h1.hasAttribute("tabindex")) {
          h1.setAttribute("tabindex", "-1");
        }
        h1.focus({ preventScroll: true });
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [pathname, containerId]);
}
