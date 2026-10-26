// src/shared/components/layout/TopLoadingBar.tsx
// ═══════════════════════════════════════════════════════════
// Top Loading Bar — Slim gold progress indicator
//
// Shows a thin animated bar at the top of the viewport
// when:
//   - TanStack Query has active fetches
//   - A route navigation is in progress
//
// Disappears with a fade when all activity completes.
// Style: YouTube/Next.js/NProgress — minimal, gold, cinematic.
//
// pointer-events: none — never blocks interaction.
//
// Rules: #1 tokens, #18 reducedMotion
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useIsFetching } from "@tanstack/react-query";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

export function TopLoadingBar() {
  const isFetching = useIsFetching();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Route change trigger ──
  const prevPath = useRef(location.pathname);
  const [navLoading, setNavLoading] = useState(false);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setNavLoading(true);
      // Route loads fast (lazy chunk + render), clear after 800ms
      const timer = setTimeout(() => setNavLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // ── Active state ──
  const isActive = isFetching > 0 || navLoading;

  useEffect(() => {
    if (isActive) {
      // Start: show bar, begin progress
      setVisible(true);
      setFading(false);
      setProgress(0);

      // Advance quickly to 80%, then slow down
      let current = 0;
      intervalRef.current = setInterval(() => {
        current += current < 60 ? 8 : current < 80 ? 3 : 1;
        if (current >= 90) {
          clearInterval(intervalRef.current);
          current = 90;
        }
        setProgress(current);
      }, 100);
    } else if (visible) {
      // Finish: jump to 100%, then fade out
      clearInterval(intervalRef.current);
      setProgress(100);

      finishTimerRef.current = setTimeout(() => {
        setFading(true);
        setTimeout(() => {
          setVisible(false);
          setProgress(0);
          setFading(false);
        }, reduced ? 0 : 300);
      }, 200);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(finishTimerRef.current);
    };
  }, [isActive, visible, reduced]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 99999,
        pointerEvents: "none",
        opacity: fading ? 0 : 1,
        transition: `opacity ${reduced ? "0ms" : "300ms"} ease`,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--color-gold-400), var(--color-gold-200))",
          boxShadow: "0 0 8px rgba(201,169,110,0.5), 0 0 4px rgba(201,169,110,0.3)",
          borderRadius: "0 2px 2px 0",
          transition: reduced ? "none" : "width 200ms ease-out",
        }}
      />
    </div>
  );
}
