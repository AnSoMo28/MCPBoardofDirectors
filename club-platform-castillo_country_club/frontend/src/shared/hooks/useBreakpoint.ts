// src/shared/hooks/useBreakpoint.ts
// ═══════════════════════════════════════════════════════════
// Shared Hooks — Responsive Breakpoint Detection
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   useBreakpoint
// @keyframes   0
// @depends     none
//
// Centralized responsive breakpoint detection.
// Uses matchMedia (event-driven) — no resize listeners.
//
// Breakpoints match globals.css §8 Responsive:
//   mobile:  < 640px
//   tablet:  640px — 1023px
//   desktop: ≥ 1024px
//   wide:    ≥ 1280px
//
// Usage:
//   const { isDesktop, isMobile, width } = useBreakpoint();
//   if (isDesktop) { ... }
//
// ANTI-PATTERNS REMOVED:
// [x] No file header → added @level + @namespace
// [x] No § markers → §0-§2
// [x] No JSDoc → added on hook + interface fields
// [x] SSR guard implicit → documented explicitly
//
// FIXES v2.1 — Auditoría G9 (Paquete 1 · REQUEST 1 §13 #5):
// [x] G9-14 (P2) El estado inicial fijaba isDesktop:true y solo el efecto
//     corregía → en móvil/tablet el PRIMER frame renderizaba con breakpoint
//     erróneo (flash de layout). AHORA el initializer perezoso computa el
//     estado real desde window.innerWidth en cliente (SSR conserva el
//     default documentado). La semántica de `width` queda documentada:
//     se actualiza al cruzar un breakpoint (diseño sin resize-listeners).
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Current responsive breakpoint state.
 * All booleans are mutually exclusive (only one is true at a time),
 * except `isWide` which is true when `isDesktop` is also true.
 */
export interface BreakpointState {
  /** Viewport < 640px */
  readonly isMobile: boolean;
  /** Viewport 640px — 1023px */
  readonly isTablet: boolean;
  /** Viewport ≥ 1024px */
  readonly isDesktop: boolean;
  /** Viewport ≥ 1280px */
  readonly isWide: boolean;
  /**
   * Viewport width (px) en el ÚLTIMO cambio de breakpoint.
   * G9-14: por diseño NO hay resize-listener — el valor se refresca
   * solo cuando una media query cambia de estado (aproximación
   * deliberada: cero coste de re-render durante resize continuo).
   */
  readonly width: number;
}

// ═══════════════════════════════════════════════════════════
// §2 HOOK
// ═══════════════════════════════════════════════════════════

/** Default SSR (sin window): desktop 1024px — documentado, no oculto. */
const SSR_STATE: BreakpointState = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isWide: false,
  width: 1024,
};

/** G9-14: estado real en cliente — elimina el flash de primer frame. */
function computeClientState(): BreakpointState {
  const w = window.innerWidth;
  return {
    isMobile: w < 640,
    isTablet: w >= 640 && w < 1024,
    isDesktop: w >= 1024,
    isWide: w >= 1280,
    width: w,
  };
}

/**
 * Detect current responsive breakpoint using matchMedia.
 *
 * Event-driven: no resize listeners.
 * SSR-safe: defaults to desktop (1024px) when window is undefined.
 * G9-14: primer render YA correcto en cliente (sin flash de layout).
 *
 * @returns Current breakpoint state with boolean flags + width
 */
export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() =>
    typeof window === "undefined" ? SSR_STATE : computeClientState(),
  );

  useEffect(() => {
    const queries = {
      mobile: window.matchMedia("(max-width: 639px)"),
      tablet: window.matchMedia("(min-width: 640px) and (max-width: 1023px)"),
      desktop: window.matchMedia("(min-width: 1024px)"),
      wide: window.matchMedia("(min-width: 1280px)"),
    };

    const sync = (): void => {
      setState({
        isMobile: queries.mobile.matches,
        isTablet: queries.tablet.matches,
        isDesktop: queries.desktop.matches,
        isWide: queries.wide.matches,
        width: window.innerWidth,
      });
    };

    // Reconciliación inicial (matchMedia es autoridad ante zoom/frac
    // subpixel en los bordes exactos 639.5px/1023.5px)
    sync();

    // Event-driven: listen for breakpoint changes (no resize)
    const entries = Object.values(queries);
    entries.forEach((mql) => mql.addEventListener("change", sync));
    return () => entries.forEach((mql) => mql.removeEventListener("change", sync));
  }, []);

  return state;
}
