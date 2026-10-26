// src/shared/components/layout/AvatarAura.tsx
// Fase 21 — Silver Tide Avatar Aura
// State chromatic · HiDPI · Visibility gate · Idle decay · Interactive · Light mode
// ════════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import './AvatarAura.css';
/* ── Types ── */
interface AvatarAuraProps {
  size?: number;
  avatarSize?: number;
  /** 0-100 — maps to engagement color when explicit engagement is not set */
  healthScore?: number;
  /** Explicit engagement state — overrides healthScore color mapping */
  engagement?: "active" | "warm" | "dormant" | "at-risk";
  /** Enables hover/press interaction on the aura ring area */
  interactive?: boolean;
}

/* ── Engagement → target RGB ── */
const ENGAGEMENT_COLORS: Record<string, { r: number; g: number; b: number }> = {
  active: { r: 201, g: 169, b: 110 },
  warm: { r: 210, g: 160, b: 70 },
  dormant: { r: 80, g: 180, b: 180 },
  "at-risk": { r: 200, g: 100, b: 120 },
};

const DEFAULT_COLOR = { r: 170, g: 170, b: 180 };

function getTargetColor(engagement?: string, healthScore?: number): { r: number; g: number; b: number } {
  if (engagement && ENGAGEMENT_COLORS[engagement]) return ENGAGEMENT_COLORS[engagement];
  if (healthScore !== undefined) {
    if (healthScore >= 70) return ENGAGEMENT_COLORS.active;
    if (healthScore >= 40) return ENGAGEMENT_COLORS.warm;
    return ENGAGEMENT_COLORS.dormant;
  }
  return DEFAULT_COLOR;
}

/* ── Component ── */
export default function AvatarAura({
  size = 124,
  avatarSize = 88,
  healthScore,
  engagement,
  interactive = false,
}: AvatarAuraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ── Animation state — all mutable, zero re-renders ── */
  const anim = useRef({
    t: 0,
    color: { r: 170, g: 170, b: 180 },
    isHovering: false,
    isPressed: false,
    overshootUntil: 0,
    lastInteraction: performance.now(),
    lastDrawTime: 0,
    visible: true,
    tabHidden: false,
  });

  /* ── Props ref — latest values accessible in draw loop ── */
  const propsRef = useRef({ healthScore, engagement });
  useEffect(() => {
    propsRef.current = { healthScore, engagement };
    /* Treat prop changes as interaction to wake up from idle */
    anim.current.lastInteraction = performance.now();
  }, [healthScore, engagement]);

  /* ═══════════════════════════════════════════════════════════
     Canvas setup + animation loop
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    /* ── HiDPI ── */
    const dpr = window.devicePixelRatio || 1;
    const S = size;
    cvs.width = S * dpr;
    cvs.height = S * dpr;
    ctx.scale(dpr, dpr);
    const cx = S / 2;
    const cy = S / 2;
    const R = avatarSize / 2 + 2;

    /* ── Reduced motion ── */
    const mqRM = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = mqRM.matches;
    const onRM = (e: MediaQueryListEvent) => { reducedMotion = e.matches; };
    mqRM.addEventListener("change", onRM);

    /* ── Visibility gate — IntersectionObserver ── */
    const observer = new IntersectionObserver(
      ([entry]) => { anim.current.visible = entry.isIntersecting; },
      { threshold: 0.1 },
    );
    observer.observe(cvs);

    /* ── Visibility gate — tab hidden ── */
    const onVis = () => { anim.current.tabHidden = document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    /* ── Interactive event handlers ── */
    const onEnter = () => {
      anim.current.isHovering = true;
      anim.current.lastInteraction = performance.now();
    };
    const onLeave = () => {
      anim.current.isHovering = false;
      anim.current.isPressed = false;
    };
    const onDown = () => {
      anim.current.isPressed = true;
      anim.current.lastInteraction = performance.now();
    };
    const onUp = () => {
      anim.current.isPressed = false;
      anim.current.overshootUntil = performance.now() + 120;
    };

    if (interactive) {
      cvs.addEventListener("pointerenter", onEnter);
      cvs.addEventListener("pointerleave", onLeave);
      cvs.addEventListener("pointerdown", onDown);
      cvs.addEventListener("pointerup", onUp);
    }

    /* ══════════════════════════════════
       Animation loop
       ══════════════════════════════════ */
    let fid = 0;

    const draw = (now: number) => {
      fid = requestAnimationFrame(draw);
      const a = anim.current;

      /* Skip if off-screen or tab hidden */
      if (!a.visible || a.tabHidden) return;

      /* ── Idle decay — tiered framerate ── */
      const elapsed = now - a.lastInteraction;
      const tier = elapsed > 30000 ? 2 : elapsed > 5000 ? 1 : 0;
      const interval = tier === 0 ? 16.67 : tier === 1 ? 33.33 : 66.67;
      if (now - a.lastDrawTime < interval) return;
      a.lastDrawTime = now;

      /* ── Time advance (modulated by tier + hover + reduced motion) ── */
      const baseSpeed = reducedMotion ? 0.004 : 0.014;
      const tierMul = tier === 0 ? 1 : tier === 1 ? 0.7 : 0.4;
      const hoverMul = a.isHovering ? 1.4 : 1;
      a.t += baseSpeed * tierMul * hoverMul;

      /* ── Color lerp toward engagement target ── */
      const target = getTargetColor(propsRef.current.engagement, propsRef.current.healthScore);
      const cLerp = reducedMotion ? 1 : 0.02;
      a.color.r += (target.r - a.color.r) * cLerp;
      a.color.g += (target.g - a.color.g) * cLerp;
      a.color.b += (target.b - a.color.b) * cLerp;

      /* ── Light mode detection ── */
      const isLight = document.documentElement.classList.contains("light");
      const alphaMul = isLight ? 0.5 : 1;

      /* ── Interactive radius modulation ── */
      const pressOff = a.isPressed ? -2 : 0;
      const overshootOff = now < a.overshootUntil ? 3 : 0;
      const rMod = pressOff + overshootOff;

      /* ── Glow intensity ── */
      const glowMul = a.isPressed ? 2.5 : a.isHovering ? 1.8 : 1;

      /* ── Clear ── */
      ctx.clearRect(0, 0, S, S);

      const cr = Math.round(a.color.r);
      const cg = Math.round(a.color.g);
      const cb = Math.round(a.color.b);

      /* ── 3 rotating shimmer arcs (120° phase offset) ── */
      for (let i = 0; i < 3; i++) {
        const phase = a.t + i * 2.094;
        const alpha = (0.13 + 0.09 * Math.sin(a.t * 1.3 + i)) * alphaMul * glowMul;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 5 + i * 3 + rMod, phase, phase + Math.PI * 1.1);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.6 - i * 0.35;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      /* ── Soft outer glow ring ── */
      const gAlpha = (0.06 + 0.03 * Math.sin(a.t * 0.6)) * alphaMul * glowMul;
      const grad = ctx.createRadialGradient(cx, cy, R - 2 + rMod, cx, cy, R + 17 + rMod);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${gAlpha.toFixed(4)})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, R + 10 + rMod, 0, Math.PI * 2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 18;
      ctx.stroke();

      /* ── Primary orbiting dot ── */
      const dotAngle = a.t * 0.85;
      const dotAlpha = (0.5 + 0.4 * Math.sin(a.t * 2)) * alphaMul * glowMul;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(dotAngle) * (R + 7 + rMod),
        cy + Math.sin(dotAngle) * (R + 7 + rMod),
        1.8, 0, Math.PI * 2,
      );
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${dotAlpha.toFixed(3)})`;
      ctx.fill();

      /* ── Counter-rotating secondary dot ── */
      const secAlpha = (0.3 + 0.2 * Math.sin(a.t * 1.5)) * alphaMul * glowMul;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(dotAngle + Math.PI) * (R + 5 + rMod),
        cy + Math.sin(dotAngle + Math.PI) * (R + 5 + rMod),
        1.1, 0, Math.PI * 2,
      );
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${secAlpha.toFixed(3)})`;
      ctx.fill();

      /* ── CSS glow on canvas element ── */
      const glowSize = a.isPressed ? 20 : a.isHovering ? 16 : 12;
      const glowOp = (0.12 * glowMul * alphaMul).toFixed(3);
      cvs.style.boxShadow = `0 0 ${glowSize}px 4px rgba(${cr},${cg},${cb},${glowOp})`;
    };

    fid = requestAnimationFrame(draw);

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(fid);
      observer.disconnect();
      mqRM.removeEventListener("change", onRM);
      document.removeEventListener("visibilitychange", onVis);
      if (interactive) {
        cvs.removeEventListener("pointerenter", onEnter);
        cvs.removeEventListener("pointerleave", onLeave);
        cvs.removeEventListener("pointerdown", onDown);
        cvs.removeEventListener("pointerup", onUp);
      }
    };
  }, [size, avatarSize, interactive]);

  const pad = Math.round((size - avatarSize) / 2);

  return (
    <canvas
      ref={canvasRef}
      className="avatar-aura-canvas"
      aria-hidden="true"
      data-cursor-interactive={interactive ? "" : undefined}
      style={{
        position: "absolute",
        top: -pad,
        left: -pad,
        width: size,
        height: size,
        zIndex: 0,
        pointerEvents: interactive ? "auto" : "none",
        transition: "box-shadow 0.3s ease",
        borderRadius: "50%",
      }}
    />
  );
}