// ═══════════════════════════════════════════════════════════════════════
// Member360 — Cross-Domain Signal Graph
// Phase 30 — Block 3.4: The Web
// ═══════════════════════════════════════════════════════════════════════
//
// SVG node graph showing 12 activity domains as connected nodes.
// Connections represent signal agreement between domains.
// Signal flow animates along connections.
// Hovering a node highlights its connections and shows details.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import type {
  ActivityDomain,
  DomainSignal,
  SignalResonance,
  EngagementDNAChannel,
} from "../types";
import {
  getDomainColor,
  getDomainLabel,
  getDomainIcon,
} from "../types";
import "./MemberCrossDomain.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberCrossDomainProps {
  signals: DomainSignal[];
  resonance: SignalResonance;
  dna: EngagementDNAChannel[];
}

interface Connection {
  from: ActivityDomain;
  to: ActivityDomain;
  strength: number;
  sameDirection: boolean;
}

interface NodePosition {
  domain: ActivityDomain;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  textAnchor: "start" | "middle" | "end";
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const ALL_DOMAINS: ActivityDomain[] = [
  "events",
  "sports",
  "wellness",
  "cultural",
  "dining",
  "social",
  "guest_management",
  "communications",
  "families",
  "age_group",
  "facilities",
  "recommendations",
];

const CX = 200;
const CY = 150;
const R = 100;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberCrossDomain({
  signals,
  resonance,
  dna,
}: MemberCrossDomainProps) {
  const [hoveredDomain, setHoveredDomain] = useState<ActivityDomain | null>(
    null,
  );

  // Highest-confidence signal per domain
  const activeSignalMap = useMemo(() => {
    const map = new Map<ActivityDomain, DomainSignal>();
    for (const s of signals) {
      const existing = map.get(s.domain);
      if (!existing || s.confidence > existing.confidence) {
        map.set(s.domain, s);
      }
    }
    return map;
  }, [signals]);

  // Connections between domains that both have signals
  const connections = useMemo<Connection[]>(() => {
    const active = Array.from(activeSignalMap.keys());
    const conns: Connection[] = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = activeSignalMap.get(active[i])!;
        const b = activeSignalMap.get(active[j])!;
        const sameDir = a.direction === b.direction;
        const strength = Math.min(a.confidence, b.confidence);
        conns.push({
          from: active[i],
          to: active[j],
          strength,
          sameDirection: sameDir,
        });
      }
    }
    return conns;
  }, [activeSignalMap]);

  // Preferred domains from DNA
  const preferredDomains = useMemo(() => {
    return new Set(
      dna
        .filter((d) => d.preferred)
        .map((d) => d.domain as ActivityDomain),
    );
  }, [dna]);

  // Node positions (circular layout)
  const nodePositions = useMemo<NodePosition[]>(() => {
    return ALL_DOMAINS.map((domain, i) => {
      const angle = (i / ALL_DOMAINS.length) * 2 * Math.PI - Math.PI / 2;
      const cosA = Math.cos(angle);
      return {
        domain,
        x: CX + R * cosA,
        y: CY + R * Math.sin(angle),
        labelX: CX + (R + 18) * cosA,
        labelY: CY + (R + 18) * Math.sin(angle),
        textAnchor:
          cosA > 0.3 ? "start" : cosA < -0.3 ? "end" : "middle",
      };
    });
  }, []);

  // Hovered signal
  const hoveredSignal = hoveredDomain
    ? activeSignalMap.get(hoveredDomain)
    : null;

  return (
    <div className="glass-m360-crossdomain">
      {/* ── Resonance header ── */}
      <div
        className="glass-m360-crossdomain__resonance"
        data-agreement={resonance.agreement}
      >
        <span className="glass-m360-crossdomain__resonance-label">
          Resonancia: {resonance.agreement} ({resonance.agreementCount}/
          {resonance.totalDomains})
        </span>
        <span className="glass-m360-crossdomain__resonance-confidence">
          {Math.round(resonance.amplifiedConfidence * 100)}% confianza
        </span>
      </div>

      {/* ── SVG Graph ── */}
      <svg
        viewBox="0 0 400 300"
        className="glass-m360-crossdomain__svg"
        role="img"
        aria-label="Grafo de señales cross-domain"
      >
        {/* Connections */}
        {connections.map((conn) => {
          const fromPos = nodePositions.find(
            (n) => n.domain === conn.from,
          )!;
          const toPos = nodePositions.find((n) => n.domain === conn.to)!;
          const isHighlighted =
            hoveredDomain === conn.from || hoveredDomain === conn.to;

          return (
            <line
              key={`${conn.from}-${conn.to}`}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke={getDomainColor(conn.from)}
              strokeWidth={conn.strength * 3 + 0.5}
              opacity={
                isHighlighted ? 0.6 : hoveredDomain ? 0.06 : 0.18
              }
              className={`glass-m360-crossdomain__connection ${!conn.sameDirection ? "glass-m360-crossdomain__connection--reverse" : ""}`}
              pointerEvents="none"
            />
          );
        })}

        {/* Nodes */}
        {nodePositions.map((node) => {
          const signal = activeSignalMap.get(node.domain);
          const isActive = !!signal;
          const isHovered = hoveredDomain === node.domain;
          const isPreferred = preferredDomains.has(node.domain);
          const nodeR = isActive
            ? 7 + (signal?.confidence ?? 0) * 5
            : 4;

          return (
            <g
              key={node.domain}
              onMouseEnter={() => setHoveredDomain(node.domain)}
              onMouseLeave={() => setHoveredDomain(null)}
              className="glass-m360-crossdomain__node-group"
              style={{ cursor: "pointer" }}
            >
              {/* Glow */}
              {isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeR + 4}
                  fill={getDomainColor(node.domain)}
                  opacity={isHovered ? 0.3 : 0.1}
                  className="glass-m360-crossdomain__node-glow"
                  pointerEvents="none"
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeR}
                fill={
                  isActive
                    ? getDomainColor(node.domain)
                    : "var(--color-surface-3)"
                }
                opacity={isActive ? (isHovered ? 1 : 0.75) : 0.2}
                stroke={
                  isHovered
                    ? "var(--color-silver-100)"
                    : isPreferred
                      ? "var(--color-gold-400)"
                      : "none"
                }
                strokeWidth={isHovered || isPreferred ? 1.5 : 0}
              />

              {/* Signal value */}
              {isActive && signal && (
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--color-silver-100)"
                  fontSize="6"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  pointerEvents="none"
                >
                  {Math.round(signal.value)}
                </text>
              )}

              {/* Label */}
              <text
                x={node.labelX}
                y={node.labelY}
                textAnchor={node.textAnchor}
                dominantBaseline="middle"
                fontSize="7"
                fill={
                  isActive
                    ? "var(--color-silver-300)"
                    : "var(--color-silver-600)"
                }
                pointerEvents="none"
              >
                {getDomainLabel(node.domain)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Tooltip ── */}
      {hoveredDomain && (
        <div className="glass-m360-crossdomain__tooltip">
          <div className="glass-m360-crossdomain__tooltip-header">
            <span>
              {getDomainIcon(hoveredDomain)} {getDomainLabel(hoveredDomain)}
            </span>
            {preferredDomains.has(hoveredDomain) && (
              <span className="glass-m360-crossdomain__tooltip-preferred">
                ★ Preferido
              </span>
            )}
          </div>
          {hoveredSignal ? (
            <div className="glass-m360-crossdomain__tooltip-body">
              <span>{hoveredSignal.signal}</span>
              <span>
                Confianza: {Math.round(hoveredSignal.confidence * 100)}%
              </span>
              <span>Dirección: {hoveredSignal.direction}</span>
              <span>Severidad: {hoveredSignal.severity}</span>
            </div>
          ) : (
            <span className="glass-m360-crossdomain__tooltip-empty">
              Sin señal activa
            </span>
          )}
        </div>
      )}
    </div>
  );
}