// src/shared/hooks/useRipple.ts
// ═══════════════════════════════════════════════════════════
// Glass Ripple — click-to-expand translucent ring
//
// Ported from Liquid Glass Kit (GlassRipple).
// Creates a span at click position, scales up, fades out.
// Max 3 concurrent ripples per element.
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect } from "react";

export function useRipple<T extends HTMLElement = HTMLDivElement>(
  enabled: boolean = true,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // Guard: reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      // Skip if too many ripples
      if (el.querySelectorAll("[data-ripple]").length > 3) return;

      const ripple = document.createElement("span");
      ripple.setAttribute("data-ripple", "");
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      Object.assign(ripple.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.30)",
        transform: "scale(0)",
        pointerEvents: "none",
        animation: "ripple 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        zIndex: "999",
      });

      // Ensure parent is positioned
      const pos = getComputedStyle(el).position;
      if (pos === "static") el.style.position = "relative";
      el.style.overflow = "hidden";

      el.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), {
        once: true,
      });
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [enabled]);

  return ref;
}