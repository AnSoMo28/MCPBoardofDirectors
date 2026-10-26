// src/shared/components/layout/CursorEffect.tsx
// Fase 21 — Silver Tide Custom Cursor
// Glass-aware · Press state · Velocity morph · Edge fade · Idle breathing · Lifecycle
// ═══════════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from "react";
import './CursorEffect.css';
/* ── Glass-aware interactive selector ── */
const INTERACTIVE_SEL = [
  /* Native */
  'button:not([data-cursor-exclude])',
  'a',
  '[role="button"]',
  'input',
  'select',
  'textarea',
  /* Navigation */
  '.nav-item',
  '.sidebar-link',
  '.sidebar-upload-btn',
  '.glass-header-search',
  '.mobile-nav-item',
  '.quick-actions-fab',
  /* Glass surfaces */
  '.glass-card',
  '.glass-finance-kpi',
  '.glass-pulse-card',
  '.glass-pulse-compact',
  '.glass-profit-row',
  '.glass-profit-mobile-card',
  '.glass-stress-chip',
  '.glass-cohort-chip',
  '.glass-calendar-day',
  '.glass-event-card',
  '.glass-billing-item',
  '.glass-billing-invoice',
  '.glass-billing-tab',
  '.glass-billing-preset',
  '.glass-analytics-section__header',
  '.glass-decision-scenario',
  '.glass-decision-pill',
  '.glass-family-row',
  '.glass-age-group-row',
  '.glass-narrative-insight',
  '.glass-narrative-cascade__item',
  '.glass-narrative-section',
  '.glass-narrative-provenance',
  '.glass-seasonal-month-row',
  '.glass-stress-memory-chip',
  '.glass-account-scorecard',
  '.glass-invoice-journey',
  '.glass-insight-card',
  '.glass-advisor-banner',
  '.glass-ml-card',
  '.glass-anomaly-feed-item',
  '.glass-tx-node',
  '.glass-exec-metric',
  /* Generic */
  '.rain-card',
  '.stat-surface',
  '.rain-btn',
  '[data-cursor-interactive]',
].join(", ");

/* ── Sizes (base for scale calculation) ── */
const SIZE_DOT = 10;
const SIZE_DOT_HOVER = 18;
const SIZE_DOT_PRESS = 7;
const SIZE_RING = 36;
const SIZE_RING_HOVER = 54;
const SIZE_RING_PRESS = 30;

/* ── Timing ── */
const IDLE_THRESHOLD = 3000;
const DEEP_IDLE_THRESHOLD = 30000;
const EDGE_MARGIN = 40;

export default function CursorEffect() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  /* ── Mutable cursor state — zero re-renders ── */
  const s = useRef({
    dotX: 0, dotY: 0,
    ringX: 0, ringY: 0,
    targetX: 0, targetY: 0,
    prevTargetX: 0, prevTargetY: 0,
    dotSize: SIZE_DOT,
    ringSize: SIZE_RING,
    smoothVX: 0, smoothVY: 0,
    isOverInteractive: false,
    isPressed: false,
    viewportExited: false,
    firstMoveReceived: false,
    lastMoveTime: 0,
    pressOvershootUntil: 0,
    opacity: 0,
    targetOpacity: 0,
  });

  const [supported, setSupported] = useState(false);
  const reducedMotion = useRef(false);

  /* ════════════════════════════════
     Capability Detection
     ════════════════════════════════ */
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setSupported(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSupported(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { reducedMotion.current = e.matches; };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    document.body.classList.add("custom-cursor-active");
    return () => document.body.classList.remove("custom-cursor-active");
  }, [supported]);

  /* ════════════════════════════════
     Event Handlers
     ════════════════════════════════ */
  const handleFirstMove = useCallback((e: MouseEvent) => {
    const c = s.current;
    c.dotX = c.ringX = c.targetX = c.prevTargetX = e.clientX;
    c.dotY = c.ringY = c.targetY = c.prevTargetY = e.clientY;
    c.firstMoveReceived = true;
    c.lastMoveTime = performance.now();
    c.targetOpacity = 1;
    window.removeEventListener("mousemove", handleFirstMove);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const c = s.current;
    c.targetX = e.clientX;
    c.targetY = e.clientY;
    c.lastMoveTime = performance.now();
    if (c.viewportExited) {
      c.viewportExited = false;
      c.targetOpacity = 1;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    c.isOverInteractive = el ? !!el.closest(INTERACTIVE_SEL) : false;
  }, []);

  const handlePointerDown = useCallback(() => {
    s.current.isPressed = true;
    dotRef.current?.classList.add("cursor-dot--pressed");
    ringRef.current?.classList.add("cursor-ring--pressed");
  }, []);

  const handlePointerUp = useCallback(() => {
    const c = s.current;
    c.isPressed = false;
    c.pressOvershootUntil = performance.now() + 120;
    dotRef.current?.classList.remove("cursor-dot--pressed");
    ringRef.current?.classList.remove("cursor-ring--pressed");
  }, []);

  const handleMouseLeave = useCallback(() => {
    s.current.viewportExited = true;
    s.current.targetOpacity = 0;
  }, []);

  const handleMouseEnter = useCallback(() => {
    const c = s.current;
    c.viewportExited = false;
    c.targetOpacity = c.firstMoveReceived ? 1 : 0;
  }, []);

  /* ════════════════════════════════
     Animation Loop
     ════════════════════════════════ */
  useEffect(() => {
    if (!supported) return;

    window.addEventListener("mousemove", handleFirstMove);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    let frameId: number;

    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      const c = s.current;
      if (!c.firstMoveReceived) return;

      const rm = reducedMotion.current;

      /* 1 ─ Position lerp */
      const lpD = rm ? 1 : 0.35;
      const lpR = rm ? 1 : 0.14;
      c.dotX += (c.targetX - c.dotX) * lpD;
      c.dotY += (c.targetY - c.dotY) * lpD;
      c.ringX += (c.targetX - c.ringX) * lpR;
      c.ringY += (c.targetY - c.ringY) * lpR;

      /* 2 ─ Velocity (smoothed) */
      const rawVX = c.targetX - c.prevTargetX;
      const rawVY = c.targetY - c.prevTargetY;
      c.prevTargetX = c.targetX;
      c.prevTargetY = c.targetY;
      c.smoothVX += (rawVX - c.smoothVX) * 0.2;
      c.smoothVY += (rawVY - c.smoothVY) * 0.2;
      const speed = Math.sqrt(c.smoothVX ** 2 + c.smoothVY ** 2);

      /* 3 ─ Target sizes */
      let dotTarget = c.isOverInteractive ? SIZE_DOT_HOVER : SIZE_DOT;
      let ringTarget = c.isOverInteractive ? SIZE_RING_HOVER : SIZE_RING;
      if (c.isPressed) {
        dotTarget = SIZE_DOT_PRESS;
        ringTarget = SIZE_RING_PRESS;
      } else if (now < c.pressOvershootUntil) {
        dotTarget *= 1.15;
        ringTarget *= 1.1;
      }

      /* 4 ─ Lerp sizes */
      const sl = rm ? 1 : 0.15;
      c.dotSize += (dotTarget - c.dotSize) * sl;
      c.ringSize += (ringTarget - c.ringSize) * sl;

      /* 5 ─ Ring morph (velocity → stretch + rotate) */
      const stretch = Math.min(speed * 0.004, 0.25);
      const angle = speed > 1.5
        ? Math.atan2(c.smoothVY, c.smoothVX) * 57.2958
        : 0;

      /* 6 ─ Idle breathing */
      const timeSinceMove = now - c.lastMoveTime;
      const idle = timeSinceMove > IDLE_THRESHOLD && !c.isPressed;
      const deepIdle = timeSinceMove > DEEP_IDLE_THRESHOLD;
      const breathe = idle && !deepIdle ? Math.sin(now * 0.0015) * 0.06 : 0;

      /* 7 ─ Edge fade */
      const minEdge = Math.min(
        c.dotX, c.dotY,
        window.innerWidth - c.dotX,
        window.innerHeight - c.dotY,
      );
      const edgeFade = Math.min(minEdge / EDGE_MARGIN, 1);

      /* 8 ─ Lifecycle opacity */
      let tOp = c.viewportExited ? 0 : c.targetOpacity;
      if (deepIdle) tOp = Math.min(tOp, 0.25);
      c.opacity += (tOp - c.opacity) * (rm ? 1 : 0.1);
      const finalOp = c.opacity * edgeFade;

      /* 9 ─ Apply to DOM */
      const dotScale = c.dotSize / SIZE_DOT + breathe;

      if (dotRef.current) {
        dotRef.current.style.left = `${c.dotX}px`;
        dotRef.current.style.top = `${c.dotY}px`;
        dotRef.current.style.transform = `translate(-50%,-50%) scale(${dotScale})`;
        dotRef.current.style.opacity = `${finalOp}`;
      }

      if (ringRef.current) {
        const rScale = c.ringSize / SIZE_RING;
        const sx = (1 + stretch) * rScale + breathe;
        const sy = (1 - stretch * 0.5) * rScale + breathe;
        ringRef.current.style.left = `${c.ringX}px`;
        ringRef.current.style.top = `${c.ringY}px`;
        ringRef.current.style.transform =
          `translate(-50%,-50%) rotate(${angle}deg) scaleX(${sx}) scaleY(${sy})`;
        ringRef.current.style.opacity = `${finalOp}`;
        ringRef.current.style.borderColor = c.isPressed
          ? "rgba(240,217,168,0.8)"
          : c.isOverInteractive
            ? "rgba(240,217,168,0.7)"
            : "rgba(240,217,168,0.4)";
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleFirstMove);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [supported, handleFirstMove, handleMouseMove, handlePointerDown, handlePointerUp, handleMouseLeave, handleMouseEnter]);

  if (!supported) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
        data-cursor-exclude
        aria-hidden="true"
      />
      <div
        ref={ringRef}
        className="cursor-ring"
        data-cursor-exclude
        aria-hidden="true"
      />
    </>
  );
}