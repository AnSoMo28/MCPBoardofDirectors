// src/shared/hooks/useTilt.ts
// ═══════════════════════════════════════════════════════════
// Glass Parallax Tilt — mouse-driven 3D rotation
//
// Ported from Liquid Glass Kit (GlassParallax).
// Applies rotateX/rotateY following cursor position.
// Skipped on: touch devices, prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect } from "react";

interface TiltOptions {
  /** Max rotation in degrees — default: 4 */
  maxDeg?: number;
  /** Scale on hover — default: 1.01 */
  scale?: number;
  /** translateY on hover — default: "-6px" */
  translate?: string;
}

export function useTilt<T extends HTMLElement = HTMLDivElement>(
  enabled: boolean = true,
  options: TiltOptions = {},
) {
  const ref = useRef<T>(null);
  const maxDeg = options.maxDeg ?? 4;
  const scale = options.scale ?? 1.01;
  const translate = options.translate ?? "-6px";

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // Guard: skip on touch devices
    if (window.matchMedia("(hover: none)").matches) return;
    // Guard: respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const dx =
        (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy =
        (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      // Disable transition for immediate response
      el.style.transition = "none";
      el.style.transform =
        `translateY(${translate}) scale(${scale}) rotateX(${(-dy * maxDeg).toFixed(2)}deg) rotateY(${(dx * maxDeg).toFixed(2)}deg)`;
    };

    const onLeave = () => {
      // Restore transition — CSS takes over the reset animation
      el.style.transition = "";
      el.style.transform = "";
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      // Cleanup in case component unmounts while hovered
      el.style.transition = "";
      el.style.transform = "";
    };
  }, [enabled, maxDeg, scale, translate]);

  return ref;
}