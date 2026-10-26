// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsAmbientCanvas.tsx
// §B3.6 — Sports Ambient Canvas
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// Canvas 2D particle system: background atmosphere that
// responds to dashboard mode. calm=teal slow, alert=amber
// faster, critical=rose rapid.
// prefers-reduced-motion → static gradient.
// Living Protocol: 1/7 (respiración) + 6/7 (empatía)
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsAmbientCanvas
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect } from "react";
import type { SportsAmbientState, SportsDashboardMode } from "../types";
import "./SportsAmbientCanvas.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SportsAmbientCanvasProps {
  ambientState: SportsAmbientState;
  reducedMotion: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const PARTICLE_COLORS: Record<SportsDashboardMode, string> = {
  calm: "42, 154, 181",
  alert: "212, 160, 23",
  critical: "229, 77, 77",
};

const PARTICLE_BASE_COUNT = 15;
const PARTICLE_INTENSITY_MULTIPLIER = 30;

// ═══════════════════════════════════════════════════════════
// §3 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsAmbientCanvas({
  ambientState,
  reducedMotion,
}: SportsAmbientCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Resize handler ──
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Particle init ──
    const count =
      Math.round(PARTICLE_INTENSITY_MULTIPLIER * ambientState.intensity) +
      PARTICLE_BASE_COUNT;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.2 + 0.05,
      });
    }

    // ── Render loop ──
    const rgb = PARTICLE_COLORS[ambientState.mode];
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${p.alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [ambientState.mode, ambientState.intensity, reducedMotion]);

  // ── Reduced motion: static gradient ──
  if (reducedMotion) {
    return (
      <div
        className="spt-ambient spt-ambient--static"
        data-mode={ambientState.mode}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="spt-ambient"
      data-mode={ambientState.mode}
      aria-hidden="true"
    />
  );
}