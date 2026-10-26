// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SocialSportMap.tsx
// §B3.8 — Social Sport Map
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// Canvas 2D force-directed graph. Each member is a node,
// each relationship is an edge. Clusters emerge naturally.
// Isolated members pulse red. Hover highlights connections.
// Click selects for drill-down.
// Living Protocol: 7/7
//
// Aha Moment: "¿Quién juega con quién? ¿Quién está solo?"
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SocialSportMap
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
  SocialSportGraph,
  SocialSportNode,
  SportsDashboardMode,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./SocialSportMap.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SocialSportMapProps {
  graph: SocialSportGraph;
  ambientMode?: SportsDashboardMode;
  reducedMotion?: boolean;
  onNodeSelect?: (memberId: string) => void;
  onNodeHover?: (memberId: string | null) => void;
}

interface SimNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  nodeId: string;
}

interface TooltipState {
  x: number;
  y: number;
  node: SocialSportNode;
  isConnectedToHovered: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const SIM_ITERATIONS = 150;
const REPULSION = 4000;
const ATTRACTION = 0.005;
const CENTER_GRAVITY = 0.01;
const DAMPING = 0.88;
const MIN_DISTANCE = 40;
const MIN_NODE_RADIUS = 8;
const MAX_NODE_RADIUS = 20;
const EDGE_BASE_WIDTH = 1;
const EDGE_MAX_WIDTH = 6;
const HIT_RADIUS_BUFFER = 6;

const DPR =
  typeof window !== "undefined"
    ? Math.min(window.devicePixelRatio || 1, 2)
    : 1;

const RELATIONSHIP_STYLES: Record<
  string,
  { dash: number[]; color: string }
> = {
  doubles_partner: { dash: [], color: "rgba(255, 255, 255, 0.3)" },
  training_buddy: { dash: [], color: "rgba(255, 255, 255, 0.2)" },
  rival: { dash: [4, 4], color: "rgba(229, 77, 77, 0.2)" },
  teammate: { dash: [], color: "rgba(42, 154, 181, 0.2)" },
  casual: { dash: [8, 4], color: "rgba(138, 133, 128, 0.15)" },
};

const SPORT_COLORS: Record<string, string> = {
  tennis: "#2a9ab5",
  golf: "#3daa70",
  swimming: "#2ab5b5",
  fitness: "#e54d4d",
  basketball: "#d4a017",
  volleyball: "#3dab6f",
  football: "#5a8a6a",
  squash: "#c27a3a",
  padel: "#d4af37",
  yoga: "#2ab5a0",
  pilates: "#5a9a7a",
};

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getNodeRadius(socialScore: number): number {
  return lerp(MIN_NODE_RADIUS, MAX_NODE_RADIUS, socialScore / 100);
}

function getNodeColor(sports: string[]): string {
  if (sports.length === 0) return "#8a8580";
  const primary = sports[0];
  return SPORT_COLORS[primary] ?? "#8a8580";
}

function buildNarrative(graph: SocialSportGraph): string {
  const { clusters, isolatedMemberIds, nodes, edges } = graph;
  const clusterPart =
    clusters.length > 0
      ? `${clusters.length} cluster${clusters.length > 1 ? "es" : ""} natural${clusters.length > 1 ? "es" : ""}`
      : "Sin clusters detectados";
  const isoPart =
    isolatedMemberIds.length > 0
      ? `${isolatedMemberIds.length} socio${isolatedMemberIds.length > 1 ? "s" : ""} aislado${isolatedMemberIds.length > 1 ? "s" : ""}`
      : "Todos los socios tienen al menos una conexión";
  const edgePart = `${edges.length} conexión${edges.length !== 1 ? "es" : ""} entre ${nodes.length} socios`;
  return `${clusterPart}. ${isoPart}. ${edgePart}.`;
}

// ═══════════════════════════════════════════════════════════
// §4 — FORCE SIMULATION
// ═══════════════════════════════════════════════════════════

function computeLayout(graph: SocialSportGraph, w: number, h: number): SimNode[] {
  const { nodes, edges } = graph;
  const cx = w / 2;
  const cy = h / 2;

  // Initialize positions in a circle
  const sim: SimNode[] = nodes.map((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
    const spread = Math.min(w, h) * 0.3;
    return {
      x: cx + Math.cos(angle) * spread + (Math.random() - 0.5) * 40,
      y: cy + Math.sin(angle) * spread + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
      radius: getNodeRadius(n.socialScore),
      color: getNodeColor(n.sports),
      nodeId: n.memberId,
    };
  });

  // Build edge index for fast lookups
  const edgePairs: Array<[number, number, number]> = [];
  const nodeIndexMap = new Map<string, number>();
  for (let i = 0; i < sim.length; i++) {
    nodeIndexMap.set(sim[i].nodeId, i);
  }
  for (const e of edges) {
    const i1 = nodeIndexMap.get(e.member1Id);
    const i2 = nodeIndexMap.get(e.member2Id);
    if (i1 != null && i2 != null) {
      edgePairs.push([i1, i2, e.strength]);
    }
  }

  // Run simulation
  for (let iter = 0; iter < SIM_ITERATIONS; iter++) {
    // Repulsion (all pairs)
    for (let i = 0; i < sim.length; i++) {
      for (let j = i + 1; j < sim.length; j++) {
        let dx = sim[j].x - sim[i].x;
        let dy = sim[j].y - sim[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DISTANCE) dist = MIN_DISTANCE;

        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        sim[i].vx -= fx;
        sim[i].vy -= fy;
        sim[j].vx += fx;
        sim[j].vy += fy;
      }
    }

    // Attraction (edges)
    for (const [i, j, strength] of edgePairs) {
      const dx = sim[j].x - sim[i].x;
      const dy = sim[j].y - sim[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = ATTRACTION * dist * strength;
      const fx = (dx / (dist || 1)) * force;
      const fy = (dy / (dist || 1)) * force;

      sim[i].vx += fx;
      sim[i].vy += fy;
      sim[j].vx -= fx;
      sim[j].vy -= fy;
    }

    // Center gravity
    for (const n of sim) {
      n.vx += (cx - n.x) * CENTER_GRAVITY;
      n.vy += (cy - n.y) * CENTER_GRAVITY;
    }

    // Integrate + damping
    for (const n of sim) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;

      // Keep within bounds
      const pad = n.radius + 10;
      n.x = Math.max(pad, Math.min(w - pad, n.x));
      n.y = Math.max(pad, Math.min(h - pad, n.y));
    }
  }

  return sim;
}

// ═══════════════════════════════════════════════════════════
// §5 — CANVAS RENDERING
// ═══════════════════════════════════════════════════════════

function drawGraph(
  ctx: CanvasRenderingContext2D,
  graph: SocialSportGraph,
  sim: SimNode[],
  w: number,
  h: number,
  hoveredId: string | null,
  mode: SportsDashboardMode,
): void {
  ctx.clearRect(0, 0, w, h);

  const nodeMap = new Map<string, SimNode>();
  for (const s of sim) {
    nodeMap.set(s.nodeId, s);
  }

  // Highlighted set: hovered node + direct connections
  const highlighted = new Set<string>();
  if (hoveredId) {
    highlighted.add(hoveredId);
    for (const edge of graph.edges) {
      if (edge.member1Id === hoveredId) highlighted.add(edge.member2Id);
      if (edge.member2Id === hoveredId) highlighted.add(edge.member1Id);
    }
  }

  // ── Draw edges ──
  for (const edge of graph.edges) {
    const s1 = nodeMap.get(edge.member1Id);
    const s2 = nodeMap.get(edge.member2Id);
    if (!s1 || !s2) continue;

    const isHighlighted = hoveredId != null && highlighted.has(edge.member1Id) && highlighted.has(edge.member2Id);
    const style = RELATIONSHIP_STYLES[edge.relationshipType] ?? RELATIONSHIP_STYLES.casual;

    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);

    ctx.setLineDash(style.dash);

    if (isHighlighted) {
      ctx.strokeStyle = mode === "critical"
        ? "rgba(229, 77, 77, 0.5)"
        : mode === "alert"
          ? "rgba(212, 160, 23, 0.5)"
          : "rgba(42, 154, 181, 0.5)";
      ctx.lineWidth = EDGE_BASE_WIDTH + edge.strength * (EDGE_MAX_WIDTH - EDGE_BASE_WIDTH) + 1;
    } else if (hoveredId != null) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = EDGE_BASE_WIDTH;
    } else {
      ctx.strokeStyle = style.color;
      ctx.lineWidth = EDGE_BASE_WIDTH + edge.strength * (EDGE_MAX_WIDTH - EDGE_BASE_WIDTH);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Draw nodes ──
  for (const simNode of sim) {
    const data = graph.nodes.find((n) => n.memberId === simNode.nodeId);
    if (!data) continue;

    const isIsolated = graph.isolatedMemberIds.includes(simNode.nodeId);
    const isHovered = simNode.nodeId === hoveredId;
    const isConnected = highlighted.has(simNode.nodeId);
    const dimmed = hoveredId != null && !isConnected;

    // Isolated pulse
    if (isIsolated && !dimmed) {
      const pulseR = simNode.radius + 6 + Math.sin(Date.now() / 600) * 3;
      ctx.beginPath();
      ctx.arc(simNode.x, simNode.y, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(229, 77, 77, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Node circle
    const radius = isHovered ? simNode.radius * 1.25 : simNode.radius;

    ctx.beginPath();
    ctx.arc(simNode.x, simNode.y, radius, 0, Math.PI * 2);

    if (dimmed) {
      ctx.fillStyle = "rgba(60, 60, 60, 0.3)";
    } else {
      ctx.fillStyle = simNode.color;
    }
    ctx.globalAlpha = dimmed ? 0.3 : 1;
    ctx.fill();

    // Isolated border
    if (isIsolated) {
      ctx.beginPath();
      ctx.arc(simNode.x, simNode.y, radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = dimmed ? "rgba(229, 77, 77, 0.1)" : "rgba(229, 77, 77, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Highlight ring
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(simNode.x, simNode.y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = mode === "critical"
        ? "rgba(229, 77, 77, 0.6)"
        : mode === "alert"
          ? "rgba(212, 160, 23, 0.6)"
          : "rgba(42, 154, 181, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Name label
    ctx.globalAlpha = dimmed ? 0.15 : 1;
    ctx.fillStyle = "#f0ece4";
    ctx.font = "11px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      data.memberName.split(" ")[0],
      simNode.x,
      simNode.y + radius + 14,
    );
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════
// §6 — HIT TESTING
// ═══════════════════════════════════════════════════════════

function hitTest(
  mx: number,
  my: number,
  sim: SimNode[],
  graph: SocialSportGraph,
): SocialSportNode | null {
  for (const s of sim) {
    const dx = mx - s.x;
    const dy = my - s.y;
    const hitR = s.radius + HIT_RADIUS_BUFFER;
    if (dx * dx + dy * dy < hitR * hitR) {
      return graph.nodes.find((n) => n.memberId === s.nodeId) ?? null;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// §7 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SocialSportMap({
  graph,
  ambientMode = "calm",
  reducedMotion = false,
  onNodeSelect,
  onNodeHover,
}: SocialSportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimNode[]>([]);
  const animRef = useRef<number>(0);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const narrative = useMemo(
    () => buildNarrative(graph),
    [graph],
  );

  const isIsolated = useCallback(
    (nodeId: string) => graph.isolatedMemberIds.includes(nodeId),
    [graph.isolatedMemberIds],
  );

  // ── §7.1 — Compute layout on mount ────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    simRef.current = computeLayout(graph, w, h);
  }, [graph]);

  // ── §7.2 — Canvas rendering loop ──────────────────────
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

    const isolatedSet = new Set(graph.isolatedMemberIds);

    if (reducedMotion) {
      // Static render
      drawGraph(ctx, graph, simRef.current, w, h, hoveredId, ambientMode);
      return;
    }

    // Animated render (pulse for isolated nodes)
    const render = () => {
      drawGraph(ctx, graph, simRef.current, w, h, hoveredId, ambientMode);
      if (isolatedSet.size > 0) {
        animRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [graph, hoveredId, ambientMode, reducedMotion]);

  // ── §7.3 — Mouse interactions ─────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = hitTest(mx, my, simRef.current, graph);

      if (hit) {
        setHoveredId(hit.memberId);
        onNodeHover?.(hit.memberId);
        setTooltip({ x: mx, y: my, node: hit, isConnectedToHovered: false });
        canvas.style.cursor = "pointer";
      } else {
        if (hoveredId != null) {
          setHoveredId(null);
          onNodeHover?.(null);
        }
        setTooltip(null);
        canvas.style.cursor = "default";
      }
    },
    [graph, hoveredId, onNodeHover],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
    onNodeHover?.(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, [onNodeHover]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = hitTest(mx, my, simRef.current, graph);
      if (hit) {
        onNodeSelect?.(hit.memberId);
      }
    },
    [graph, onNodeSelect],
  );

  // ── §7.4 — Degraded: no data ──────────────────────────
  if (graph.nodes.length === 0) {
    return (
      <section
        className="spt-socialmap"
        data-mode={ambientMode}
        role="region"
        aria-label="Mapa social deportivo"
      >
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Sin actividad social"
          description="Cuando los socios empiecen a jugar juntos, el mapa social se construirá automáticamente mostrando clusters, parejas y socios aislados."
          compact
        />
      </section>
    );
  }

  // ── §7.5 — Render ─────────────────────────────────────
  return (
    <section
      ref={containerRef}
      className="spt-socialmap"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-socialmap__header">
        <h3 className="spt-socialmap__title">Mapa Social</h3>
        <span className="spt-socialmap__count">
          {graph.nodes.length} socio{graph.nodes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        className="spt-socialmap__canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        role="img"
        aria-label={narrative}
      />

      {/* ── Tooltip overlay ── */}
      {tooltip && (
        <div
          className="spt-socialmap__tooltip"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
          data-isolated={isIsolated(tooltip.node.memberId)}
          role="tooltip"
        >
          <p className="spt-socialmap__tooltip-name">
            {tooltip.node.memberName}
            {isIsolated(tooltip.node.memberId) && (
              <span className="spt-socialmap__tooltip-iso">aislado</span>
            )}
          </p>
          <p className="spt-socialmap__tooltip-stat">
            Conexiones: <strong>{tooltip.node.connectionCount}</strong>
          </p>
          <p className="spt-socialmap__tooltip-stat">
            Social: <strong>{tooltip.node.socialScore}/100</strong> ·
            Influencia: <strong>{tooltip.node.influenceScore}/100</strong>
          </p>
          <p className="spt-socialmap__tooltip-sports">
            {tooltip.node.sports.join(", ")}
          </p>
        </div>
      )}

      {/* ── Footer: Narrative + Stats ── */}
      <div className="spt-socialmap__footer">
        <p className="spt-socialmap__narrative">{narrative}</p>
        {graph.isolatedMemberIds.length > 0 && (
          <p className="spt-socialmap__alert">
            ⚠️ {graph.isolatedMemberIds.length} socio
            {graph.isolatedMemberIds.length > 1 ? "s" : ""} sin
            compañero{graph.isolatedMemberIds.length > 1 ? "s" : ""} —
            sugerir parejas desde La Trayectoria.
          </p>
        )}
        {graph.clusters.length > 0 && (
          <p className="spt-socialmap__clusters">
            Clusters:{" "}
            {graph.clusters.map((c) => (
              <span key={c.clusterId} className="spt-socialmap__cluster-badge">
                {c.sport} ({c.memberIds.length})
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}