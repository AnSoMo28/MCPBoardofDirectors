// src/shared/hooks/useReducedMotion.ts
// ═══════════════════════════════════════════════════════════
// CASTILLO — useReducedMotion Hook
//
// Detects prefers-reduced-motion user preference.
// Returns true when the user prefers reduced motion.
//
// Use with Framer Motion:
//   const reduced = useReducedMotion();
//   <motion.div initial={reduced ? false : { opacity: 0 }} ... />
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
