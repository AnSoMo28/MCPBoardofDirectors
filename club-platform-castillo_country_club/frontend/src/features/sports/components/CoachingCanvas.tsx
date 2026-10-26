// ═══════════════════════════════════════════════════════════
// src/features/sports/components/CoachingCanvas.tsx
// §B3.11 — Coaching Canvas
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// Canvas 2D constellation: coaches as luminous stars,
// athletes as connected points. Lines between coach and
// their athletes form constellations. Coverage gaps appear
// as dim empty regions. Hover highlights a coach's network.
// Living Protocol: 7/7
//
// Aha Moment: "Los coaches como estrellas — ¿quién cubre qué?"
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component CoachingCanvas
// ═══════════════════════════════════════════════════════════

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Users } from "lucide-react";
import type {
  CoachingProfile,
  SportType,
  SportsDashboardMode,
} from "../types";
import {
  SPORT_CONFIG,
  COACHING_STYLE_CONFIG
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./CoachingCanvas.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface CoachingCanvasProps {
  coaches: CoachingProfile[];
  ambientMode?: SportsDashboardMode;
  reducedMotion?: boolean;
  onCoachSelect?: (coachId: string) => void;
}

/** Internal position for a coach node */
interface CoachNode {
  x: number;
  y: number;
  radius: number;
  color: string;
  coachId: string;
  coach: CoachingProfile;
}

/** Internal position for an athlete-sport anchor */
interface SportAnchor {
  x: number;
  y: number;
  sport: SportType;
  label: string;
  covered: boolean;
}

/** Tooltip state */
interface TooltipState {
  x: number;
  y: number;
  coach: CoachingProfile;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const DPR =
  typeof window !== "undefined"
    ? Math.min(window.devicePixelRatio || 1, 2)
    : 1;

const MIN_COACH_RADIUS = 16;
const MAX_COACH_RADIUS = 32;
const ANCHOR_RADIUS = 6;
const HIT_BUFFER = 8;
const STAR_COUNT = 40;
const CONNECTION_WIDTH = 1.5;

/** Coach style → color mapping */
const STYLE_COLORS: Record<string, string> = {
  drill_sergeant: "#e54d4d",
  nurturer: "#2ab5a0",
  technical: "#2a9ab5",
  motivational: "#d4a017",
  analytical: "#8b5cf6",
};

// ═══════════════════════════════════════════════════════════
// §3 — LAYOUT HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Get all unique sports from coaches' specializations.
 */
function getAllSports(coaches: CoachingProfile[]): SportType[] {
  const sportSet = new Set<SportType>();
  for (const c of coaches) {
    for (const s of c.specializations) {
      sportSet.add(s);
    }
  }
  return Array.from(sportSet);
}

/**
 * Position sport anchors in a circle around center.
 * Covered sports are brighter, uncovered are dim.
 */
function layoutSportAnchors(
  allSports: SportType[],
  coveredSports: Set<SportType>,
  cx: number,
  cy: number,
  radius: number,
): SportAnchor[] {
  return allSports.map((sport, i) => {
    const angle = (i / Math.max(allSports.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const cfg = SPORT_CONFIG[sport];
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      sport,
      label: cfg?.label ?? sport,
      covered: coveredSports.has(sport),
    };
  });
}

/**
 * Position coach nodes near their primary sport anchors.
 * Coaches with the same primary sport spread around the anchor.
 */
function layoutCoachNodes(
  coaches: CoachingProfile[],
  sportAnchors: SportAnchor[],
  cx: number,
  cy: number,
): CoachNode[] {
  const anchorMap = new Map<string, SportAnchor>();
  for (const a of sportAnchors) {
    anchorMap.set(a.sport, a);
  }

  // Group coaches by primary sport
  const bySport = new Map<SportType, CoachingProfile[]>();
  for (const coach of coaches) {
    const primary = coach.specializations[0];
    if (!primary) continue;
    if (!bySport.has(primary)) bySport.set(primary, []);
    bySport.get(primary)!.push(coach);
  }

  const nodes: CoachNode[] = [];

  for (const [sport, group] of bySport) {
    const anchor = anchorMap.get(sport);
    const baseX = anchor?.x ?? cx;
    const baseY = anchor?.y ?? cy;

    group.forEach((coach, gi) => {
      // Spread coaches around the anchor
      const spreadAngle =
        group.length === 1
          ? 0
          : ((gi / group.length) * Math.PI * 2);
      const spreadDist = group.length === 1 ? 0 : 28;
      const x = baseX + Math.cos(spreadAngle) * spreadDist;
      const y = baseY + Math.sin(spreadAngle) * spreadDist;

      const radius =
        MIN_COACH_RADIUS +
        (coach.athleteCount / Math.max(1, ...coaches.map((c) => c.athleteCount))) *
          (MAX_COACH_RADIUS - MIN_COACH_RADIUS);

      nodes.push({
        x,
        y,
        radius,
        color: STYLE_COLORS[coach.style] ?? "#2a9ab5",
        coachId: coach.coachId,
        coach,
      });
    });
  }

  return nodes;
}

// ═══════════════════════════════════════════════════════════
// §4 — RENDERING HELPERS
// ═══════════════════════════════════════════════════════════

interface BackgroundStar {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

function generateStars(w: number, h: number): BackgroundStar[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.3,
    alpha: Math.random() * 0.25 + 0.05,
  }));
}

function drawBackgroundStars(
  ctx: CanvasRenderingContext2D,
  stars: BackgroundStar[],
): void {
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.fill();
  }
}

function drawSportAnchors(
  ctx: CanvasRenderingContext2D,
  anchors: SportAnchor[],
  hoveredCoach: CoachingProfile | null,
): void {
  const highlightedSports = new Set<SportType>();
  if (hoveredCoach) {
    for (const s of hoveredCoach.specializations) {
      highlightedSports.add(s);
    }
  }

  for (const anchor of anchors) {
    const isHighlighted = highlightedSports.has(anchor.sport);
    const dimmed = hoveredCoach != null && !isHighlighted;
    const cfg = SPORT_CONFIG[anchor.sport];
    const color = cfg?.color ?? "#8a8580";

    // Coverage ring
    if (!anchor.covered) {
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, ANCHOR_RADIUS + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(229, 77, 77, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dot
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, ANCHOR_RADIUS, 0, Math.PI * 2);
    ctx.globalAlpha = dimmed ? 0.15 : anchor.covered ? 0.6 : 0.2;
    ctx.fillStyle = isHighlighted ? "#ffffff" : color;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.fillStyle = dimmed ? "rgba(255,255,255,0.1)" : anchor.covered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
    ctx.font = "10px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(anchor.label, anchor.x, anchor.y + ANCHOR_RADIUS + 14);
  }
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  coachNodes: CoachNode[],
  sportAnchors: SportAnchor[],
  hoveredId: string | null,
  mode: SportsDashboardMode,
): void {
  const anchorMap = new Map<string, SportAnchor>();
  for (const a of sportAnchors) {
    anchorMap.set(a.sport, a);
  }

  for (const node of coachNodes) {
    const isHovered = node.coachId === hoveredId;
    const dimmed = hoveredId != null && !isHovered;

    for (const sport of node.coach.specializations) {
      const anchor = anchorMap.get(sport);
      if (!anchor) continue;

      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(anchor.x, anchor.y);

      if (isHovered) {
        ctx.strokeStyle = mode === "critical"
          ? "rgba(229, 77, 77, 0.6)"
          : mode === "alert"
            ? "rgba(212, 160, 23, 0.6)"
            : "rgba(42, 154, 181, 0.6)";
        ctx.lineWidth = CONNECTION_WIDTH + 1;
      } else if (dimmed) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 0.5;
      } else {
        ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.lineWidth = CONNECTION_WIDTH;
      }

      ctx.stroke();
    }
  }
}

function drawCoachNodes(
  ctx: CanvasRenderingContext2D,
  nodes: CoachNode[],
  hoveredId: string | null,
  mode: SportsDashboardMode,
  time: number,
): void {
  for (const node of nodes) {
    const isHovered = node.coachId === hoveredId;
    const dimmed = hoveredId != null && !isHovered;

    // Pulse halo (LP 1: Respiración)
    if (!dimmed) {
      const pulseR = node.radius + 4 + Math.sin(time / 1200 + node.x) * 3;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = isHovered
        ? (mode === "critical"
            ? "rgba(229, 77, 77, 0.4)"
            : mode === "alert"
              ? "rgba(212, 160, 23, 0.4)"
              : "rgba(42, 154, 181, 0.4)")
        : `rgba(255, 255, 255, 0.1)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Main circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, isHovered ? node.radius * 1.15 : node.radius, 0, Math.PI * 2);
    ctx.globalAlpha = dimmed ? 0.15 : 1;
    ctx.fillStyle = node.color;
    ctx.fill();

    // Inner glow
    const grad = ctx.createRadialGradient(
      node.x, node.y, 0,
      node.x, node.y, node.radius,
    );
    grad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Hover ring
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Label: coach name
    ctx.globalAlpha = dimmed ? 0.1 : 1;
    ctx.fillStyle = "#f0ece4";
    ctx.font = "bold 11px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      node.coach.coachName.split(" ").slice(0, 2).join(" "),
      node.x,
      node.y - node.radius - 8,
    );

    // Sub-label: athlete count
    ctx.fillStyle = dimmed ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.4)";
    ctx.font = "9px DM Mono, monospace";
    ctx.fillText(
      `${node.coach.athleteCount} atletas`,
      node.x,
      node.y + node.radius + 14,
    );

    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════
// §5 — NARRATIVE HELPERS
// ═══════════════════════════════════════════════════════════

function findCoverageGaps(
  coaches: CoachingProfile[],
): SportType[] {
  const allSports = Object.keys(SPORT_CONFIG) as SportType[];
  const covered = new Set<SportType>();
  for (const c of coaches) {
    for (const s of c.specializations) {
      covered.add(s);
    }
  }
  return allSports.filter((s) => !covered.has(s));
}

function buildNarrative(
  coaches: CoachingProfile[],
  gaps: SportType[],
): string {
  if (coaches.length === 0) return "Sin coaches registrados.";

  const totalAthletes = coaches.reduce((s, c) => s + c.athleteCount, 0);
  const avgSuccess = Math.round(
    coaches.reduce((s, c) => s + c.successRate, 0) / coaches.length,
  );

  const specializations = new Set<SportType>();
  for (const c of coaches) {
    for (const s of c.specializations) specializations.add(s);
  }

  const main = `${coaches.length} coach${coaches.length > 1 ? "es" : ""} — ${totalAthletes} atletas — tasa de éxito promedio: ${avgSuccess}%.`;
  const specPart = ` Deportes cubiertos: ${Array.from(specializations).map((s) => SPORT_CONFIG[s]?.label ?? s).join(", ")}.`;
  const gapPart =
    gaps.length > 0
      ? ` Sin cobertura: ${gaps.map((s) => SPORT_CONFIG[s]?.label ?? s).join(", ")}.`
      : " Todos los deportes tienen cobertura.";

  return `${main}${specPart}${gapPart}`;
}

// ═══════════════════════════════════════════════════════════
// §6 — HIT TESTING
// ═══════════════════════════════════════════════════════════

function hitTestCoach(
  mx: number,
  my: number,
  nodes: CoachNode[],
): CoachingProfile | null {
  for (const n of nodes) {
    const dx = mx - n.x;
    const dy = my - n.y;
    const hitR = n.radius + HIT_BUFFER;
    if (dx * dx + dy * dy < hitR * hitR) {
      return n.coach;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// §7 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function CoachingCanvas({
  coaches,
  ambientMode = "calm",
  reducedMotion = false,
  onCoachSelect,
}: CoachingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<CoachNode[]>([]);
  const anchorsRef = useRef<SportAnchor[]>([]);
  const starsRef = useRef<BackgroundStar[]>([]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const hoveredCoach = useMemo(
    () => coaches.find((c) => c.coachId === hoveredId) ?? null,
    [coaches, hoveredId],
  );

  const gaps = useMemo(() => findCoverageGaps(coaches), [coaches]);

  const narrative = useMemo(
    () => buildNarrative(coaches, gaps),
    [coaches, gaps],
  );

  // ── §7.1 — Compute layout ─────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const anchorRadius = Math.min(w, h) * 0.35;

    const allSports = getAllSports(coaches);
    const coveredSet = new Set<SportType>();
    for (const c of coaches) {
      for (const s of c.specializations) coveredSet.add(s);
    }

    anchorsRef.current = layoutSportAnchors(
      allSports.length > 0 ? allSports : (Object.keys(SPORT_CONFIG) as SportType[]),
      coveredSet,
      cx,
      cy,
      anchorRadius,
    );

    nodesRef.current = layoutCoachNodes(coaches, anchorsRef.current, cx, cy);

    starsRef.current = generateStars(w * DPR, h * DPR);
  }, [coaches]);

  // ── §7.2 — Canvas render loop ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(DPR, DPR);

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      // Background stars
      drawBackgroundStars(ctx, starsRef.current);

      // Sport anchors
      drawSportAnchors(ctx, anchorsRef.current, hoveredCoach);

      // Connections
      drawConnections(
        ctx,
        nodesRef.current,
        anchorsRef.current,
        hoveredId,
        ambientMode,
      );

      // Coach nodes
      drawCoachNodes(ctx, nodesRef.current, hoveredId, ambientMode, time);

      if (!reducedMotion) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    if (reducedMotion) {
      draw(0);
    } else {
      animRef.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [hoveredId, hoveredCoach, ambientMode, reducedMotion]);

  // ── §7.3 — Mouse interactions ─────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = hitTestCoach(mx, my, nodesRef.current);

      if (hit) {
        setHoveredId(hit.coachId);
        setTooltip({ x: mx, y: my, coach: hit });
        canvas.style.cursor = "pointer";
      } else {
        if (hoveredId != null) setHoveredId(null);
        setTooltip(null);
        canvas.style.cursor = "default";
      }
    },
    [hoveredId],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = hitTestCoach(mx, my, nodesRef.current);
      if (hit) onCoachSelect?.(hit.coachId);
    },
    [onCoachSelect],
  );

  // ── §7.4 — Degraded: no data ──────────────────────────
  if (coaches.length === 0) {
    return (
      <section
        className="spt-coaching"
        data-mode={ambientMode}
        role="region"
        aria-label="Constelación de coaching"
      >
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Sin coaches registrados"
          description="Cuando haya coaches con sesiones asignadas, aparecerán como estrellas en una constelación mostrando su cobertura deportiva y atletas."
          compact
        />
      </section>
    );
  }

  // ── §7.5 — Render ─────────────────────────────────────
  return (
    <section
      ref={containerRef}
      className="spt-coaching"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-coaching__header">
        <h3 className="spt-coaching__title">Constelación de Coaching</h3>
        <span className="spt-coaching__count">
          {coaches.length} coach{coaches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* ── Legend ── */}
      <div className="spt-coaching__legend">
        {Object.entries(COACHING_STYLE_CONFIG).map(([key, cfg]) => {
          const hasCoach = coaches.some((c) => c.style === key);
          if (!hasCoach) return null;
          return (
            <span key={key} className="spt-coaching__legend-item">
              <span
                className="spt-coaching__legend-dot"
                style={{ background: STYLE_COLORS[key] ?? "#8a8580" }}
              />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        className="spt-coaching__canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        role="img"
        aria-label={narrative}
      />

      {/* ── Tooltip overlay ── */}
      {tooltip && (
        <div
          className="spt-coaching__tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
          role="tooltip"
        >
          <p className="spt-coaching__tooltip-name">
            {tooltip.coach.coachName}
            <span
              className="spt-coaching__tooltip-style"
              data-style={tooltip.coach.style}
            >
              {COACHING_STYLE_CONFIG[tooltip.coach.style]?.label ?? tooltip.coach.style}
            </span>
          </p>
          <p className="spt-coaching__tooltip-stat">
            Atletas: <strong>{tooltip.coach.athleteCount}</strong>
          </p>
          <p className="spt-coaching__tooltip-stat">
            Éxito: <strong>{tooltip.coach.successRate}%</strong> ·
            Mejora: <strong>+{tooltip.coach.avgImprovementRate.toFixed(1)}/mes</strong>
          </p>
          <p className="spt-coaching__tooltip-specs">
            {tooltip.coach.specializations
              .map((s) => SPORT_CONFIG[s]?.label ?? s)
              .join(", ")}
          </p>
        </div>
      )}

      {/* ── Coverage gaps ── */}
      {gaps.length > 0 && (
        <div className="spt-coaching__gaps">
          <p className="spt-coaching__gaps-label">⚠️ Sin cobertura:</p>
          <div className="spt-coaching__gaps-list">
            {gaps.map((sport) => (
              <span key={sport} className="spt-coaching__gap-badge">
                {SPORT_CONFIG[sport]?.icon ?? "🏃"} {SPORT_CONFIG[sport]?.label ?? sport}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer: Narrative ── */}
      <div className="spt-coaching__footer">
        <p className="spt-coaching__narrative">{narrative}</p>
      </div>
    </section>
  );
}