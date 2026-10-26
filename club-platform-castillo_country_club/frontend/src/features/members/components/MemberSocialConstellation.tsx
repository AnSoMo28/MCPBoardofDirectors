// ═══════════════════════════════════════════════════════════════════════
// Member360 — Social Constellation
// Phase 30 — Block 3.8: The Stars
// ═══════════════════════════════════════════════════════════════════════
//
// SVG force-directed graph where the central member is orbited
// by social connections. Connections drawn as lines with thickness
// proportional to strength. Cascade-risk nodes glow red.
//
// No Canvas — SVG for accessibility and simplicity.
// Max 20 nodes visible for performance.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import type {
  MemberTemperature,
  SocialConnection,
} from "../types";
import type {
  MemberSocialProfileResponse,
} from "../types";
import type {
  MemberPredictions
} from "../lib/memberPredictions";
import "./MemberSocialConstellation.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberSocialConstellationProps {
  socialProfile: MemberSocialProfileResponse | null;
  temperature: MemberTemperature;
  predictions: MemberPredictions | null;
}

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  r: number;
  strength: number;
  isCascadeRisk: boolean;
  connection: SocialConnection;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const W = 400;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const MAX_NODES = 20;
const ORBIT_R = 100;
const CENTRAL_R = 14;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberSocialConstellation({
  socialProfile,
  temperature,
  predictions,
}: MemberSocialConstellationProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const connections = socialProfile?.connections ?? [];
  const cascadeMembers = useMemo(() => {
    const set = new Set<string>();
    predictions?.riskCascade?.cascadeImpact.forEach((c) => {
      set.add(c.memberId);
    });
    return set;
  }, [predictions?.riskCascade]);

  // ── Position nodes in orbital layout ──────────────────────────────
  const nodes = useMemo<GraphNode[]>(() => {
    const sorted = [...connections]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, MAX_NODES);

    return sorted.map((conn, i) => {
      const angle = (i / Math.max(sorted.length, 1)) * 2 * Math.PI - Math.PI / 2;
      // Vary orbit radius by strength (stronger = closer)
      const orbitVariation = ORBIT_R * (0.7 + (1 - conn.strength) * 0.5);
      const x = CX + orbitVariation * Math.cos(angle);
      const y = CY + orbitVariation * Math.sin(angle);
      // Node radius by strength
      const r = 5 + conn.strength * 7;

      return {
        id: conn.connected_member_id,
        name: conn.connected_name,
        x,
        y,
        r,
        strength: conn.strength,
        isCascadeRisk: cascadeMembers.has(conn.connected_member_id),
        connection: conn,
      };
    });
  }, [connections, cascadeMembers]);

  // ── Hovered node details ──────────────────────────────────────────
  const hoveredNode = hoveredId
    ? nodes.find((n) => n.id === hoveredId) ?? null
    : null;

  // ── Empty state ───────────────────────────────────────────────────
  if (!socialProfile || connections.length === 0) {
    return (
      <div className="glass-m360-constellation">
        <p className="glass-m360-constellation__empty">
          Sin datos de conexiones sociales
        </p>
      </div>
    );
  }

  return (
    <div className="glass-m360-constellation">
      {/* ── Summary ── */}
      <div className="glass-m360-constellation__summary">
        <span className="glass-m360-constellation__summary-item">
          {socialProfile.connections_count} conexión
          {socialProfile.connections_count !== 1 ? "es" : ""}
        </span>
        <span className="glass-m360-constellation__summary-item">
          Influencia: {Math.round(socialProfile.social_influence_score * 100)}%
        </span>
        {socialProfile.referrals_made > 0 && (
          <span className="glass-m360-constellation__summary-item">
            {socialProfile.referrals_made} referidos
          </span>
        )}
        {socialProfile.cluster_membership.length > 0 && (
          <span className="glass-m360-constellation__summary-item">
            Cluster: {socialProfile.cluster_membership[0]}
          </span>
        )}
      </div>

      {/* ── SVG Graph ── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="glass-m360-constellation__svg"
        role="img"
        aria-label="Constelación de conexiones sociales"
      >
        <defs>
          {/* Glow filter for cascade risk */}
          <filter id="m360-const-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* ── Orbit ring (guideline) ── */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth="0.5"
          strokeDasharray="3 4"
          opacity="0.3"
        />

        {/* ── Connection lines ── */}
        {nodes.map((node) => {
          const isHighlighted = hoveredId === node.id || hoveredId === null;
          const isHovered = hoveredId === node.id;

          return (
            <line
              key={`line-${node.id}`}
              x1={CX}
              y1={CY}
              x2={node.x}
              y2={node.y}
              stroke={
                node.isCascadeRisk
                  ? "var(--color-rose-400)"
                  : "var(--color-silver-400)"
              }
              strokeWidth={node.strength * 3 + 0.5}
              opacity={
                isHovered ? 0.8 : isHighlighted ? 0.2 + node.strength * 0.2 : 0.05
              }
              strokeLinecap="round"
              pointerEvents="none"
            />
          );
        })}

        {/* ── Central node (the member) ── */}
        <circle
          cx={CX}
          cy={CY}
          r={CENTRAL_R + 4}
          fill={temperature.state === "thriving" ? "var(--color-emerald-400)" : temperature.state === "at_risk" || temperature.state === "disengaging" ? "var(--color-rose-400)" : "var(--color-teal-400)"}
          opacity="0.15"
          filter="url(#m360-const-glow)"
          className="glass-m360-constellation__central-glow"
        />
        <circle
          cx={CX}
          cy={CY}
          r={CENTRAL_R}
          fill="var(--color-silver-200)"
          stroke="var(--color-surface-1)"
          strokeWidth="2"
        />
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-surface-1)"
          fontSize="8"
          fontWeight="700"
          fontFamily="var(--font-mono)"
        >
          ★
        </text>

        {/* ── Connection nodes ── */}
        {nodes.map((node, i) => {
          const isHovered = hoveredId === node.id;
          const isDimmed = hoveredId !== null && hoveredId !== node.id;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
              className="glass-m360-constellation__node-group"
              opacity={isDimmed ? 0.25 : 1}
            >
              {/* Cascade risk glow */}
              {node.isCascadeRisk && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r + 6}
                  fill="var(--color-rose-400)"
                  opacity={isHovered ? 0.4 : 0.15}
                  filter="url(#m360-const-glow)"
                  className="glass-m360-constellation__cascade-glow"
                  pointerEvents="none"
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={isHovered ? node.r + 2 : node.r}
                fill={
                  node.isCascadeRisk
                    ? "var(--color-rose-400)"
                    : "var(--color-teal-400)"
                }
                opacity={isHovered ? 1 : 0.7}
                stroke={isHovered ? "var(--color-silver-100)" : "var(--color-surface-1)"}
                strokeWidth="1.5"
                style={{
                  transition: "r 0.2s ease, opacity 0.2s ease",
                  animationDelay: `${i * 50}ms`,
                }}
              />

              {/* Name label */}
              {isHovered && (
                <text
                  x={node.x}
                  y={node.y - node.r - 6}
                  textAnchor="middle"
                  fontSize="7"
                  fill="var(--color-silver-200)"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {node.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* ── Hovered node tooltip ── */}
      {hoveredNode && (
        <div className="glass-m360-constellation__tooltip">
          <div className="glass-m360-constellation__tooltip-header">
            <span>{hoveredNode.name}</span>
            {hoveredNode.isCascadeRisk && (
              <span className="glass-m360-constellation__tooltip-cascade">
                ⚠ Cascade risk
              </span>
            )}
          </div>
          <div className="glass-m360-constellation__tooltip-body">
            <span>Relación: {hoveredNode.connection.connection_type}</span>
            <span>Fuerza: {Math.round(hoveredNode.strength * 100)}%</span>
            <span>Actividades compartidas: {hoveredNode.connection.shared_activities}</span>
            {hoveredNode.connection.last_interaction && (
              <span>
                Última interacción:{" "}
                {new Date(hoveredNode.connection.last_interaction).toLocaleDateString("es-CR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Cluster details ── */}
      {socialProfile.cluster_details.length > 0 && (
        <div className="glass-m360-constellation__clusters">
          {socialProfile.cluster_details.map((cd) => (
            <div
              key={cd.cluster}
              className="glass-m360-constellation__cluster"
            >
              <span className="glass-m360-constellation__cluster-name">
                {cd.cluster}
              </span>
              <span className="glass-m360-constellation__cluster-members">
                {cd.members_count} miembros
              </span>
              <div className="glass-m360-constellation__cluster-bar-wrap">
                <div
                  className="glass-m360-constellation__cluster-bar"
                  style={{ width: `${cd.cohesion * 100}%` }}
                />
              </div>
              <span className="glass-m360-constellation__cluster-score">
                {Math.round(cd.match_score * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}