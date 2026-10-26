// src/features/families/components/SocialGraph.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Social Graph Visualization
// Level 6+ Agency · Production Grade
//
// Force-directed SVG graph of family connections.
// Center node = this family. Surrounding = connected/suggested.
// Self-contained force simulation (no external dependency).
//
// PRE-WRITE VERIFICATION:
//   SocialBond          → ../social-types.ts §3 ✅
//   SocialMatch         → ../social-types.ts §3 ✅
//   MatchReason         → ../social-types.ts §3 ✅
//   BondProfile         → ../social-types.ts §2 ✅
//   SocialConnection    → ../types.ts §2 ✅ (.relationship field)
//   MemberTier          → ../types.ts §1 ✅
//   TIER_CONFIG         → ../config.ts §2 ✅
//   formatDate          → ../config.ts §6 ✅
//
// ANTI-PATTERNS REMOVED:
//   - EnrichedSocialConnection → SocialBond
//   - SuggestedConnection      → SocialMatch
//   - sug.reason               → sug.reasons[0]?.detail
//   - cn() calls               → data-* attributes
//   - Tailwind utilities       → BEM .fm-socialGraph__*
//   - Inline color styles      → CSS custom property bridges
//   - Inline JSX functions     → data-node-id + single handlers
//   - Mutable props            → readonly
//   - glass-social-graph__*    → fm-socialGraph__*
//   - Missing ARIA             → role, aria-label, desc, tabIndex
//   - Missing data-testid      → added
//   - No § markers             → 3 sections
//
// CHECKLIST B — Intelligence 2027 Visualization:
//   B27-06  Network impact     → edge width = 1 + strength³ (quality²)
//   B27-09  Path connections   → hub topology: center ↔ periphery
//   B27-10  Bridge value       → suggested connections = dashed teal
//   B27-11  Quality-weighted   → opacity = max(0.25, strength²)
//   B27-12  Diversity          → 3 visual tiers: center/connected/suggested
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useRef, useCallback } from "react";
import type { CSSProperties, MouseEvent, FocusEvent } from "react";

import type { SocialBond, SocialMatch } from "../social-types";
import type { MemberTier } from "../types";
import { TIER_CONFIG, formatDate } from "../config";

import "./SocialGraph.css";

// ═══════════════════════════════════════════════════════════
// §1  Local Types
// ═══════════════════════════════════════════════════════════

/** Rich node with full source data for tooltip rendering. */
interface GraphNode {
  readonly id: string;
  readonly name: string;
  readonly tier: MemberTier | "";
  readonly isCenter: boolean;
  readonly isSuggested: boolean;
  readonly bondStrength: number;
  /** Original bond data — present for connected nodes */
  readonly bond?: SocialBond;
  /** Original match data — present for suggested nodes */
  readonly match?: SocialMatch;
}

/** Edge between two nodes. */
interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly strength: number;
  readonly isSuggested: boolean;
}

/** Component props — all readonly. */
interface SocialGraphProps {
  readonly familyId: string;
  readonly familyName: string;
  readonly connections: readonly SocialBond[];
  readonly suggestedConnections: readonly SocialMatch[];
  readonly onNodeClick: (id: string) => void;
}

/** Internal simulation node for force layout. */
interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCenter: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2  Force-Directed Layout Engine
// ═══════════════════════════════════════════════════════════

const SVG_W = 800;
const SVG_H = 500;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const R_CENTER = 28;
const R_CONNECTED = 20;
const R_SUGGESTED = 16;
const MAX_VISIBLE = 25;
const SIM_ITERATIONS = 160;

/**
 * Compute force-directed layout positions for all nodes.
 * Deterministic given the same input order.
 */
function computeLayout(
  graphNodes: readonly GraphNode[],
  graphEdges: readonly GraphEdge[],
): Map<string, { readonly x: number; readonly y: number }> {
  if (graphNodes.length === 0) return new Map();

  // Initialize simulation nodes
  const sims: SimNode[] = graphNodes.map((gn, i) => {
    if (gn.isCenter) {
      return { id: gn.id, x: CX, y: CY, vx: 0, vy: 0, radius: R_CENTER, isCenter: true };
    }
    const nonCenterCount = graphNodes.filter((_, j) => j < i && !graphNodes[j].isCenter).length;
    const totalNonCenter = graphNodes.length - 1;
    const angle = (2 * Math.PI * nonCenterCount) / Math.max(totalNonCenter, 1) - Math.PI / 2;
    const ring = gn.isSuggested ? 0.38 : 0.28;
    const r = Math.min(SVG_W, SVG_H) * ring;
    return {
      id: gn.id,
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle),
      vx: 0,
      vy: 0,
      radius: gn.isSuggested ? R_SUGGESTED : R_CONNECTED,
      isCenter: false,
    };
  });

  // Build edge lookup
  const simMap = new Map(sims.map((s) => [s.id, s]));
  const simEdges = graphEdges
    .map((e) => ({
      src: simMap.get(e.source),
      tgt: simMap.get(e.target),
      str: e.strength,
      sug: e.isSuggested,
    }))
    .filter((e) => e.src && e.tgt) as Array<{
    src: SimNode;
    tgt: SimNode;
    str: number;
    sug: boolean;
  }>;

  // Simulation loop
  for (let iter = 0; iter < SIM_ITERATIONS; iter++) {
    const alpha = Math.max(0.001, 1 - iter / SIM_ITERATIONS);

    // Center gravity
    for (const n of sims) {
      if (n.isCenter) continue;
      n.vx += (CX - n.x) * 0.004 * alpha;
      n.vy += (CY - n.y) * 0.004 * alpha;
    }

    // Pairwise repulsion + collision
    for (let i = 0; i < sims.length; i++) {
      for (let j = i + 1; j < sims.length; j++) {
        const a = sims[i];
        const b = sims[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);
        const minDist = a.radius + b.radius + 12;
        const repulsion = (2200 * alpha) / distSq;
        const rx = (dx / dist) * repulsion;
        const ry = (dy / dist) * repulsion;
        if (!a.isCenter) { a.vx -= rx; a.vy -= ry; }
        if (!b.isCenter) { b.vx += rx; b.vy += ry; }
        if (dist < minDist) {
          const push = (minDist - dist) * 0.4 * alpha;
          const px = (dx / dist) * push;
          const py = (dy / dist) * push;
          if (!a.isCenter) { a.x -= px; a.y -= py; }
          if (!b.isCenter) { b.x += px; b.y += py; }
        }
      }
    }

    // Link spring
    for (const e of simEdges) {
      if (e.src.isCenter && e.tgt.isCenter) continue;
      const dx = e.tgt.x - e.src.x;
      const dy = e.tgt.y - e.src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = e.sug ? 170 : 100 / Math.max(e.str, 0.15);
      const spring = (dist - target) * 0.012 * alpha;
      const fx = (dx / dist) * spring;
      const fy = (dy / dist) * spring;
      if (!e.src.isCenter) { e.src.vx += fx; e.src.vy += fy; }
      if (!e.tgt.isCenter) { e.tgt.vx -= fx; e.tgt.vy -= fy; }
    }

    // Integrate velocity with damping
    for (const n of sims) {
      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(n.radius + 30, Math.min(SVG_W - n.radius - 30, n.x));
      n.y = Math.max(n.radius + 30, Math.min(SVG_H - n.radius - 30, n.y));
    }
  }

  const positions = new Map<string, { readonly x: number; readonly y: number }>();
  for (const n of sims) {
    positions.set(n.id, { x: n.x, y: n.y });
  }
  return positions;
}

/**
 * Get TIER_CONFIG color for a member tier.
 * Returns fallback silver for empty/unknown.
 */
function tierColor(tier: MemberTier | ""): string {
  if (!tier || !(tier in TIER_CONFIG)) return "var(--color-silver-400)";
  return TIER_CONFIG[tier as MemberTier].color;
}

// ═══════════════════════════════════════════════════════════
// §3  SocialGraph Component
// ═══════════════════════════════════════════════════════════

/**
 * SocialGraph — force-directed family connection visualization.
 *
 * Renders an SVG graph with:
 *   - Center node: this family (gold)
 *   - Connected nodes: existing bonds (tier-colored, solid edges)
 *   - Suggested nodes: AI matches (teal, dashed edges)
 *   - Tooltip: full bond/match details on hover/focus
 *   - Network health badge
 *   - Legend
 *
 * Edge thickness and opacity encode bond strength using
 * quality-weighted (non-linear) mapping for B-2027 compliance.
 *
 * @example
 * <SocialGraph
 *   familyId="fam-001"
 *   familyName="Familia Rodríguez"
 *   connections={bonds}
 *   suggestedConnections={matches}
 *   onNodeClick={(id) => navigate(`/admin/families/${id}`)}
 * />
 */
export function SocialGraph({
  familyId,
  familyName,
  connections,
  suggestedConnections,
  onNodeClick,
}: SocialGraphProps) {
  // ── State ──
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // ── Refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Graph computation (B-07) ──
  const graphData = useMemo(() => {
    const visible = connections.slice(0, MAX_VISIBLE);
    const hiddenCount = connections.length - visible.length;
    const connIds = new Set(visible.map((c) => c.connectedFamilyId));

    const center: GraphNode = {
      id: familyId,
      name: familyName,
      tier: "",
      isCenter: true,
      isSuggested: false,
      bondStrength: 1,
    };

    const connNodes: GraphNode[] = visible.map((c) => ({
      id: c.connectedFamilyId,
      name: c.connectedFamilyName,
      tier: c.connectedTier,
      isCenter: false,
      isSuggested: false,
      bondStrength: c.strength,
      bond: c,
    }));

    const sugNodes: GraphNode[] = suggestedConnections
      .filter((s) => !connIds.has(s.familyId))
      .map((s) => ({
        id: s.familyId,
        name: s.familyName,
        tier: s.tier,
        isCenter: false,
        isSuggested: true,
        bondStrength: s.matchScore,
        match: s,
      }));

    const nodes = [center, ...connNodes, ...sugNodes];

    const connEdges: GraphEdge[] = visible.map((c) => ({
      source: familyId,
      target: c.connectedFamilyId,
      strength: c.strength,
      isSuggested: false,
    }));

    const sugEdges: GraphEdge[] = suggestedConnections
      .filter((s) => !connIds.has(s.familyId))
      .map((s) => ({
        source: familyId,
        target: s.familyId,
        strength: s.matchScore,
        isSuggested: true,
      }));

    const edges = [...connEdges, ...sugEdges];
    const positions = computeLayout(nodes, edges);

    return { nodes, edges, positions, hiddenCount };
  }, [familyId, familyName, connections, suggestedConnections]);

  // ── Node lookup map for O(1) tooltip data ──
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of graphData.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [graphData.nodes]);

  // ── Hovered node (from map) ──
  const hoveredNode = useMemo(
    () => (hoveredId ? nodeMap.get(hoveredId) ?? null : null),
    [hoveredId, nodeMap],
  );

  // ── Connected-to-hovered set (for dimming unrelated) ──
  const connectedToHovered = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>([hoveredId]);
    for (const e of graphData.edges) {
      if (e.source === hoveredId) set.add(e.target);
      if (e.target === hoveredId) set.add(e.source);
    }
    return set;
  }, [hoveredId, graphData.edges]);

  // ── Network health summary (B-2027) ──
  const networkHealth = useMemo(() => {
    if (connections.length === 0) return { count: 0, avgPct: 0, label: "Sin datos" };
    const avg = connections.reduce((sum, c) => sum + c.strength, 0) / connections.length;
    const avgPct = Math.round(avg * 100);
    const label = avgPct >= 70 ? "Fuerte" : avgPct >= 40 ? "Moderada" : "Débil";
    return { count: connections.length, avgPct, label };
  }, [connections]);

  // ── Position helpers ──
  const getPos = useCallback(
    (id: string) => graphData.positions.get(id) ?? { x: CX, y: CY },
    [graphData.positions],
  );

  // ── Mouse handlers (B-08, G-11) ──
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 8 });
    }
  }, []);

  // ── Node interaction handlers (G-13: data-node-id pattern) ──
  const handleNodeMouseEnter = useCallback((e: MouseEvent<SVGGElement>) => {
    const nodeId = e.currentTarget.getAttribute("data-node-id");
    if (nodeId) setHoveredId(nodeId);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleNodeClick = useCallback((e: MouseEvent<SVGGElement>) => {
    const nodeId = e.currentTarget.getAttribute("data-node-id");
    if (nodeId) onNodeClick(nodeId);
  }, [onNodeClick]);

  const handleNodeKeyDown = useCallback((e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const nodeId = e.currentTarget.getAttribute("data-node-id");
      if (nodeId) onNodeClick(nodeId);
    }
  }, [onNodeClick]);

  // ── Focus handler for keyboard tooltip (H-04) ──
  const handleNodeFocus = useCallback((e: FocusEvent<SVGGElement>) => {
    const nodeId = e.currentTarget.getAttribute("data-node-id");
    if (!nodeId) return;
    setHoveredId(nodeId);
    // Compute tooltip position from SVG coordinates
    const pos = graphData.positions.get(nodeId);
    const svg = svgRef.current;
    const container = containerRef.current;
    if (pos && svg && container) {
      const svgRect = svg.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scaleX = svgRect.width / SVG_W;
      const scaleY = svgRect.height / SVG_H;
      setTooltipPos({
        x: svgRect.left - containerRect.left + pos.x * scaleX + 12,
        y: svgRect.top - containerRect.top + pos.y * scaleY - 8,
      });
    }
  }, [graphData.positions]);

  const handleNodeBlur = useCallback(() => {
    setHoveredId(null);
  }, []);

  // ── Empty state (G-08) ──
  if (graphData.nodes.length <= 1) {
    return (
      <div
        className="fm-socialGraph"
        ref={containerRef}
        data-testid="social-graph"
        role="region"
        aria-label={`Grafo social de ${familyName}: sin conexiones`}
      >
        <div className="fm-socialGraph__header">
          <h3 className="fm-socialGraph__title">Mapa Social</h3>
          <p className="fm-socialGraph__subtitle">Sin conexiones registradas</p>
        </div>
      </div>
    );
  }

  // ── Tooltip visibility ──
  const showTooltip = hoveredNode !== null
    && !hoveredNode.isCenter
    && tooltipPos !== null;

  // ── Render ──
  return (
    <div
      className="fm-socialGraph"
      ref={containerRef}
      data-testid="social-graph"
      role="region"
      aria-label={`Grafo social de ${familyName}: ${connections.length} conexiones, ${suggestedConnections.length} sugeridas`}
      onMouseMove={handleMouseMove}
    >
      {/* ══════ Health Badge (§8) ══════ */}
      <div className="fm-socialGraph__health" aria-label={`Salud de red: ${networkHealth.label}`}>
        <span className="fm-socialGraph__health-score">{networkHealth.avgPct}%</span>
        <span>{networkHealth.label}</span>
      </div>

      {/* ══════ Header (§1) ══════ */}
      <div className="fm-socialGraph__header">
        <h3 className="fm-socialGraph__title">Mapa Social</h3>
        <p className="fm-socialGraph__subtitle">
          {connections.length} conexión{connections.length !== 1 ? "es" : ""}
          {suggestedConnections.length > 0 && (
            <> · {suggestedConnections.length} sugerida{suggestedConnections.length !== 1 ? "s" : ""}</>
          )}
        </p>
      </div>

      {/* ══════ SVG Canvas (§2) ══════ */}
      <svg
        ref={svgRef}
        className="fm-socialGraph__canvas"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Visualización de conexiones de ${familyName}`}
      >
        <title>Grafo social de {familyName}</title>
        <desc>
          Grafo de conexiones sociales con {connections.length} familias
          conectadas y {suggestedConnections.length} conexiones sugeridas por IA.
        </desc>

        {/* ── Edges (§4) ── */}
        <g className="fm-socialGraph__edges" aria-hidden="true">
          {graphData.edges.map((edge) => {
            const s = getPos(edge.source);
            const t = getPos(edge.target);
            const key = `${edge.source}-${edge.target}`;
            const highlighted = hoveredId !== null
              && (edge.source === hoveredId || edge.target === hoveredId);
            const dimmed = hoveredId !== null && !highlighted;

            // B27-11: Quality-weighted — non-linear opacity and width
            const strengthSq = edge.strength * edge.strength;

            return (
              <line
                key={key}
                className="fm-socialGraph__edge"
                data-suggested={edge.isSuggested || undefined}
                data-highlighted={highlighted || undefined}
                data-dimmed={dimmed || undefined}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                style={
                  {
                    "--sg-edge-opacity": Math.max(0.25, strengthSq),
                    "--sg-edge-width": 1 + strengthSq * 3,
                  } as CSSProperties
                }
              />
            );
          })}
        </g>

        {/* ── Nodes (§5) ── */}
        <g className="fm-socialGraph__nodes">
          {graphData.nodes.map((node) => {
            const pos = getPos(node.id);
            const r = node.isCenter
              ? R_CENTER
              : node.isSuggested
                ? R_SUGGESTED
                : R_CONNECTED;
            const isHovered = hoveredId === node.id;
            const dimmed = hoveredId !== null && !connectedToHovered.has(node.id);
            const color = node.isCenter ? "var(--color-gold-400)" : tierColor(node.tier);

            return (
              <g
                key={node.id}
                className="fm-socialGraph__node"
                data-node-id={node.id}
                data-center={node.isCenter || undefined}
                data-suggested={node.isSuggested || undefined}
                data-hovered={isHovered || undefined}
                data-dimmed={dimmed || undefined}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ "--sg-node-color": color } as CSSProperties}
                tabIndex={node.isCenter ? undefined : 0}
                role={node.isCenter ? undefined : "button"}
                aria-label={
                  node.isCenter
                    ? undefined
                    : node.bond
                      ? `${node.name}, fortaleza ${Math.round(node.bond.strength * 100)}%`
                      : node.match
                        ? `${node.name}, match ${Math.round(node.match.matchScore * 100)}%`
                        : node.name
                }
                onMouseEnter={handleNodeMouseEnter}
                onMouseLeave={handleNodeMouseLeave}
                onClick={node.isCenter ? undefined : handleNodeClick}
                onKeyDown={node.isCenter ? undefined : handleNodeKeyDown}
                onFocus={node.isCenter ? undefined : handleNodeFocus}
                onBlur={node.isCenter ? undefined : handleNodeBlur}
              >
                <circle className="fm-socialGraph__node-circle" r={r} />
                <text
                  className="fm-socialGraph__node-initial"
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                  fontSize={node.isCenter ? 14 : 11}
                >
                  {node.name.charAt(0)}
                </text>
                <text
                  className="fm-socialGraph__node-label"
                  textAnchor="middle"
                  y={r + 14}
                  aria-hidden="true"
                >
                  {node.name.length > 18 ? `${node.name.slice(0, 17)}…` : node.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* ── Hidden count ── */}
        {graphData.hiddenCount > 0 && (
          <text
            className="fm-socialGraph__more-label"
            x={CX}
            y={SVG_H - 16}
            textAnchor="middle"
            aria-hidden="true"
          >
            +{graphData.hiddenCount} conexión{graphData.hiddenCount !== 1 ? "es" : ""} más
          </text>
        )}
      </svg>

      {/* ══════ Tooltip (§3) ══════ */}
      {showTooltip && tooltipPos && (
        <div
          className="fm-socialGraph__tooltip"
          role="tooltip"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` } as CSSProperties}
        >
          {/* Name + tier */}
          <div className="fm-socialGraph__tooltip-name">
            <span
              className="fm-socialGraph__tooltip-tier-dot"
              style={
                {
                  "--sg-tooltip-tier-color": tierColor(hoveredNode.tier),
                } as CSSProperties
              }
            />
            <span className="fm-socialGraph__tooltip-label">{hoveredNode.name}</span>
            {hoveredNode.tier && (
              <span className="fm-socialGraph__tooltip-badge">
                {TIER_CONFIG[hoveredNode.tier as MemberTier]?.label ?? hoveredNode.tier}
              </span>
            )}
          </div>

          {/* Bond details */}
          {hoveredNode.bond && (
            <>
              <p className="fm-socialGraph__tooltip-relationship">
                {hoveredNode.bond.relationship}
              </p>

              <div className="fm-socialGraph__tooltip-strength">
                <span className="fm-socialGraph__tooltip-strength-label">Fortaleza</span>
                <div className="fm-socialGraph__tooltip-strength-bar">
                  <div
                    className="fm-socialGraph__tooltip-strength-fill"
                    data-level={
                      hoveredNode.bond.strength > 0.7 ? "strong"
                      : hoveredNode.bond.strength > 0.4 ? "medium"
                      : "weak"
                    }
                    style={
                      {
                        "--sg-tooltip-strength-pct": `${Math.round(hoveredNode.bond.strength * 100)}%`,
                      } as CSSProperties
                    }
                  />
                </div>
                <span className="fm-socialGraph__tooltip-strength-value">
                  {Math.round(hoveredNode.bond.strength * 100)}%
                </span>
              </div>

              {hoveredNode.bond.sharedActivities.length > 0 && (
                <div className="fm-socialGraph__tooltip-activities">
                  {hoveredNode.bond.sharedActivities.slice(0, 4).map((a) => (
                    <span key={a} className="fm-socialGraph__tooltip-activity">{a}</span>
                  ))}
                </div>
              )}

              {hoveredNode.bond.lastInteraction && (
                <p className="fm-socialGraph__tooltip-relationship" style={{ marginTop: 4 } as CSSProperties}>
                  Última: {formatDate(hoveredNode.bond.lastInteraction)}
                </p>
              )}

              {hoveredNode.bond.aiInsight && (
                <p className="fm-socialGraph__tooltip-insight">
                  {hoveredNode.bond.aiInsight}
                </p>
              )}
            </>
          )}

          {/* Match details */}
          {hoveredNode.match && (
            <>
              <div className="fm-socialGraph__tooltip-strength">
                <span className="fm-socialGraph__tooltip-strength-label">Match</span>
                <div className="fm-socialGraph__tooltip-strength-bar">
                  <div
                    className="fm-socialGraph__tooltip-strength-fill"
                    data-level={
                      hoveredNode.match.matchScore > 0.7 ? "strong"
                      : hoveredNode.match.matchScore > 0.4 ? "medium"
                      : "weak"
                    }
                    style={
                      {
                        "--sg-tooltip-strength-pct": `${Math.round(hoveredNode.match.matchScore * 100)}%`,
                      } as CSSProperties
                    }
                  />
                </div>
                <span className="fm-socialGraph__tooltip-strength-value">
                  {Math.round(hoveredNode.match.matchScore * 100)}%
                </span>
              </div>

              {hoveredNode.match.suggestedActivity && (
                <p className="fm-socialGraph__tooltip-relationship">
                  Sugerencia: {hoveredNode.match.suggestedActivity}
                </p>
              )}

              {hoveredNode.match.reasons.length > 0 && (
                <p className="fm-socialGraph__tooltip-insight">
                  {hoveredNode.match.reasons[0].detail}
                </p>
              )}

              {hoveredNode.match.bridgeFamilyName && (
                <p className="fm-socialGraph__tooltip-relationship" style={{ marginTop: 4 } as CSSProperties}>
                  Puente: {hoveredNode.match.bridgeFamilyName}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ Legend (§7) ══════ */}
      <div className="fm-socialGraph__legend" aria-hidden="true">
        <div className="fm-socialGraph__legend-item">
          <span className="fm-socialGraph__legend-dot" data-type="center" />
          <span>{familyName}</span>
        </div>
        <div className="fm-socialGraph__legend-item">
          <span className="fm-socialGraph__legend-dot" data-type="connected" />
          <span>Conectado</span>
        </div>
        <div className="fm-socialGraph__legend-item">
          <span className="fm-socialGraph__legend-dot" data-type="suggested" />
          <span>Sugerido (AI)</span>
        </div>
      </div>
    </div>
  );
}