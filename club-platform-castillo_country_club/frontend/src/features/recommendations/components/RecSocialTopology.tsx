// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Social Topology (2027 NEW)
//
// "The Constellation" — SVG force-directed graph of social clusters.
//
// Layout: Simplified force simulation (no external deps).
//   - Repulsion between all nodes (Coulomb)
//   - Attraction along connections (Hooke)
//   - Center gravity to prevent drift
//   - Fixed iterations for deterministic layout
//
// Cluster nodes: sized by family count, colored by cluster_type.
// Connections: lines with opacity by overlap_strength.
// Opportunity nodes: appear at edge midpoints where clusters overlap.
// Hover: detail card with interests, engagement, opportunities.
//
// Glass namespace: .glass-rst
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Users,
  TrendingUp,
  Link2,
  Target
} from "lucide-react";

import type { SocialCluster } from "../types";
import {
  CLUSTER_TYPE_CONFIG
} from "../types";

import "./RecSocialTopology.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface RecSocialTopologyProps {
  clusters: SocialCluster[];
  reducedMotion: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SVG CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const SVG_SIZE = 360;
const CENTER = SVG_SIZE / 2;
const NODE_MIN_RADIUS = 18;
const NODE_MAX_RADIUS = 38;

// ═══════════════════════════════════════════════════════════════════════
// FORCE SIMULATION — Simplified, deterministic, no external deps
// ═══════════════════════════════════════════════════════════════════════

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  cluster: SocialCluster;
}

interface SimEdge {
  from: string;
  to: string;
  strength: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function runForceSimulation(
  clusters: SocialCluster[],
  iterations: number = 120,
): { nodes: SimNode[]; edges: SimEdge[] } {
  if (clusters.length === 0) return { nodes: [], edges: [] };

  // Size range for normalization
  const sizes = clusters.map((c) => c.size);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const sizeRange = Math.max(1, maxSize - minSize);

  // Initialize nodes in a circle
  const nodes: SimNode[] = clusters.map((cluster, idx) => {
    const angle = (2 * Math.PI * idx) / clusters.length;
    const initRadius = 80 + Math.random() * 40;
    const normalizedSize = (cluster.size - minSize) / sizeRange;
    const nodeRadius =
      NODE_MIN_RADIUS + normalizedSize * (NODE_MAX_RADIUS - NODE_MIN_RADIUS);

    return {
      id: cluster.id,
      x: CENTER + initRadius * Math.cos(angle),
      y: CENTER + initRadius * Math.sin(angle),
      vx: 0,
      vy: 0,
      radius: nodeRadius,
      cluster,
    };
  });

  // Build edges from connections
  const edges: SimEdge[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const cluster of clusters) {
    if (!cluster.connections) continue;
    for (const conn of cluster.connections) {
      // Avoid duplicate edges
      const edgeKey = [cluster.id, conn.cluster_id].sort().join("↔");
      const alreadyExists = edges.some(
        (e) =>
          [e.from, e.to].sort().join("↔") === edgeKey,
      );
      if (!alreadyExists && nodeMap.has(conn.cluster_id)) {
        edges.push({
          from: cluster.id,
          to: conn.cluster_id,
          strength: conn.overlap_strength,
        });
      }
    }
  }

  // If no connections defined, create proximity-based edges
  if (edges.length === 0 && clusters.length > 1) {
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        // Connect clusters of same type or with shared interests
        const sameType = clusters[i].cluster_type === clusters[j].cluster_type;
        const sharedInterests = clusters[i].shared_interests.filter((interest) =>
          clusters[j].shared_interests.includes(interest),
        );
        if (sameType || sharedInterests.length > 0) {
          edges.push({
            from: clusters[i].id,
            to: clusters[j].id,
            strength: sameType ? 0.6 : 0.3 + sharedInterests.length * 0.1,
          });
        }
      }
    }
  }

  // Run simulation
  const REPULSION = 2500;
  const ATTRACTION = 0.008;
  const CENTER_GRAVITY = 0.01;
  const DAMPING = 0.85;
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations; // Cooling

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.max(distance(a, b), 1);
        const minSep = a.radius + b.radius + 20;

        if (dist < minSep * 3) {
          const force = (REPULSION * alpha) / (dist * dist);
          const dx = (a.x - b.x) / dist;
          const dy = (a.y - b.y) / dist;
          a.vx += dx * force;
          a.vy += dy * force;
          b.vx -= dx * force;
          b.vy -= dy * force;
        }
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.from);
      const b = nodeMap.get(edge.to);
      if (!a || !b) continue;

      const dist = distance(a, b);
      const idealDist = 120 + (1 - edge.strength) * 60;
      const force = (dist - idealDist) * ATTRACTION * edge.strength * alpha;

      const dx = (b.x - a.x) / Math.max(dist, 1);
      const dy = (b.y - a.y) / Math.max(dist, 1);
      a.vx += dx * force;
      a.vy += dy * force;
      b.vx -= dx * force;
      b.vy -= dy * force;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (CENTER - node.x) * CENTER_GRAVITY * alpha;
      node.vy += (CENTER - node.y) * CENTER_GRAVITY * alpha;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;

      // Keep within bounds
      const margin = node.radius + 10;
      node.x = clamp(node.x, margin, SVG_SIZE - margin);
      node.y = clamp(node.y, margin, SVG_SIZE - margin);
    }
  }

  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecSocialTopology({
  clusters,
  reducedMotion,
  className,
}: RecSocialTopologyProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Run force simulation ────────────────────────────────────────────
  const { nodes, edges } = useMemo(
    () => runForceSimulation(clusters, reducedMotion ? 30 : 120),
    [clusters, reducedMotion],
  );

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  // ── Hovered cluster data ────────────────────────────────────────────
  const hoveredCluster = useMemo(
    () => clusters.find((c) => c.id === hoveredId) ?? null,
    [clusters, hoveredId],
  );

  // ── Hover handler ───────────────────────────────────────────────────
  const handleNodeHover = useCallback(
    (id: string, cx: number, cy: number) => {
      setHoveredId(id);
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = rect.width / SVG_SIZE;
        const scaleY = rect.height / SVG_SIZE;
        setTooltipPos({
          x: rect.left + cx * scaleX,
          y: rect.top + cy * scaleY,
        });
      }
    },
    [],
  );

  const handleNodeLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────
  if (clusters.length === 0) {
    return (
      <div className={`glass-rst ${className ?? ""}`} data-empty>
        <div className="rst-header">
          <Users size={16} aria-hidden="true" className="rst-header-icon" />
          <span className="rst-header-title">Topología Social</span>
        </div>
        <div className="rst-empty">
          <Users size={32} aria-hidden="true" className="rst-empty-icon" />
          <p className="rst-empty-text">
            Sin clusters sociales disponibles. El sistema necesita datos de
            familias y sus interacciones para mapear la topología.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-rst ${className ?? ""}`}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="rst-header">
        <Users size={16} aria-hidden="true" className="rst-header-icon" />
        <span className="rst-header-title">Topología Social</span>
        <span className="rst-header-count">{clusters.length} clusters</span>
      </div>

      {/* ── SVG Graph ─────────────────────────────────────────────────── */}
      <div className="rst-graph-container">
        <svg
          ref={svgRef}
          className="rst-graph-svg"
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          role="img"
          aria-label={`Grafo social con ${clusters.length} clusters`}
        >
          {/* ── Edges (connections) ─────────────────────────────────────── */}
          {edges.map((edge, idx) => {
            const a = nodeMap.get(edge.from);
            const b = nodeMap.get(edge.to);
            if (!a || !b) return null;

            return (
              <line
                key={`edge-${idx}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="rst-edge"
                style={
                  {
                    "--edge-opacity": Math.max(0.1, edge.strength * 0.5),
                    "--stagger-i": idx,
                  } as React.CSSProperties
                }
              />
            );
          })}

          {/* ── Opportunity blips at edge midpoints ─────────────────────── */}
          {edges
            .filter((e) => e.strength > 0.5)
            .map((edge, idx) => {
              const a = nodeMap.get(edge.from);
              const b = nodeMap.get(edge.to);
              if (!a || !b) return null;
              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2;

              return (
                <circle
                  key={`blip-${idx}`}
                  cx={midX}
                  cy={midY}
                  r={3 + edge.strength * 3}
                  className="rst-blip"
                  style={
                    {
                      "--stagger-i": idx + edges.length,
                    } as React.CSSProperties
                  }
                />
              );
            })}

          {/* ── Cluster nodes ───────────────────────────────────────────── */}
          {nodes.map((node, idx) => {
            const config = CLUSTER_TYPE_CONFIG[node.cluster.cluster_type];
            const isHovered = hoveredId === node.id;
            const engagement = node.cluster.avg_engagement;

            return (
              <g
                key={node.id}
                className="rst-node"
                data-cluster-type={node.cluster.cluster_type}
                data-hovered={isHovered ? "" : undefined}
                data-engagement={
                  engagement >= 70
                    ? "high"
                    : engagement >= 40
                      ? "medium"
                      : "low"
                }
                style={
                  {
                    "--stagger-i": idx,
                    "--node-color": config?.glowColor ?? "var(--color-silver-400)",
                  } as React.CSSProperties
                }
                onMouseEnter={() => handleNodeHover(node.id, node.x, node.y)}
                onMouseLeave={handleNodeLeave}
                role="button"
                tabIndex={0}
                aria-label={`${node.cluster.name}: ${node.cluster.size} familias, engagement ${engagement}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (hoveredId === node.id) handleNodeLeave();
                    else handleNodeHover(node.id, node.x, node.y);
                  }
                }}
              >
                {/* Glow ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius + 6}
                  className="rst-node-glow"
                  fill="none"
                  stroke={config?.glowColor ?? "var(--color-silver-400)"}
                  strokeWidth="1"
                />

                {/* Main circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? node.radius + 3 : node.radius}
                  className="rst-node-circle"
                  fill={config?.glowColor ?? "var(--color-silver-400)"}
                  stroke={
                    isHovered
                      ? "var(--color-silver-100)"
                      : "var(--color-surface-0)"
                  }
                  strokeWidth={isHovered ? 2.5 : 2}
                  opacity={0.8}
                />

                {/* Size label */}
                <text
                  x={node.x}
                  y={node.y - 3}
                  className="rst-node-size"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {node.cluster.size}
                </text>

                {/* "familias" label */}
                <text
                  x={node.x}
                  y={node.y + 10}
                  className="rst-node-sublabel"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  fam.
                </text>

                {/* Name label (below node) */}
                <text
                  x={node.x}
                  y={node.y + node.radius + 14}
                  className="rst-node-name"
                  textAnchor="middle"
                >
                  {node.cluster.name.length > 14
                    ? `${node.cluster.name.slice(0, 14)}…`
                    : node.cluster.name}
                </text>

                {/* Engagement indicator (small arc) */}
                {engagement > 0 && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 3}
                    className="rst-engagement-arc"
                    fill="none"
                    stroke={
                      engagement >= 70
                        ? "var(--color-emerald-400)"
                        : engagement >= 40
                          ? "var(--color-amber-400)"
                          : "var(--color-rose-400)"
                    }
                    strokeWidth="2"
                    strokeDasharray={`${(engagement / 100) * 2 * Math.PI * (node.radius + 3)} ${2 * Math.PI * (node.radius + 3)}`}
                    transform={`rotate(-90 ${node.x} ${node.y})`}
                    opacity={0.6}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* ── Tooltip ──────────────────────────────────────────────────── */}
        {hoveredCluster && (
          <div
            className="rst-tooltip"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 10}px`,
            }}
            role="tooltip"
          >
            <div className="rst-tooltip-header">
              <span
                className="rst-tooltip-type"
                data-cluster-type={hoveredCluster.cluster_type}
              >
                {CLUSTER_TYPE_CONFIG[hoveredCluster.cluster_type]?.label ??
                  hoveredCluster.cluster_type}
              </span>
              <span className="rst-tooltip-size">
                {hoveredCluster.size} familias
              </span>
            </div>
            <h4 className="rst-tooltip-name">{hoveredCluster.name}</h4>
            <p className="rst-tooltip-desc">{hoveredCluster.description}</p>

            {/* Engagement */}
            <div className="rst-tooltip-engagement">
              <TrendingUp size={11} aria-hidden="true" />
              <span>Engagement: </span>
              <span className="rst-tooltip-engagement-value">
                {hoveredCluster.avg_engagement}%
              </span>
            </div>

            {/* Shared interests */}
            {hoveredCluster.shared_interests.length > 0 && (
              <div className="rst-tooltip-interests">
                <span className="rst-tooltip-interests-label">
                  Intereses compartidos
                </span>
                <div className="rst-tooltip-interest-tags">
                  {hoveredCluster.shared_interests.slice(0, 5).map((i) => (
                    <span key={i} className="rst-tooltip-interest-tag">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            {(hoveredCluster.connections?.length ?? 0) > 0 && (
              <div className="rst-tooltip-connections">
                <Link2 size={11} aria-hidden="true" />
                <span>
                  {hoveredCluster.connections!.length} conexión
                  {hoveredCluster.connections!.length > 1 ? "es" : ""}
                </span>
              </div>
            )}

            {/* Embedded opportunities */}
            {(hoveredCluster.embedded_opportunities?.length ?? 0) > 0 && (
              <div className="rst-tooltip-opportunities">
                <Target size={11} aria-hidden="true" />
                <span>
                  {hoveredCluster.embedded_opportunities!.length} oportunidad
                  {hoveredCluster.embedded_opportunities!.length > 1
                    ? "es"
                    : ""}{" "}
                  detectada
                  {hoveredCluster.embedded_opportunities!.length > 1
                    ? "s"
                    : ""}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="rst-legend">
        <span className="rst-legend-title">Tipos de Cluster</span>
        {Object.entries(CLUSTER_TYPE_CONFIG).map(([type, config]) => {
          const count = clusters.filter(
            (c) => c.cluster_type === type,
          ).length;
          return (
            <div
              key={type}
              className="rst-legend-item"
              data-inactive={count === 0 ? "" : undefined}
            >
              <span
                className="rst-legend-dot"
                style={{ background: count > 0 ? config.glowColor : undefined }}
                aria-hidden="true"
              />
              <span className="rst-legend-label">{config.label}</span>
              <span className="rst-legend-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}