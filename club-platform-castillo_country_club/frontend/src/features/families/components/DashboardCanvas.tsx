// ═══════════════════════════════════════════════════════════
// src/features/families/components/DashboardCanvas.tsx
// Phase 34+ Migration — Dashboard Deep Space Canvas
// Level 6+ Agency · Apple Production Grade · 2027 Intelligence
//
// Full-screen canvas behind the dashboard glass surface.
// Renders 7 sub-layers that respond to family data:
//   1. Gradient mesh — mood-driven background (urgency → color)
//   2. Aurora bands — horizontal color washes
//   3. Pulse rings — concentric circles from center (rhythm → frequency)
//   4. Connection particles — gold/emerald/rose dots flowing
//   5. Dust motes — tiny white dots with Brownian drift
//   6. Star field — distant dots with mouse parallax
//   7. Vignette — dark edge falloff
//
// Pure canvas component. Receives mood data, renders pixels.
// No state management, no hooks except useRef + useEffect.
//
// PRE-WRITE VERIFICATION:
//   PulseRhythm → ../types.ts (steady|rhythmic|irregular|fading|flat)
//   UrgencyLevel → string (critical|high|moderate|low|minimal)
//   All props readonly ✅
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

export interface DashboardCanvasProps {
  readonly width: number;
  readonly height: number;
  /** 0-100 — drives aurora color intensity */
  readonly temperature: number;
  /** Pulse rhythm — drives ring frequency */
  readonly rhythm: string;
  /** Urgency level — drives overall mood gradient */
  readonly urgency: string;
  /** 0-1 health score — drives particle density */
  readonly healthScore: number;
  /** Mouse position for parallax (screen coords) */
  readonly mouseX: number;
  readonly mouseY: number;
  /** Whether to animate (false = static render) */
  readonly animate: boolean;
  /** Is light mode active */
  readonly isLight: boolean;
}

/** Resolved color palette for canvas (hardcoded — no CSS vars in canvas) */
interface Palette {
  readonly bg: string;
  readonly auroraWarm: string;
  readonly auroraCool: string;
  readonly pulseCore: string;
  readonly particleGold: string;
  readonly particleEmerald: string;
  readonly particleRose: string;
  readonly star: string;
  readonly vignette: string;
}

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Urgency → mood palette */
function resolvePalette(urgency: string, isLight: boolean): Palette {
  if (isLight) {
    return {
      bg: "#F0F2F5",
      auroraWarm: "#D4A840",
      auroraCool: "#2A9AB5",
      pulseCore: "#C9A96E",
      particleGold: "#C9A96E",
      particleEmerald: "#3DAA70",
      particleRose: "#E85D6E",
      star: "#8A95A5",
      vignette: "#F0F2F5",
    };
  }

  switch (urgency) {
    case "critical":
      return {
        bg: "#080B12",
        auroraWarm: "#E85D6E",
        auroraCool: "#8B3A4A",
        pulseCore: "#E85D6E",
        particleGold: "#C9A96E",
        particleEmerald: "#3DAA70",
        particleRose: "#E85D6E",
        star: "#B8C0CC",
        vignette: "#050810",
      };
    case "high":
      return {
        bg: "#080B12",
        auroraWarm: "#D4A840",
        auroraCool: "#8B6A2A",
        pulseCore: "#D4A840",
        particleGold: "#C9A96E",
        particleEmerald: "#3DAA70",
        particleRose: "#E85D6E",
        star: "#B8C0CC",
        vignette: "#050810",
      };
    default:
      return {
        bg: "#080B12",
        auroraWarm: "#1A3A4A",
        auroraCool: "#0D2B1A",
        pulseCore: "#C9A96E",
        particleGold: "#C9A96E",
        particleEmerald: "#3DAA70",
        particleRose: "#E85D6E",
        star: "#B8C0CC",
        vignette: "#050810",
      };
  }
}

/** Pulse rhythm → ring frequency (cycles per second) */
function rhythmFrequency(rhythm: string): number {
  switch (rhythm) {
    case "rhythmic": return 0.8;
    case "steady": return 0.33;
    case "irregular": return 0.5;
    case "fading": return 0.2;
    case "flat": return 0.05;
    default: return 0.33;
  }
}

// ── Seeded PRNG for deterministic star positions ──
const STARFIELD: ReadonlyArray<{ x: number; y: number; s: number; a: number }> =
  (() => {
    let seed = 137;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: 80 }, () => ({
      x: r(),
      y: r(),
      s: 0.3 + r() * 2,
      a: 0.05 + r() * 0.3,
    }));
  })();

// ── Deterministic dust mote positions ──
const DUST: ReadonlyArray<{ x: number; y: number; s: number }> =
  (() => {
    let seed = 271;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: 30 }, () => ({
      x: r(),
      y: r(),
      s: 0.4 + r() * 1.2,
    }));
  })();

// ═══════════════════════════════════════════════════════════
// §3  Component
// ═══════════════════════════════════════════════════════════

/**
 * DashboardCanvas — Deep space background for the Family Dashboard.
 *
 * Renders 7 layers of ambient visualization that responds to
 * the family's health data. The background IS the intelligence.
 *
 * @example
 * <DashboardCanvas
 *   width={800} height={600}
 *   temperature={72} rhythm="steady"
 *   urgency="moderate" healthScore={0.75}
 *   mouseX={400} mouseY={300}
 *   animate={true} isLight={false}
 * />
 */
export function DashboardCanvas({
  width,
  height,
  temperature,
  rhythm,
  urgency,
  healthScore,
  mouseX,
  mouseY,
  animate,
  isLight,
}: DashboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: mouseX, y: mouseY });
  const propsRef = useRef({ temperature, rhythm, urgency, healthScore, isLight });

  // Keep refs in sync without triggering re-render
  mouseRef.current = { x: mouseX, y: mouseY };
  propsRef.current = { temperature, rhythm, urgency, healthScore, isLight };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = width;
    const h = height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const props = propsRef.current;
    const mouse = mouseRef.current;
    const pal = resolvePalette(props.urgency, props.isLight);
    const time = timeRef.current;
    const cx = w / 2;
    const cy = h / 2;

    // ── Layer 0: Background ──
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    // ── Layer 1: Aurora bands ──
    const auroraIntensity = Math.min(1, props.temperature / 100) * 0.06;
    const auroraY1 = h * 0.3 + Math.sin(time * 0.15) * 30;
    const auroraY2 = h * 0.65 + Math.cos(time * 0.12) * 25;

    const grad1 = ctx.createLinearGradient(0, auroraY1 - 80, 0, auroraY1 + 80);
    grad1.addColorStop(0, hexToRgba(pal.auroraWarm, 0));
    grad1.addColorStop(0.5, hexToRgba(pal.auroraWarm, auroraIntensity));
    grad1.addColorStop(1, hexToRgba(pal.auroraWarm, 0));
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);

    const grad2 = ctx.createLinearGradient(0, auroraY2 - 60, 0, auroraY2 + 60);
    grad2.addColorStop(0, hexToRgba(pal.auroraCool, 0));
    grad2.addColorStop(0.5, hexToRgba(pal.auroraCool, auroraIntensity * 0.7));
    grad2.addColorStop(1, hexToRgba(pal.auroraCool, 0));
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);

    // ── Layer 2: Pulse rings ──
    const freq = rhythmFrequency(props.rhythm);
    const ringCount = 4;
    for (let i = 0; i < ringCount; i++) {
      const phase = ((time * freq + i / ringCount) % 1 + 1) % 1;
      const radius = phase * Math.max(w, h) * 0.6;
      const alpha = (1 - phase) * 0.04 * (props.healthScore + 0.2);
      if (alpha < 0.003) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(pal.pulseCore, alpha);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ── Layer 3: Connection particles ──
    const particleCount = Math.round(5 + props.healthScore * 15);
    if (!props.isLight) {
      const colors = [pal.particleGold, pal.particleEmerald, pal.particleRose];
      for (let i = 0; i < particleCount; i++) {
        const seed = i * 7.31;
        const angle = time * 0.08 + seed;
        const orbitR = 80 + (i % 5) * 50 + Math.sin(time * 0.2 + seed) * 20;
        const px = cx + Math.cos(angle) * orbitR;
        const py = cy + Math.sin(angle * 0.7) * orbitR * 0.6;
        const color = colors[i % colors.length];
        const size = 1.2 + Math.sin(time * 1.5 + seed) * 0.5;
        const a = 0.15 + Math.sin(time * 0.8 + seed) * 0.1;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, a);
        ctx.fill();
      }
    }

    // ── Layer 4: Dust motes ──
    for (const mote of DUST) {
      const mx = (mote.x * w + Math.sin(time * 0.3 + mote.x * 10) * 15 + w) % w;
      const my = (mote.y * h + Math.cos(time * 0.25 + mote.y * 10) * 12 + h) % h;
      const a = props.isLight ? 0.04 : 0.06;
      ctx.beginPath();
      ctx.arc(mx, my, mote.s, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(pal.star, a);
      ctx.fill();
    }

    // ── Layer 5: Star field with parallax ──
    const parallaxX = (mouse.x - cx) / cx; // -1 to 1
    const parallaxY = (mouse.y - cy) / cy;

    for (const star of STARFIELD) {
      let sx = star.x * w + parallaxX * 8;
      let sy = star.y * h + parallaxY * 6;
      if (sx < 0) sx += w;
      if (sx > w) sx -= w;
      if (sy < 0) sy += h;
      if (sy > h) sy -= h;

      const a = props.isLight ? star.a * 0.3 : star.a;
      ctx.beginPath();
      ctx.arc(sx, sy, star.s, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(pal.star, a);
      ctx.fill();
    }

    // ── Layer 6: Vignette ──
    const vigGrad = ctx.createRadialGradient(cx, cy, w * 0.25, cx, cy, w * 0.75);
    vigGrad.addColorStop(0, hexToRgba(pal.vignette, 0));
    vigGrad.addColorStop(1, hexToRgba(pal.vignette, 0.6));
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);
  }, [width, height]);

  // ── Animation loop ──
  useEffect(() => {
    if (!animate) {
      render();
      return;
    }

    let running = true;
    const loop = () => {
      if (!running) return;
      timeRef.current += 0.016;
      render();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [animate, render]);

  // ── Static re-render when props change (reduced motion) ──
  useEffect(() => {
    if (!animate) render();
  }, [temperature, rhythm, urgency, healthScore, isLight, animate, render]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}