// src/shared/components/layout/MarbleBackground.tsx
// ═══════════════════════════════════════════════════════════
// CASTILLO — Sidebar marble with gold veins
//
// Correcciones vs versión anterior:
// - Vetas 3× más gruesas (3.5, 2.5, 2, 1.5, 1.2px)
// - Opacidades base más altas (0.85, 0.75, 0.6, 0.35, 0.25)
// - Draw animation: CSS transition + setTimeout (Claude's approach)
// - Breathing: RAF loop con opacity directa
// - Cleanup robusto: cancela timeouts + RAF + restaura estilos
// - Safety timeout: fuerza visibilidad después de 8 segundos
// - prefers-reduced-motion → vetas visibles inmediatamente
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

interface VeinDef {
  d: string;
  stroke: string;
  width: number;
  /** Base opacity for breathing animation */
  base: number;
  drawDuration: number;
  drawDelay: number;
}

const VEINS: VeinDef[] = [
  // ── Primary veins — thick, highly visible ──
  {
    d: "M-10,80 C60,120 20,200 80,240 C140,280 100,360 160,400 C220,440 180,520 240,560 C290,595 270,650 290,700",
    stroke: "url(#vein1)",
    width: 3.5,
    base: 0.85,
    drawDuration: 4.5,
    drawDelay: 0.3,
  },
  {
    d: "M290,120 C220,160 260,240 200,280 C140,320 180,400 120,440 C60,480 100,560 40,600 C-10,630 10,700 -10,760",
    stroke: "url(#vein2)",
    width: 2.5,
    base: 0.75,
    drawDuration: 5.5,
    drawDelay: 0.5,
  },
  {
    d: "M40,0 C80,60 30,140 90,180 C150,220 110,310 170,350 C230,390 190,470 250,510 C300,545 280,620 310,680",
    stroke: "url(#vein3)",
    width: 2.0,
    base: 0.6,
    drawDuration: 6.0,
    drawDelay: 0.7,
  },
  // ── Secondary veins — thinner, supporting ──
  {
    d: "M130,0 C100,80 160,150 130,220 C100,290 150,360 120,440 C90,510 140,580 110,660 C85,725 120,800 100,900",
    stroke: "rgba(201,169,110,0.35)",
    width: 1.5,
    base: 0.35,
    drawDuration: 5.0,
    drawDelay: 1.0,
  },
  {
    d: "M200,0 C240,70 190,150 220,230 C255,315 200,400 230,490 C262,578 215,660 250,750 C278,820 255,870 270,900",
    stroke: "rgba(240,217,168,0.25)",
    width: 1.2,
    base: 0.25,
    drawDuration: 5.5,
    drawDelay: 1.2,
  },
  // ── Tertiary veins — very thin, atmospheric ──
  {
    d: "M60,50 C100,100 80,180 120,230 C160,280 140,350 180,400 C220,450 200,530 240,580 C270,620 250,690 280,740",
    stroke: "rgba(201,169,110,0.20)",
    width: 0.8,
    base: 0.2,
    drawDuration: 6.5,
    drawDelay: 1.5,
  },
  {
    d: "M250,30 C210,90 240,160 190,210 C140,260 170,340 110,390 C60,440 90,520 30,580 C-10,620 20,700 -10,780",
    stroke: "rgba(180,165,130,0.18)",
    width: 0.7,
    base: 0.18,
    drawDuration: 7.0,
    drawDelay: 1.8,
  },
];

const SAFETY_TIMEOUT_MS = 8000;

export default function MarbleBackground() {
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const veins = pathsRef.current.filter(Boolean) as SVGPathElement[];
    if (veins.length === 0) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // ── Draw animation ──
    if (!reduced) {
      veins.forEach((path, i) => {
        const len = path.getTotalLength() || 800;
        // Hide: full dashoffset
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;

        // Reveal with transition
        const revealTimeout = setTimeout(() => {
          path.style.transition = `stroke-dashoffset ${VEINS[i]?.drawDuration ?? 5}s var(--ease-apple)`;
          path.style.strokeDashoffset = "0";
        }, (VEINS[i]?.drawDelay ?? 1) * 1000);
        timeouts.push(revealTimeout);
      });

      // Safety: force all veins visible after 8s
      const safetyTimeout = setTimeout(() => {
        veins.forEach((path) => {
          path.style.strokeDasharray = "";
          path.style.strokeDashoffset = "";
          path.style.transition = "";
        });
      }, SAFETY_TIMEOUT_MS);
      timeouts.push(safetyTimeout);
    }

    // ── Breathing animation — sinusoidal opacity ──
    let vt = 0;
    let frameId: number;

    const breathe = () => {
      vt += 0.003;
      veins.forEach((path, i) => {
        const base = VEINS[i]?.base ?? 0.2;
        const breathAmount = 0.15 * Math.sin(vt + i * 1.2);
        path.style.opacity = `${Math.min(base + breathAmount, 1.0)}`;
      });
      frameId = requestAnimationFrame(breathe);
    };

    breathe();

    // ── Cleanup ──
    return () => {
      timeouts.forEach(clearTimeout);
      cancelAnimationFrame(frameId);
      // Restore veins to default visible state
      veins.forEach((path) => {
        path.style.strokeDasharray = "";
        path.style.strokeDashoffset = "";
        path.style.transition = "";
        path.style.opacity = "";
      });
    };
  }, []);

  const setRef = (i: number) => (el: SVGPathElement | null) => {
    pathsRef.current[i] = el;
  };

  return (
    <svg
      className="absolute inset-0 z-0 w-full h-full"
      viewBox="0 0 280 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Marble base — warm dark gradient */}
        <linearGradient id="marbleBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1f2a" />
          <stop offset="50%" stopColor="#141820" />
          <stop offset="100%" stopColor="#0f1318" />
        </linearGradient>

        {/* Vein 1 — primary: full gold spectrum */}
        <linearGradient id="vein1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8A6A3A" stopOpacity="0" />
          <stop offset="30%" stopColor="#C9A96E" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#F5EDD0" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#8A6A3A" stopOpacity="0" />
        </linearGradient>

        {/* Vein 2 — copper-gold */}
        <linearGradient id="vein2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D47A5A" stopOpacity="0" />
          <stop offset="40%" stopColor="#C9A96E" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8A6A3A" stopOpacity="0" />
        </linearGradient>

        {/* Vein 3 — champagne highlight */}
        <linearGradient id="vein3" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#F5EDD0" stopOpacity="0" />
          <stop offset="50%" stopColor="#C9A96E" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F5EDD0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base dark rect — this IS the sidebar background */}
      <rect width="280" height="900" fill="url(#marbleBase)" />

      {/* Marble organic tones — subtle dark ellipses for depth */}
      <ellipse cx="80" cy="200" rx="200" ry="120" fill="rgba(30,38,52,0.4)" opacity="0.5" />
      <ellipse cx="200" cy="600" rx="180" ry="160" fill="rgba(20,28,42,0.3)" opacity="0.5" />
      <ellipse cx="140" cy="420" rx="130" ry="90" fill="rgba(25,33,48,0.25)" opacity="0.35" />

      {/* Gold veins — thick, visible, animated */}
      {VEINS.map((v, i) => (
        <path
          key={i}
          ref={setRef(i)}
          d={v.d}
          stroke={v.stroke}
          strokeWidth={v.width}
          fill="none"
          strokeLinecap="round"
          opacity={v.base}
        />
      ))}
    </svg>
  );
}
