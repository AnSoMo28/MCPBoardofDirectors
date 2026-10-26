// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestMemoryStarMap.tsx
// Phase 34 "The Gateway" — Capa 4: Memory Constellation
// Level 6+ Agency · Production Grade
//
// Canvas-based constellation visualization of the guest ecosystem.
// Multi-source fusion: pipeline + analytics + proposals.
// Each star represents a meaningful entity (stage, guest, referrer).
// Connections show relationships (flow, referral influence).
//
// Depends on: ecosystemVisualization.ts engine
// Budget: entry animation 1.5s, then hover-only redraw
// Checklist: TSX-1-35, CSS-1-40, D3.11-14, D4.1-13
//
// PRE-WRITURE VERIFICATION:
//   buildEcosystemMapSafe → ecosystemVisualization.ts ✅
//   EcosystemMap { nodes, connections, clusters, metadata } ✅
//   EcosystemNode { id, label, type, nx, ny, radius, color, alpha, metadata } ✅
//   EcosystemConnection { fromId, toId, strength, type } ✅
//   EcosystemCluster { id, label, nx, ny, count, color, isBottleneck, severity? } ✅
//   PipelineEcosystem → types.ts §9 ✅
//   GuestAnalyticsEnhanced → @/shared/mocks/contracts ✅
//   GuestEngagementProposalList → @/shared/mocks/contracts ✅
//   GuestPipelineStage → types.ts §9 ✅
//   GuestDashboardMode → types.ts §3 ✅
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect, useMemo, useCallback, useState } from "react";

import type {
  PipelineEcosystem,
  GuestPipelineStage,
  GuestDashboardMode,
} from "../types";

import type {
  GuestAnalyticsEnhanced,
  GuestEngagementProposalList,
} from "@/shared/mocks/contracts";

import type {
  EcosystemMap,
  EcosystemNode,
  EcosystemNodeType,
} from "../lib/ecosystemVisualization";

import { buildEcosystemMapSafe } from "../lib/ecosystemVisualization";

import "./GuestMemoryStarMap.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestMemoryStarMapProps {
  /** Pipeline ecosystem data. */
  readonly pipeline: PipelineEcosystem | null;
  /** Guest analytics data. */
  readonly analytics: GuestAnalyticsEnhanced | null;
  /** Engagement proposals data. */
  readonly proposals: GuestEngagementProposalList | null;
  /** Current dashboard mode for visual treatment. */
  readonly mode?: GuestDashboardMode;
  /** Called when user clicks a guest-type node. */
  readonly onGuestClick?: (guestId: string) => void;
  /** Called when user clicks a stage anchor node. */
  readonly onStageClick?: (stageId: GuestPipelineStage) => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const ENTRY_DURATION_MS = 1500;
const FRAME_BUDGET_MS = 1000 / 30; // 30fps
const HOVER_HIT_EXTRA = 6;
const NODE_TYPE_LABELS: Record<EcosystemNodeType, string> = {
  stage_anchor: "Etapa",
  guest_quickwin: "Quick Win",
  guest_referrer: "Familia referente",
  guest_proposal: "Target de propuesta",
};

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  const attr = document.documentElement.getAttribute("data-prefers-reduced");
  if (attr === "true") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Stagger delay by node type (0-1, relative to entry duration). */
function entryDelay(type: EcosystemNodeType): number {
  switch (type) {
    case "stage_anchor": return 0;
    case "guest_quickwin": return 0.25;
    case "guest_referrer": return 0.45;
    case "guest_proposal": return 0.6;
    default: return 0;
  }
}

/** Find nearest node to mouse position. */
function findNearestNode(
  mx: number,
  my: number,
  nodes: readonly EcosystemNode[],
  w: number,
  h: number,
): EcosystemNode | null {
  let best: EcosystemNode | null = null;
  let bestDist = Infinity;

  for (const node of nodes) {
    const px = node.nx * w;
    const py = node.ny * h;
    const dx = mx - px;
    const dy = my - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = node.radius + HOVER_HIT_EXTRA;
    if (dist < threshold && dist < bestDist) {
      best = node;
      bestDist = dist;
    }
  }

  return best;
}

/** Get tooltip description text for a node. */
function nodeDescription(node: EcosystemNode): string {
  const md = node.metadata;
  switch (node.type) {
    case "stage_anchor":
      return `${md.count ?? 0} invitados${md.isBottleneck ? ` — Bloqueo (${md.severity ?? ""})` : ""}`;
    case "guest_quickwin":
      return md.actionNeeded ?? "Invitado listo para conversión";
    case "guest_referrer":
      return `${md.referralCount ?? 0} referidos — ${md.convertedCount ?? 0} conversiones`;
    case "guest_proposal":
      return `Prioridad: ${md.proposalPriority ?? "N/A"} — ${md.proposalType ?? ""}`;
    default:
      return node.label;
  }
}

// ═══════════════════════════════════════════════════════════
// §4 — CANVAS DRAW
// ═══════════════════════════════════════════════════════════

function drawEcosystem(
  ctx: CanvasRenderingContext2D,
  map: EcosystemMap,
  w: number,
  h: number,
  hoveredId: string | null,
  entryProgress: number,
  time: number,
): void {
  ctx.clearRect(0, 0, w, h);

  // Build position lookup for connections
  const posMap = new Map<string, { x: number; y: number }>();
  for (const node of map.nodes) {
    posMap.set(node.id, { x: node.nx * w, y: node.ny * h });
  }

  // ── 1. Draw cluster backgrounds (faint region circles) ──
  for (const cluster of map.clusters) {
    const cx = cluster.nx * w;
    const cy = cluster.ny * h;
    const radius = 40 + cluster.count * 6;
    const delay = entryDelay("stage_anchor");
    const alpha = Math.max(0, Math.min(1, (entryProgress - delay) / 0.3)) * 0.06;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = cluster.color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Bottleneck red glow
    if (cluster.isBottleneck) {
      ctx.globalAlpha = alpha * 1.5;
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 2. Draw connections ──
  for (const conn of map.connections) {
    const from = posMap.get(conn.fromId);
    const to = posMap.get(conn.toId);
    if (!from || !to) continue;

    const connDelay = conn.type === "pipeline_flow" ? 0.15 : 0.4;
    const alpha = Math.max(0, Math.min(1, (entryProgress - connDelay) / 0.3)) * 0.08 * (conn.strength / 100);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = conn.type === "pipeline_flow" ? "rgba(255,255,255,0.5)" : "rgba(78,205,196,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  // ── 3. Draw nodes ──
  for (const node of map.nodes) {
    const px = node.nx * w;
    const py = node.ny * h;
    const delay = entryDelay(node.type);
    const nodeAlpha = node.alpha * Math.max(0, Math.min(1, (entryProgress - delay) / 0.3));

    if (nodeAlpha <= 0) continue;

    const isHovered = node.id === hoveredId;

    // VIP/important glow
    if (node.type === "guest_quickwin" || (node.type === "guest_proposal" && node.metadata.proposalPriority === "high")) {
      ctx.globalAlpha = 0.1 * nodeAlpha;
      ctx.shadowBlur = 15;
      ctx.shadowColor = node.color;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(px, py, node.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Main node
    ctx.globalAlpha = nodeAlpha;
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(px, py, node.radius, 0, Math.PI * 2);
    ctx.fill();

    // Dormant pulse for stage anchors with low count
    if (node.type === "stage_anchor" && node.metadata.stageId === "dormant") {
      const pulse = 0.7 + Math.sin(time * 1.5) * 0.3;
      ctx.globalAlpha = nodeAlpha * pulse * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, node.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hover ring
    if (isHovered) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, node.radius + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#ffffff";
      ctx.font = '11px "DM Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(node.label, px, py - node.radius - 10);
    }

    // Stage anchor label (always visible)
    if (node.type === "stage_anchor" && !isHovered) {
      ctx.globalAlpha = nodeAlpha * 0.7;
      ctx.fillStyle = "#f0ece4";
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(node.label, px, py + node.radius + 14);
      ctx.font = '13px "DM Mono", monospace';
      ctx.fillText(String(node.metadata.count ?? 0), px, py + node.radius + 28);
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Memory constellation — canvas star map of the guest ecosystem.
 * Multi-source fusion: pipeline stages, quick wins, referrers, proposals.
 * Stars cluster by pipeline position. Connected by flow and influence.
 *
 * @example
 * <GuestMemoryStarMap
 *   pipeline={dashboard.engines.pipeline}
 *   analytics={dashboard.analytics}
 *   proposals={dashboard.proposals}
 *   mode={dashboard.dashboardMode}
 *   onGuestClick={(id) => navigateToGuest(id)}
 *   onStageClick={(id) => navigateToStage(id)}
 * />
 */
export function GuestMemoryStarMap({
  pipeline,
  analytics,
  proposals,
  mode = "calm",
  onGuestClick,
  onStageClick,
}: GuestMemoryStarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);

  // ── Build ecosystem map ──
  const ecosystemMap: EcosystemMap = useMemo(
    () => buildEcosystemMapSafe({ pipeline, analytics, proposals }),
    [pipeline, analytics, proposals],
  );

  // ── Canvas sizing ──
  const sizeRef = useRef({ w: 0, h: 0 });

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    sizeRef.current = { w: rect.width, h: rect.height };
  }, []);

  // ── Animation / rendering loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initCanvas();

    const resizeObserver = new ResizeObserver(() => initCanvas());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    if (reducedMotion) {
      // Static draw at full progress
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { w, h } = sizeRef.current;
        drawEcosystem(ctx, ecosystemMap, w, h, null, 1, 0);
      }
      return () => resizeObserver.disconnect();
    }

    startTimeRef.current = performance.now();
    let lastFrame = 0;

    function animate(timestamp: number) {
      if (timestamp - lastFrame < FRAME_BUDGET_MS) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrame = timestamp;

      const ctx = canvas!.getContext("2d");
      if (!ctx) return;

      const { w, h } = sizeRef.current;
      const elapsed = timestamp - startTimeRef.current;
      const entryProgress = Math.min(1, elapsed / ENTRY_DURATION_MS);
      const time = timestamp * 0.001;

      drawEcosystem(ctx, ecosystemMap, w, h, hoveredRef.current, entryProgress, time);

      // Stop rAF loop after entry animation completes (unless hovering)
      if (entryProgress >= 1 && !hoveredRef.current) {
        return; // Don't request next frame
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
    };
  }, [initCanvas, ecosystemMap, reducedMotion]);

  // ── Redraw on hover change ──
  useEffect(() => {
    if (reducedMotion) return; // Already drawn statically

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    drawEcosystem(ctx, ecosystemMap, w, h, hoveredNodeId, 1, performance.now() * 0.001);
  }, [hoveredNodeId, ecosystemMap, reducedMotion]);

  // ── Mouse handlers ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const found = findNearestNode(mx, my, ecosystemMap.nodes, sizeRef.current.w, sizeRef.current.h);
      const newId = found?.id ?? null;

      if (newId !== hoveredRef.current) {
        hoveredRef.current = newId;
        setHoveredNodeId(newId);
      }
    },
    [ecosystemMap.nodes],
  );

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHoveredNodeId(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const found = findNearestNode(mx, my, ecosystemMap.nodes, sizeRef.current.w, sizeRef.current.h);
      if (!found) return;

      if (found.type === "guest_quickwin" || found.type === "guest_proposal") {
        if (found.metadata.guestId && onGuestClick) {
          onGuestClick(found.metadata.guestId);
        }
      } else if (found.type === "stage_anchor") {
        if (found.metadata.stageId && onStageClick) {
          onStageClick(found.metadata.stageId);
        }
      }
    },
    [ecosystemMap.nodes, onGuestClick, onStageClick],
  );

  // ── Tooltip positioning via ref ──
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseMoveWithTooltip = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleMouseMove(e);

      if (tooltipRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          tooltipRef.current.style.left = `${e.clientX - rect.left + 16}px`;
          tooltipRef.current.style.top = `${e.clientY - rect.top - 8}px`;
        }
      }
    },
    [handleMouseMove],
  );

  // ── Hovered node data ──
  const hoveredNode = hoveredNodeId
    ? ecosystemMap.nodes.find((n) => n.id === hoveredNodeId) ?? null
    : null;

  // ── Empty state ──
  if (ecosystemMap.nodes.length === 0) {
    return (
      <div
        className="gst-starmap"
        data-state="empty"
        data-mode={mode}
        role="region"
        aria-label="Mapa ecosistema de invitados"
        data-testid="guest-starmap"
      >
        <p className="gst-starmap__empty-text">
          No hay datos del ecosistema disponibles.
        </p>
      </div>
    );
  }

  return (
    <div
      className="gst-starmap"
      data-state="data"
      data-mode={mode}
      role="region"
      aria-label={`Mapa ecosistema — ${ecosystemMap.metadata.totalNodes} nodos, salud ${ecosystemMap.metadata.pipelineHealth}/100`}
      data-testid="guest-starmap"
    >
      {/* ── Header ── */}
      <div className="gst-starmap__header">
        <h3 className="gst-starmap__title">Constelación de Ecosistema</h3>
        <span className="gst-starmap__subtitle">
          {ecosystemMap.metadata.totalNodes} nodos — {ecosystemMap.metadata.totalGuests} invitados — Salud: {ecosystemMap.metadata.pipelineHealth}/100
        </span>
      </div>

      {/* ── Canvas ── */}
      <div className="gst-starmap__canvas-container">
        <canvas
          ref={canvasRef}
          className="gst-starmap__canvas"
          onMouseMove={handleMouseMoveWithTooltip}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          role="img"
          aria-label={`Mapa estelar del ecosistema con ${ecosystemMap.metadata.totalNodes} nodos`}
          tabIndex={0}
        />

        {/* ── Tooltip (DOM overlay) ── */}
        <div
          ref={tooltipRef}
          className="gst-starmap__tooltip"
          data-visible={hoveredNode !== null}
          data-type={hoveredNode?.type}
          aria-hidden="true"
        >
          {hoveredNode && (
            <>
              <p className="gst-starmap__tooltip-type">
                {NODE_TYPE_LABELS[hoveredNode.type]}
              </p>
              <p className="gst-starmap__tooltip-name">{hoveredNode.label}</p>
              <p className="gst-starmap__tooltip-desc">
                {nodeDescription(hoveredNode)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="gst-starmap__legend" role="list" aria-label="Leyenda del ecosistema">
        <div className="gst-starmap__legend-item" role="listitem">
          <span className="gst-starmap__legend-dot" data-type="stage_anchor" />
          <span className="gst-starmap__legend-label">Etapa del pipeline</span>
        </div>
        <div className="gst-starmap__legend-item" role="listitem">
          <span className="gst-starmap__legend-dot" data-type="guest_quickwin" />
          <span className="gst-starmap__legend-label">Quick Win</span>
        </div>
        <div className="gst-starmap__legend-item" role="listitem">
          <span className="gst-starmap__legend-dot" data-type="guest_referrer" />
          <span className="gst-starmap__legend-label">Familia referente</span>
        </div>
        <div className="gst-starmap__legend-item" role="listitem">
          <span className="gst-starmap__legend-dot" data-type="guest_proposal" />
          <span className="gst-starmap__legend-label">Target de propuesta</span>
        </div>
        <div className="gst-starmap__legend-item" role="listitem">
          <span className="gst-starmap__legend-dot" data-type="bottleneck" />
          <span className="gst-starmap__legend-label">Bloqueo</span>
        </div>
      </div>
    </div>
  );
}