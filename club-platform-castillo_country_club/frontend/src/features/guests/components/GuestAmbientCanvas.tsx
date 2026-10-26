// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestAmbientCanvas.tsx
// Phase 34 "The Gateway" — Capa 1: Ambient Awareness
// Level 6+ Agency · Production Grade
//
// Living background that reflects the state of the guest ecosystem.
// Particles represent guests — their color matches temperature,
// their movement reflects activity, their clustering reveals patterns.
//
// The canvas communicates urgency pre-verbally:
//   calm: gentle drift, warm gold
//   alert: faster movement, amber pulse
//   critical: red vibration, urgency
//   celebration: rising golden particles
//
// Budget: 60fps, maxParticles from config, rAF + cancel on unmount
// Checklist: TSX-32-35, CSS-1-40, D3.11-12, D4.11
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback, useMemo } from "react";

import type {
  GuestDashboardMode,
  GuestTemperatureLabel,
} from "../types";

import { GUEST_AMBIENT_CONFIG } from "../config";
import "./GuestAmbientCanvas.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestAmbientCanvasProps {
  /** Current dashboard mode — drives visual behavior. */
  readonly mode: GuestDashboardMode;
  /** Temperature distribution — drives particle color mix. */
  readonly temperatureDistribution?: Readonly<Record<GuestTemperatureLabel, number>>;
  /** Whether the canvas should animate. */
  readonly isActive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  pulseOffset: number;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const MODE_ACCENT_COLORS: Record<GuestDashboardMode, string> = {
  calm: "rgba(212, 168, 83, 0.3)",
  alert: "rgba(245, 166, 35, 0.3)",
  critical: "rgba(255, 23, 68, 0.3)",
  celebration: "rgba(212, 168, 83, 0.4)",
};


const TEMPERATURE_COLORS: Record<GuestTemperatureLabel, string> = {
  blazing: "#ff6b6b",
  hot: "#ffa726",
  warm: "#d4a853",
  cool: "#4ecdc4",
  cold: "#90a4ae",
  frozen: "#78909c",
};

const MODE_SPEED_MULTIPLIER: Record<GuestDashboardMode, number> = {
  calm: 0.5,
  alert: 1.2,
  critical: 2.0,
  celebration: 0.3,
};

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Check if user prefers reduced motion. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  const attr = document.documentElement.getAttribute("data-prefers-reduced");
  if (attr === "true") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Generate particle color from temperature distribution. */
function pickTemperatureColor(
  distribution?: Readonly<Record<GuestTemperatureLabel, number>>,
): string {
  if (!distribution) return TEMPERATURE_COLORS.warm;

  const entries = Object.entries(distribution) as Array<[GuestTemperatureLabel, number]>;
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return TEMPERATURE_COLORS.warm;

  let roll = Math.random() * total;
  for (const [label, count] of entries) {
    roll -= count;
    if (roll <= 0) return TEMPERATURE_COLORS[label];
  }
  return TEMPERATURE_COLORS.warm;
}

/** Create a single particle. */
function createParticle(
  canvasWidth: number,
  canvasHeight: number,
  distribution?: Readonly<Record<GuestTemperatureLabel, number>>,
  mode: GuestDashboardMode = "calm",
): Particle {
  const config = GUEST_AMBIENT_CONFIG;
  const radius = config.minParticles + Math.random() * (config.maxParticles - config.minParticles);
  const speed = config.baseSpeed * MODE_SPEED_MULTIPLIER[mode];

  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * speed,
    vy: (Math.random() - 0.5) * speed,
    radius,
    color: pickTemperatureColor(distribution),
    alpha: 0.3 + Math.random() * 0.5,
    baseAlpha: 0.3 + Math.random() * 0.5,
    pulseOffset: Math.random() * Math.PI * 2,
  };
}

/** Create the initial particle array. */
function createParticles(
  count: number,
  width: number,
  height: number,
  distribution?: Readonly<Record<GuestTemperatureLabel, number>>,
): Particle[] {
  return Array.from({ length: count }, () => createParticle(width, height, distribution));
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Ambient canvas — living background that reflects ecosystem state.
 * Renders behind all content (pointer-events: none).
 * Particles represent guests by temperature.
 * Mode drives movement speed and color atmosphere.
 *
 * @example
 * <GuestAmbientCanvas
 *   mode={dashboard.dashboardMode}
 *   temperatureDistribution={dashboard.intelligenceSummary?.temperatureDistribution}
 * />
 */
export function GuestAmbientCanvas({
  mode,
  temperatureDistribution,
  isActive = true,
}: GuestAmbientCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  // ── Initialize particles ──
  const initParticles = useCallback(
    (width: number, height: number) => {
      const count = Math.min(
        GUEST_AMBIENT_CONFIG.maxParticles,
        Math.floor((width * height) / 8000),
      );
      particlesRef.current = createParticles(count, width, height, temperatureDistribution);
    },
    [temperatureDistribution],
  );

  // ── Animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || reducedMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const speedMult = MODE_SPEED_MULTIPLIER[mode];

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvas!.style.width = `${rect.width}px`;
      canvas!.style.height = `${rect.height}px`;
      ctx!.scale(dpr, dpr);
      initParticles(rect.width, rect.height);
    }

    resize();

    const resizeObserver = new ResizeObserver(() => resize());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    let lastTime = 0;
    const frameInterval = 1000 / GUEST_AMBIENT_CONFIG.targetFps;

    function animate(timestamp: number) {
      if (timestamp - lastTime < frameInterval) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = timestamp;

      const w = canvas!.width / dpr;
      const h = canvas!.height / dpr;

      ctx!.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const time = timestamp * 0.001;

      for (const p of particles) {
        // Update position
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        // Wrap around edges
        if (p.x < -p.radius) p.x = w + p.radius;
        if (p.x > w + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = h + p.radius;
        if (p.y > h + p.radius) p.y = -p.radius;

        // Pulse alpha
        p.alpha = p.baseAlpha + Math.sin(time * 2 + p.pulseOffset) * 0.15;

        // Draw particle
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx!.fill();
      }

      // Draw ambient glow based on mode
      ctx!.globalAlpha = 0.08;
      const gradient = ctx!.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      gradient.addColorStop(0, MODE_ACCENT_COLORS[mode]);
      gradient.addColorStop(1, "transparent");
      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, w, h);
      ctx!.globalAlpha = 1;

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [mode, isActive, reducedMotion, initParticles]);

  // ── Static gradient for reduced motion ──
  if (reducedMotion || !isActive) {
    return (
      <canvas
        ref={canvasRef}
        className="gst-canvas"
        data-mode={mode}
        data-reduced="true"
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="gst-canvas"
      data-mode={mode}
      aria-hidden="true"
    />
  );
}