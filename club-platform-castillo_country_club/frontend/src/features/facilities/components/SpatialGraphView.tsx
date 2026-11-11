// src/features/facilities/components/SpatialGraphView.tsx
// ═══════════════════════════════════════════════════════════════
// SPATIAL GRAPH VIEW — "El Sistema Nervioso" (REWRITE)
//
// I5 Spatial Interaction additions:
//   1. Scroll-to-zoom (toward cursor)
//   2. Click+drag pan (on empty space)
//   3. Node drag (reposition with physics-free override)
//   4. Zoom controls panel (+/−/fit/reset)
//   5. Keyboard zoom (+/−/0/f when container focused)
//
// Living Component Protocol 7/7 — preserved.
// ═══════════════════════════════════════════════════════════════

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  SpatialGraph,
  SpatialNode,
  SpatialEdge,
  FacilityPersonality,
  ComfortScore,
  OccupancyPrediction,
  CrowdLevel,
  FacilitiesDashboardMode,
} from "../types";

import "./SpatialGraphView.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.12;
const DRAG_THRESHOLD_PX = 4;

const LAYOUT_ITERATIONS = 80;
const REPULSION_STRENGTH = 800;
const ATTRACTION_STRENGTH = 0.005;
const CENTERING_STRENGTH = 0.01;
const DAMPING = 0.85;
const MIN_DISTANCE = 80;

const CROWD_COLORS: Record<CrowdLevel, string> = {
  empty: "var(--color-silver-600)",
  quiet: "var(--color-teal-600)",
  normal: "var(--color-teal-400)",
  busy: "var(--color-amber-400)",
  crowded: "var(--color-rose-400)",
  overloaded: "var(--color-rose-500)",
};

const EDGE_TYPE_COLORS: Record<string, string> = {
  flow: "var(--color-teal-400)",
  synergy: "var(--color-emerald-400)",
  dependency: "var(--color-silver-500)",
};

// ═══════════════════════════════════════════════════════════════
// TYPES — Interaction
// ═══════════════════════════════════════════════════════════════

interface Transform {
  x: number;
  y: number;
  scale: number;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ═══════════════════════════════════════════════════════════════
// FORCE-DIRECTED LAYOUT (unchanged)
// ═══════════════════════════════════════════════════════════════

function computeLayout(
  nodes: SpatialNode[],
  edges: SpatialEdge[],
  width: number,
  height: number,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.3;

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
    positions.set(node.facility_id, {
      x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
      y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
    });
  });

  for (let iter = 0; iter < LAYOUT_ITERATIONS; iter++) {
    const nodeIds = Array.from(positions.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const posA = positions.get(nodeIds[i])!;
        const posB = positions.get(nodeIds[j])!;
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION_STRENGTH / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        posA.vx += fx;
        posA.vy += fy;
        posB.vx -= fx;
        posB.vy -= fy;
      }
    }

    for (const edge of edges) {
      const posA = positions.get(edge.from_id);
      const posB = positions.get(edge.to_id);
      if (!posA || !posB) continue;
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force =
        (dist - MIN_DISTANCE) * ATTRACTION_STRENGTH * edge.correlation_score;
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      posA.vx += fx;
      posA.vy += fy;
      posB.vx -= fx;
      posB.vy -= fy;
    }

    for (const pos of positions.values()) {
      pos.vx += (cx - pos.x) * CENTERING_STRENGTH;
      pos.vy += (cy - pos.y) * CENTERING_STRENGTH;
      pos.vx *= DAMPING;
      pos.vy *= DAMPING;
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.x = Math.max(60, Math.min(width - 60, pos.x));
      pos.y = Math.max(60, Math.min(height - 60, pos.y));
    }
  }

  return positions;
}

// ═══════════════════════════════════════════════════════════════
// NODE SIZING
// ═══════════════════════════════════════════════════════════════

function computeNodeRadius(node: SpatialNode, allNodes: SpatialNode[]): number {
  if (allNodes.length === 0) return 36;
  const capacities = allNodes.map((n) => n.max_capacity);
  const maxCap = Math.max(...capacities, 1);
  const minCap = Math.min(...capacities, 0);
  const range = maxCap - minCap || 1;
  const normalized = (node.max_capacity - minCap) / range;
  return 28 + normalized * 36;
}

// ═══════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════

function getParticlesForEdge(
  edge: SpatialEdge,
  reducedMotion: boolean,
): React.ReactNode[] {
  if (reducedMotion) return [];
  if (edge.edge_type !== "flow" && edge.edge_type !== "synergy") return [];
  if (edge.correlation_score < 0.3) return [];

  const count = Math.min(3, Math.ceil(edge.correlation_score * 4));
  const particles: React.ReactNode[] = [];
  const pathId = `fac-edge-path-${edge.from_id}-${edge.to_id}`;
  const color = EDGE_TYPE_COLORS[edge.edge_type] ?? "var(--color-teal-400)";

  for (let i = 0; i < count; i++) {
    particles.push(
      <circle
        key={`particle-${edge.from_id}-${edge.to_id}-${i}`}
        r={2}
        fill={color}
        className="glass-fac-graph__particle"
        style={{ animationDelay: `${(i * 3) / count}s` }}
      >
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          begin={`${(i * 3) / count}s`}
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>,
    );
  }

  return particles;
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE HELPERS
// ═══════════════════════════════════════════════════════════════

function buildNodeNarrative(
  node: SpatialNode,
  comfort?: ComfortScore,
): string {
  const crowdLabels: Record<CrowdLevel, string> = {
    empty: "vacío",
    quiet: "tranquilo",
    normal: "con actividad normal",
    busy: "concurrido",
    crowded: "lleno",
    overloaded: "sobrecargado",
  };
  const parts: string[] = [];
  parts.push(`${node.facility_name} está ${crowdLabels[node.crowd_level]}`);
  const occPct =
    node.max_capacity > 0
      ? Math.round((node.current_occupancy / node.max_capacity) * 100)
      : 0;
  parts.push(`${occPct}% ocupación`);
  if (comfort) {
    parts.push(
      comfort.intervention_needed
        ? "comfort degradado — intervención sugerida"
        : `comfort ${comfort.overall}/100`,
    );
  }
  return parts.join(" · ");
}

function buildPersonalityNarrative(personality: FacilityPersonality): string {
  const { personality_type: type, activity_level: activity } = personality;
  if (type === "high_energy" && activity > 70)
    return "Espacio de alta demanda — opera cerca de su capacidad máxima consistentemente.";
  if (type === "high_energy")
    return "Energía alta con patrones de uso intensivo en horarios pico.";
  if (type === "moderate")
    return "Uso balanceado — buen candidato para actividades versátiles.";
  if (type === "low_activity" && activity < 30)
    return "Espacio subutilizado — existe oportunidad de rediseño o reactivación.";
  if (type === "low_activity")
    return "Actividad reducida — espacio con potencial de crecimiento.";
  return "Personalidad única — requiere análisis específico para optimización.";
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface SpatialGraphViewProps {
  graph: SpatialGraph;
  personalities: Record<string, FacilityPersonality>;
  comfortScores: Record<string, ComfortScore>;
  occupancyPredictions: Record<string, OccupancyPrediction>;
  ambientMode?: FacilitiesDashboardMode;
  selectedFacilityId?: string;
  onSelectFacility?: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SpatialGraphView({
  graph,
  comfortScores,
  ambientMode = "calm",
  selectedFacilityId,
  onSelectFacility,
}: SpatialGraphViewProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Existing state ──
  const [tooltipNode, setTooltipNode] = useState<SpatialNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [panelNodeId, setPanelNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // ── I5: Transform (pan + zoom) ──
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // ── I5: Interaction state ──
  const [isPanning, setIsPanning] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [positionOverrides, setPositionOverrides] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // Ref for interaction tracking (avoids stale closures in move handler)
  const interactionRef = useRef({
    type: "idle" as "idle" | "pan" | "drag",
    startClientX: 0,
    startClientY: 0,
    startTransformX: 0,
    startTransformY: 0,
    dragNodeId: "",
    dragOffsetX: 0,
    dragOffsetY: 0,
    hasMoved: false,
  });

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // ── ResizeObserver ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── I5: Wheel zoom (native event for passive: false) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      // Don't zoom when pointer is over zoom controls
      const target = e.target as Element;
      if (target.closest(".glass-fac-graph__controls")) return;

      e.preventDefault();

      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const direction = e.deltaY < 0 ? 1 : -1;

      setTransform((prev) => {
        const factor = 1 + direction * ZOOM_STEP;
        const newScale = clamp(prev.scale * factor, MIN_ZOOM, MAX_ZOOM);
        if (newScale === prev.scale) return prev;
        const ratio = newScale / prev.scale;
        return {
          scale: newScale,
          x: mx - (mx - prev.x) * ratio,
          y: my - (my - prev.y) * ratio,
        };
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Clean overrides for removed nodes ──
  useEffect(() => {
    const validIds = new Set(graph.nodes.map((n) => n.facility_id));
    setPositionOverrides((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const id of next.keys()) {
        if (!validIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [graph.nodes]);

  // ═══════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════════════

  const positions = useMemo(() => {
    if (
      graph.nodes.length === 0 ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return new Map();
    return computeLayout(
      graph.nodes,
      graph.edges,
      dimensions.width,
      dimensions.height,
    );
  }, [graph.nodes, graph.edges, dimensions.width, dimensions.height]);

  // ── I5: Effective positions (computed + overrides) ──
  const getEffectivePosition = useCallback(
    (nodeId: string): NodePosition | undefined => {
      const override = positionOverrides.get(nodeId);
      if (override) return { x: override.x, y: override.y, vx: 0, vy: 0 };
      return positions.get(nodeId);
    },
    [positions, positionOverrides],
  );

  const panelNode = useMemo(() => {
    if (!panelNodeId) return null;
    return graph.nodes.find((n) => n.facility_id === panelNodeId) ?? null;
  }, [graph.nodes, panelNodeId]);

  const panelNarrative = useMemo(() => {
    if (!panelNode) return "";
    return buildPersonalityNarrative(panelNode.personality);
  }, [panelNode]);

  const maxCorr = Math.max(
    ...graph.edges.map((e) => e.correlation_score),
    0.1,
  );

  // ── I5: Interaction label for CSS ──
  const interactionLabel = isPanning
    ? "panning"
    : dragNodeId
      ? "dragging"
      : "idle";

  // ═══════════════════════════════════════════════════════════════
  // I5: NAVIGATION CALLBACKS
  // ═══════════════════════════════════════════════════════════════

  const fitToView = useCallback(() => {
    const allPos = graph.nodes
      .map((n) => getEffectivePosition(n.facility_id))
      .filter(Boolean) as NodePosition[];
    if (allPos.length === 0) return;

    const xs = allPos.map((p) => p.x);
    const ys = allPos.map((p) => p.y);
    const pad = 80;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;

    const cw = maxX - minX || 1;
    const ch = maxY - minY || 1;
    const scale = Math.min(
      dimensions.width / cw,
      dimensions.height / ch,
      MAX_ZOOM,
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      scale,
      x: dimensions.width / 2 - centerX * scale,
      y: dimensions.height / 2 - centerY * scale,
    });
  }, [graph.nodes, getEffectivePosition, dimensions]);

  const zoomTowardCenter = useCallback(
    (factor: number) => {
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      setTransform((prev) => {
        const newScale = clamp(prev.scale * factor, MIN_ZOOM, MAX_ZOOM);
        if (newScale === prev.scale) return prev;
        const ratio = newScale / prev.scale;
        return {
          scale: newScale,
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        };
      });
    },
    [dimensions],
  );

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const clearOverrides = useCallback(() => {
    setPositionOverrides(new Map());
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // I5: POINTER EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore right-click
      if (e.button !== 0) return;

      const target = e.target as Element;
      const nodeEl = target.closest("[data-node-id]");

      if (nodeEl) {
        // ── Start potential node drag ──
        const nodeId = nodeEl.getAttribute("data-node-id")!;
        const rect = containerRef.current!.getBoundingClientRect();
        const t = transformRef.current;
        const contentX = (e.clientX - rect.left - t.x) / t.scale;
        const contentY = (e.clientY - rect.top - t.y) / t.scale;

        const effective = positionOverrides.get(nodeId) ?? positions.get(nodeId);
        if (!effective) return;

        interactionRef.current = {
          type: "drag",
          startClientX: e.clientX,
          startClientY: e.clientY,
          startTransformX: t.x,
          startTransformY: t.y,
          dragNodeId: nodeId,
          dragOffsetX: contentX - effective.x,
          dragOffsetY: contentY - effective.y,
          hasMoved: false,
        };
        setDragNodeId(nodeId);
        setTooltipNode(null);
      } else {
        // ── Start pan ──
        interactionRef.current = {
          type: "pan",
          startClientX: e.clientX,
          startClientY: e.clientY,
          startTransformX: transformRef.current.x,
          startTransformY: transformRef.current.y,
          dragNodeId: "",
          dragOffsetX: 0,
          dragOffsetY: 0,
          hasMoved: false,
        };
        setIsPanning(true);
        setTooltipNode(null);
      }

      containerRef.current?.setPointerCapture(e.pointerId);
    },
    [positions, positionOverrides],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ix = interactionRef.current;

      if (ix.type === "pan") {
        const dx = e.clientX - ix.startClientX;
        const dy = e.clientY - ix.startClientY;
        setTransform((prev) => ({
          ...prev,
          x: ix.startTransformX + dx,
          y: ix.startTransformY + dy,
        }));
        return;
      }

      if (ix.type === "drag") {
        const dx = e.clientX - ix.startClientX;
        const dy = e.clientY - ix.startClientY;

        // Threshold check
        if (!ix.hasMoved) {
          if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX)
            return;
          ix.hasMoved = true;
        }

        // Convert pointer to content space
        const rect = containerRef.current!.getBoundingClientRect();
        const t = transformRef.current;
        const contentX = (e.clientX - rect.left - t.x) / t.scale;
        const contentY = (e.clientY - rect.top - t.y) / t.scale;

        const newX = contentX - ix.dragOffsetX;
        const newY = contentY - ix.dragOffsetY;

        setPositionOverrides((prev) => {
          const next = new Map(prev);
          next.set(ix.dragNodeId, { x: newX, y: newY });
          return next;
        });
        return;
      }

      // ── Idle: update tooltip position ──
      if (tooltipNode) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: e.clientX - rect.left + 14,
            y: e.clientY - rect.top - 10,
          });
        }
      }
    },
    [tooltipNode],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ix = interactionRef.current;

      if (ix.type === "drag") {
        if (!ix.hasMoved) {
          // It was a click, not a drag
          onSelectFacility?.(ix.dragNodeId);
          setPanelNodeId(ix.dragNodeId);
        }
        setDragNodeId(null);
      }

      if (ix.type === "pan") {
        setIsPanning(false);
      }

      interactionRef.current = {
        ...interactionRef.current,
        type: "idle",
      };

      try {
        containerRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture was already released
      }
    },
    [onSelectFacility],
  );

  // ═══════════════════════════════════════════════════════════════
  // EXISTING HANDLERS (adapted)
  // ═══════════════════════════════════════════════════════════════

  const handleNodeHover = useCallback(
    (node: SpatialNode, e: React.MouseEvent) => {
      if (isPanning || dragNodeId) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltipNode(node);
      setTooltipPos({
        x: e.clientX - rect.left + 14,
        y: e.clientY - rect.top - 10,
      });
    },
    [isPanning, dragNodeId],
  );

  const handleNodeLeave = useCallback(() => {
    setTooltipNode(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelNodeId(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: EMPTY GRAPH
  // ═══════════════════════════════════════════════════════════════

  if (graph.nodes.length === 0) {
    return (
      <div className="glass-fac-graph glass-fac-graph--empty">
        <div className="glass-fac-graph__empty">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="32"
            height="32"
          >
            <circle cx="12" cy="12" r="2" />
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
          <p className="glass-fac-graph__empty-text">
            El grafo espacial se construye cuando hay instalaciones con
            actividad registrada.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: FULL GRAPH
  // ═══════════════════════════════════════════════════════════════

  const zoomPercent = Math.round(transform.scale * 100);

  return (
    <div
      className="glass-fac-graph"
      ref={containerRef}
      data-mode={ambientMode}
      data-interaction={interactionLabel}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg
        className="glass-fac-graph__canvas"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        aria-label="Grafo espacial de instalaciones"
      >
        {/* ── World group (pan + zoom transform) ── */}
        <g
          className="glass-fac-graph__world"
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* ── Cluster backgrounds ── */}
          {graph.clusters.map((cluster) => {
            const clusterNodes = cluster.facility_ids
              .map((id) => getEffectivePosition(id))
              .filter(Boolean) as NodePosition[];
            if (clusterNodes.length < 2) return null;
            const xs = clusterNodes.map((p) => p.x);
            const ys = clusterNodes.map((p) => p.y);
            const padding = 40;
            const minX = Math.min(...xs) - padding;
            const minY = Math.min(...ys) - padding;
            const maxX = Math.max(...xs) + padding;
            const maxY = Math.max(...ys) + padding;
            return (
              <rect
                key={`cluster-${cluster.cluster_id}`}
                className="glass-fac-graph__cluster"
                x={minX}
                y={minY}
                width={maxX - minX}
                height={maxY - minY}
                rx={16}
              />
            );
          })}

          {/* ── Edges ── */}
          <g className="glass-fac-graph__edges">
            {graph.edges.map((edge) => {
              const fromPos = getEffectivePosition(edge.from_id);
              const toPos = getEffectivePosition(edge.to_id);
              if (!fromPos || !toPos) return null;

              const strokeWidth = Math.max(
                1,
                (edge.correlation_score / maxCorr) * 4,
              );
              const pathId = `fac-edge-path-${edge.from_id}-${edge.to_id}`;
              const isHighlighted =
                edge.from_id === selectedFacilityId ||
                edge.to_id === selectedFacilityId;
              const edgeColor =
                EDGE_TYPE_COLORS[edge.edge_type] ?? "var(--color-silver-500)";

              return (
                <g key={`edge-${edge.from_id}-${edge.to_id}`}>
                  <path
                    id={pathId}
                    className="glass-fac-graph__edge"
                    data-edge-type={edge.edge_type}
                    data-highlighted={isHighlighted ? "true" : undefined}
                    d={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`}
                    strokeWidth={strokeWidth}
                    stroke={edgeColor}
                  />
                  {getParticlesForEdge(edge, prefersReduced)}
                </g>
              );
            })}
          </g>

          {/* ── Nodes ── */}
          <g className="glass-fac-graph__nodes">
            {graph.nodes.map((node, nodeIndex) => {
              const pos = getEffectivePosition(node.facility_id);
              if (!pos) return null;

              const radius = computeNodeRadius(node, graph.nodes);
              const isSelected = node.facility_id === selectedFacilityId;
              const isBottleneck = graph.bottlenecks.some(
                (b) => b.facility_id === node.facility_id,
              );
              const isDraggingThis = dragNodeId === node.facility_id;
              const comfort = comfortScores[node.facility_id];
              const occPct =
                node.max_capacity > 0
                  ? Math.round(
                      (node.current_occupancy / node.max_capacity) * 100,
                    )
                  : 0;

              return (
                <g
                  key={node.facility_id}
                  className="glass-fac-graph__node"
                  data-node-id={node.facility_id}
                  data-selected={isSelected ? "true" : undefined}
                  data-bottleneck={isBottleneck ? "true" : undefined}
                  data-dragging={isDraggingThis ? "true" : undefined}
                  data-crowd={node.crowd_level}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={(e) => handleNodeHover(node, e)}
                  onMouseLeave={handleNodeLeave}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.facility_name}: ${occPct}% occupancy, ${node.crowd_level}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectFacility?.(node.facility_id);
                      setPanelNodeId(node.facility_id);
                    }
                  }}
                  style={
                    prefersReduced
                      ? undefined
                      : ({ "--stagger-i": nodeIndex } as React.CSSProperties)
                  }
                >
                  {/* Bottleneck ring */}
                  {isBottleneck && (
                    <circle
                      className="glass-fac-graph__node-bottleneck-ring"
                      r={radius + 10}
                    />
                  )}

                  {/* Crowd color ring */}
                  <circle
                    className="glass-fac-graph__node-ring"
                    r={radius + 4}
                    stroke={CROWD_COLORS[node.crowd_level]}
                  />

                  {/* Node background */}
                  <circle
                    className="glass-fac-graph__node-bg"
                    r={radius}
                    fill={CROWD_COLORS[node.crowd_level]}
                  />

                  {/* Name */}
                  <text className="glass-fac-graph__node-name" y={-4}>
                    {node.facility_name.length > 14
                      ? node.facility_name.slice(0, 12) + "…"
                      : node.facility_name}
                  </text>

                  {/* Occupancy */}
                  <text className="glass-fac-graph__node-occupancy" y={10}>
                    {occPct}%
                  </text>

                  {/* Comfort dot */}
                  {comfort && (
                    <circle
                      className="glass-fac-graph__node-comfort-dot"
                      cx={radius - 2}
                      cy={-(radius - 2)}
                      r={4}
                      fill={
                        comfort.overall > 70
                          ? "var(--color-emerald-400)"
                          : comfort.overall > 40
                            ? "var(--color-amber-400)"
                            : "var(--color-rose-400)"
                      }
                    />
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* ── Tooltip ── */}
      <div
        className="glass-fac-graph__tooltip"
        data-visible={tooltipNode !== null ? "true" : undefined}
        style={{ left: tooltipPos.x, top: tooltipPos.y }}
        role="tooltip"
      >
        {tooltipNode && (
          <>
            <div className="glass-fac-graph__tooltip-name">
              {tooltipNode.facility_name}
            </div>
            <div className="glass-fac-graph__tooltip-row">
              <span className="glass-fac-graph__tooltip-label">Ocupación</span>
              <span className="glass-fac-graph__tooltip-value">
                {tooltipNode.max_capacity > 0
                  ? `${Math.round((tooltipNode.current_occupancy / tooltipNode.max_capacity) * 100)}%`
                  : "N/A"}
              </span>
            </div>
            <div className="glass-fac-graph__tooltip-row">
              <span className="glass-fac-graph__tooltip-label">Crowd</span>
              <span
                className="glass-fac-graph__tooltip-value"
                data-crowd={tooltipNode.crowd_level}
              >
                {tooltipNode.crowd_level}
              </span>
            </div>
            <div className="glass-fac-graph__tooltip-row">
              <span className="glass-fac-graph__tooltip-label">Comfort</span>
              <span className="glass-fac-graph__tooltip-value">
                {comfortScores[tooltipNode.facility_id]?.overall ?? "—"}
              </span>
            </div>
            <div className="glass-fac-graph__tooltip-narrative">
              {buildNodeNarrative(
                tooltipNode,
                comfortScores[tooltipNode.facility_id],
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Personality Side Panel ── */}
      {panelNode && (
        <div
          className="glass-fac-graph__panel"
          data-open="true"
          role="dialog"
          aria-label={`Personality: ${panelNode.facility_name}`}
        >
          <Button
            variant="unstyled"
            className="glass-fac-graph__panel-close"
            onClick={handleClosePanel}
            aria-label="Close personality panel"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>

          <div className="glass-fac-graph__panel-header">
            <h3 className="glass-fac-graph__panel-name">
              {panelNode.facility_name}
            </h3>
            <span className="glass-fac-graph__panel-personality-type">
              {panelNode.personality.personality_type}
            </span>
          </div>

          <p className="glass-fac-graph__panel-narrative">{panelNarrative}</p>

          <PersonalityRadarCompact
            personality={panelNode.personality}
            facilityName={panelNode.facility_name}
          />

          {comfortScores[panelNode.facility_id] && (
            <div className="glass-fac-graph__panel-comfort">
              <div className="glass-fac-graph__panel-comfort-label">
                Confort
              </div>
              <div className="glass-fac-graph__panel-comfort-value">
                {comfortScores[panelNode.facility_id].overall}
                <span className="glass-fac-graph__panel-comfort-max">
                  /100
                </span>
              </div>
              <div className="glass-fac-graph__panel-comfort-status">
                {comfortScores[panelNode.facility_id].intervention_needed
                  ? "Intervención requerida"
                  : "Dentro de parámetros"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── I5: Zoom Controls ── */}
      <div className="glass-fac-graph__controls" role="toolbar" aria-label="Controles de navegación">
        <Button
          variant="unstyled"
          type="button"
          className="glass-fac-graph__ctrl-btn"
          onClick={() => zoomTowardCenter(1 + ZOOM_STEP * 2)}
          disabled={transform.scale >= MAX_ZOOM}
          aria-label="Acercar"
          title="Acercar (+)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35M8 11h6M11 8v6" />
          </svg>
        </Button>

        <span className="glass-fac-graph__ctrl-zoom">{zoomPercent}%</span>

        <Button
          variant="unstyled"
          type="button"
          className="glass-fac-graph__ctrl-btn"
          onClick={() => zoomTowardCenter(1 / (1 + ZOOM_STEP * 2))}
          disabled={transform.scale <= MIN_ZOOM}
          aria-label="Alejar"
          title="Alejar (−)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35M8 11h6" />
          </svg>
        </Button>

        <div className="glass-fac-graph__ctrl-divider" />

        <Button
          variant="unstyled"
          type="button"
          className="glass-fac-graph__ctrl-btn"
          onClick={fitToView}
          aria-label="Ajustar a vista"
          title="Ajustar a vista (F)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </Button>

        <Button
          variant="unstyled"
          type="button"
          className="glass-fac-graph__ctrl-btn"
          onClick={resetView}
          aria-label="Resetear vista"
          title="Resetear vista (0)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </Button>

        {positionOverrides.size > 0 && (
          <>
            <div className="glass-fac-graph__ctrl-divider" />
            <Button
              variant="unstyled"
              type="button"
              className="glass-fac-graph__ctrl-btn glass-fac-graph__ctrl-btn--reset-pin"
              onClick={clearOverrides}
              aria-label="Liberar nodos fijados"
              title="Liberar nodos"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span className="glass-fac-graph__ctrl-badge">
                {positionOverrides.size}
              </span>
            </Button>
          </>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="glass-fac-graph__legend">
        <div className="glass-fac-graph__legend-item">
          <span
            className="glass-fac-graph__legend-line"
            style={{ background: "var(--color-teal-400)" }}
          />
          Flujo
        </div>
        <div className="glass-fac-graph__legend-item">
          <span
            className="glass-fac-graph__legend-line"
            style={{ background: "var(--color-emerald-400)" }}
          />
          Sinergia
        </div>
        <div className="glass-fac-graph__legend-item">
          <span
            className="glass-fac-graph__legend-line"
            style={{ background: "var(--color-silver-500)" }}
          />
          Dependencia
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PERSONALITY RADAR COMPACT (unchanged)
// ═══════════════════════════════════════════════════════════════

function PersonalityRadarCompact({
  personality,
}: {
  personality: FacilityPersonality;
  facilityName: string;
}) {
  const cx = 100;
  const cy = 85;
  const maxR = 65;
  const axes = [
    { label: "Actividad", value: personality.activity_level, angle: -90 },
    { label: "Popularidad", value: personality.popularity_score, angle: -30 },
    { label: "Eficiencia", value: personality.efficiency_rating, angle: 30 },
    { label: "Confort", value: personality.comfort_contribution, angle: 90 },
    { label: "Versatilidad", value: personality.versatility_index, angle: 150 },
    { label: "Vitalidad", value: personality.vitality_trend, angle: 210 },
  ];

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const valuePoints = axes
    .map((a) => {
      const rad = (a.angle * Math.PI) / 180;
      const r = (a.value / 100) * maxR;
      return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
    })
    .join(" ");

  const gridPolygons = gridLevels.map((level) =>
    axes
      .map((a) => {
        const rad = (a.angle * Math.PI) / 180;
        const r = level * maxR;
        return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
      })
      .join(" "),
  );

  return (
    <div className="glass-fac-graph__radar">
      <svg viewBox="0 0 200 180" width="100%">
        {gridPolygons.map((points, i) => (
          <polygon
            key={i}
            points={points}
            className="glass-fac-graph__radar-grid"
          />
        ))}

        {axes.map((a) => {
          const rad = (a.angle * Math.PI) / 180;
          const ex = cx + maxR * Math.cos(rad);
          const ey = cy + maxR * Math.sin(rad);
          return (
            <line
              key={a.label}
              x1={cx}
              y1={cy}
              x2={ex}
              y2={ey}
              className="glass-fac-graph__radar-axis"
            />
          );
        })}

        <polygon
          points={valuePoints}
          className="glass-fac-graph__radar-value"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {axes.map((a) => {
          const rad = (a.angle * Math.PI) / 180;
          const r = (a.value / 100) * maxR;
          return (
            <circle
              key={`dot-${a.label}`}
              cx={cx + r * Math.cos(rad)}
              cy={cy + r * Math.sin(rad)}
              r={3}
              className="glass-fac-graph__radar-dot"
            />
          );
        })}

        {axes.map((a) => {
          const rad = (a.angle * Math.PI) / 180;
          const labelR = maxR + 18;
          const lx = cx + labelR * Math.cos(rad);
          const ly = cy + labelR * Math.sin(rad);
          return (
            <g key={`label-${a.label}`}>
              <text
                x={lx}
                y={ly - 4}
                textAnchor="middle"
                className="glass-fac-graph__radar-label-name"
              >
                {a.label}
              </text>
              <text
                x={lx}
                y={ly + 8}
                textAnchor="middle"
                className="glass-fac-graph__radar-label-value"
              >
                {a.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}