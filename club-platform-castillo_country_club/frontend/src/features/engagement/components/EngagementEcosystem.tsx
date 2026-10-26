// src/features/engagement/components/EngagementEcosystem.tsx
// ═══════════════════════════════════════════════════════════
// "The Ecosystem" — 10-Domain Vitality Map (SIGNATURE)
// Castillo Country Club — Phase 31 "The Voice"
//
// SVG visualization of the engagement ecosystem.
// Each of the 10 domains is a living organism represented
// as a circle. Size = vitality. Color = trend. Connections
// = symbioses. Pulse = resonance. Fade = extinction.
//
// Glass namespace: glass-eng-ecosystem
// Data attributes: data-domain, data-vitality, data-trend
// Rules: R34, R35, R38, #3 (chartTheme)
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import type {
  EngagementEcosystem as EcosystemType,
  EngagementDomainStatus,
  DomainSymbiosis,
  ActivityDomain,
} from "../types";
import {
  ACTIVITY_DOMAIN_DISPLAY,
} from "../types";
import {
  classifyDomainVitality
} from "../config";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui";
import "./EngagementEcosystem.css";

// ── Layout: force-directed approximation ───────────────────
// Pre-computed positions for 10 domains in a pleasing layout.
// In production, this would use d3-force or a spring simulation.
// For now, a hand-crafted radial layout with slight offsets.

const DOMAIN_POSITIONS: Record<ActivityDomain, { x: number; y: number }> = {
  events:          { x: 0.50, y: 0.18 },
  dining:          { x: 0.78, y: 0.30 },
  sports:          { x: 0.85, y: 0.58 },
  wellness:        { x: 0.68, y: 0.80 },
  cultural:        { x: 0.32, y: 0.80 },
  facilities:      { x: 0.15, y: 0.58 },
  social:          { x: 0.22, y: 0.30 },
  communication:   { x: 0.38, y: 0.48 },
  financial:       { x: 0.62, y: 0.48 },
  recommendations: { x: 0.50, y: 0.65 },
};

// ── Vitality → radius mapping ──────────────────────────────

function vitalityToRadius(vitality: number, baseRadius: number): number {
  // Min 20% of base, max 100% of base
  const minScale = 0.2;
  const maxScale = 1.0;
  const scale = minScale + (vitality / 100) * (maxScale - minScale);
  return baseRadius * scale;
}

// ── Trend → color mapping ──────────────────────────────────

function getDomainColor(domain: EngagementDomainStatus): string {
  const display = ACTIVITY_DOMAIN_DISPLAY[domain.domain];
  if (domain.vitality <= 5) return "var(--color-silver-500)"; // extinct
  if (domain.trend === "improving") return display.color;
  if (domain.trend === "declining") return "var(--color-rose-400)";
  return display.color;
}

// ── Component ──────────────────────────────────────────────

interface EngagementEcosystemProps {
  ecosystem: EcosystemType | null;
  onDomainClick?: (domain: ActivityDomain) => void;
}

/**
 * "The Ecosystem" — 10-domain vitality map.
 * The signature visualization that shows engagement as a
 * LIVING SYSTEM where domains compete, cooperate, and evolve.
 */
export function EngagementEcosystem({
  ecosystem,
  onDomainClick,
}: EngagementEcosystemProps) {
  const [hoveredDomain, setHoveredDomain] = useState<ActivityDomain | null>(null);

  const svgWidth = 500;
  const svgHeight = 500;
  const baseRadius = 38;

  // Pre-compute domain circles
  const domainCircles = useMemo(() => {
    if (!ecosystem) return [];

    return ecosystem.domains.map((domain: EngagementDomainStatus) => {
      const pos = DOMAIN_POSITIONS[domain.domain];
      const radius = vitalityToRadius(domain.vitality, baseRadius);
      const color = getDomainColor(domain);
      const display = ACTIVITY_DOMAIN_DISPLAY[domain.domain];
      const vitalityLevel = classifyDomainVitality(domain.vitality);

      return {
        domain,
        cx: pos.x * svgWidth,
        cy: pos.y * svgHeight,
        radius,
        color,
        display,
        vitalityLevel,
        isExtinct: domain.vitality <= 5,
        isResonant: domain.resonance >= 60,
        isHovered: hoveredDomain === domain.domain,
      };
    });
  }, [ecosystem, hoveredDomain]);

  // Pre-compute symbiosis edges
  const symbiosisEdges = useMemo(() => {
    if (!ecosystem) return [];

    return ecosystem.symbioses.map((sy: DomainSymbiosis) => {
      const pos1 = DOMAIN_POSITIONS[sy.domain1];
      const pos2 = DOMAIN_POSITIONS[sy.domain2];
      if (!pos1 || !pos2) return null;

      const x1 = pos1.x * svgWidth;
      const y1 = pos1.y * svgHeight;
      const x2 = pos2.x * svgWidth;
      const y2 = pos2.y * svgHeight;

      const isHighlighted =
        hoveredDomain === sy.domain1 || hoveredDomain === sy.domain2;

      return {
        sy,
        x1,
        y1,
        x2,
        y2,
        strokeWidth: 1 + sy.strength * 3,
        opacity: isHighlighted ? 0.6 : 0.15 + sy.strength * 0.2,
        isHighlighted,
      };
    }).filter(Boolean);
  }, [ecosystem, hoveredDomain]);

  if (!ecosystem) {
    return (
      <div data-glass-eng-ecosystem="" className="eng-ecosystem">
        <div className="eng-ecosystem__header">
          <h3 className="eng-ecosystem__title">Ecosistema de Engagement</h3>
        </div>
        <EmptyState
          title="Sin datos del ecosistema"
          description="Los datos del ecosistema se computarán cuando haya familias activas."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Actualizar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-glass-eng-ecosystem=""
      data-health={ecosystem.healthScore >= 60 ? "healthy" : ecosystem.healthScore >= 35 ? "stressed" : "critical"}
      className="eng-ecosystem"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="eng-ecosystem__header">
        <h3 className="eng-ecosystem__title">Ecosistema de Engagement</h3>
        <div className="eng-ecosystem__header-stats">
          <span className="eng-ecosystem__stat">
            Salud: <strong>{ecosystem.healthScore}</strong>
          </span>
          <span className="eng-ecosystem__stat">
            Diversidad: <strong>{ecosystem.diversity}</strong>
          </span>
          {ecosystem.extinctDomains.length > 0 && (
            <span className="eng-ecosystem__stat eng-ecosystem__stat--warning">
              Extintos: <strong>{ecosystem.extinctDomains.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ── SVG Visualization ────────────────────────────────── */}
      <div className="eng-ecosystem__canvas">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          role="img"
          aria-label="Mapa del ecosistema de engagement con 10 dominios"
        >
          <defs>
            {/* Glow filter for resonant domains */}
            <filter id="eng-eco-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pulse animation for active domains */}
            <filter id="eng-eco-pulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Symbiosis Edges ──────────────────────────────── */}
          <g className="eng-ecosystem__edges">
            {symbiosisEdges.map((edge) => {
              if (!edge) return null;
              return (
                <line
                  key={`${edge.sy.domain1}-${edge.sy.domain2}`}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke="var(--color-gold-400)"
                  strokeWidth={edge.strokeWidth}
                  opacity={edge.opacity}
                  strokeLinecap="round"
                  className={edge.isHighlighted ? "eng-ecosystem__edge--highlighted" : ""}
                />
              );
            })}
          </g>

          {/* ── Signal Flow Pulses ───────────────────────────── */}
          <g className="eng-ecosystem__flows">
            {symbiosisEdges.map((edge) => {
              if (!edge || !edge.isHighlighted) return null;
              return (
                <circle
                  key={`flow-${edge.sy.domain1}-${edge.sy.domain2}`}
                  r={3}
                  fill="var(--color-gold-400)"
                  opacity={0.6}
                  className="eng-ecosystem__flow-dot"
                >
                  <animateMotion
                    dur={`${2 + edge.sy.strength * 2}s`}
                    repeatCount="indefinite"
                    path={`M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`}
                  />
                </circle>
              );
            })}
          </g>

          {/* ── Domain Circles ───────────────────────────────── */}
          <g className="eng-ecosystem__domains">
            {domainCircles.map((dc) => (
              <g
                key={dc.domain.domain}
                className="eng-ecosystem__domain"
                data-domain={dc.domain.domain}
                data-vitality={dc.vitalityLevel}
                data-trend={dc.domain.trend}
                data-extinct={dc.isExtinct}
                onClick={() => onDomainClick?.(dc.domain.domain)}
                onMouseEnter={() => setHoveredDomain(dc.domain.domain)}
                onMouseLeave={() => setHoveredDomain(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Pulse ring for resonant domains */}
                {dc.isResonant && (
                  <circle
                    cx={dc.cx}
                    cy={dc.cy}
                    r={dc.radius + 8}
                    fill="none"
                    stroke={dc.color}
                    strokeWidth={1}
                    opacity={0.3}
                    className="eng-ecosystem__pulse-ring"
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={dc.cx}
                  cy={dc.cy}
                  r={dc.radius}
                  fill={dc.color}
                  fillOpacity={dc.isExtinct ? 0.08 : dc.isHovered ? 0.25 : 0.15}
                  stroke={dc.color}
                  strokeWidth={dc.isHovered ? 2.5 : 1.5}
                  strokeOpacity={dc.isExtinct ? 0.2 : 0.6}
                  filter={dc.isResonant ? "url(#eng-eco-glow)" : undefined}
                  className="eng-ecosystem__circle"
                />

                {/* Domain icon/label */}
                <text
                  x={dc.cx}
                  y={dc.cy - 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={dc.isExtinct ? "var(--color-silver-500)" : dc.color}
                  fontSize={dc.isHovered ? 13 : 11}
                  fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                  fontWeight="600"
                  className="eng-ecosystem__label"
                >
                  {dc.display.label}
                </text>

                {/* Vitality number */}
                <text
                  x={dc.cx}
                  y={dc.cy + 10}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={dc.isExtinct ? "var(--color-silver-500)" : "var(--color-silver-200)"}
                  fontSize={10}
                  fontFamily="var(--font-mono, 'DM Mono', monospace)"
                  fontWeight="400"
                  opacity={0.7}
                >
                  {dc.domain.vitality}
                </text>

                {/* Trend indicator */}
                {dc.domain.trend !== "stable" && !dc.isExtinct && (
                  <text
                    x={dc.cx + dc.radius - 4}
                    y={dc.cy - dc.radius + 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill={dc.domain.trend === "improving" ? "var(--color-emerald-400)" : "var(--color-rose-400)"}
                    className="eng-ecosystem__trend-icon"
                  >
                    {dc.domain.trend === "improving" ? "▲" : "▼"}
                  </text>
                )}

                {/* Hover detail */}
                {dc.isHovered && (
                  <g className="eng-ecosystem__tooltip">
                    <rect
                      x={dc.cx - 70}
                      y={dc.cy + dc.radius + 8}
                      width={140}
                      height={52}
                      rx={8}
                      fill="var(--color-surface-1)"
                      fillOpacity={0.95}
                      stroke={dc.color}
                      strokeWidth={1}
                      strokeOpacity={0.3}
                    />
                    <text
                      x={dc.cx}
                      y={dc.cy + dc.radius + 22}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--color-silver-400)"
                      fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                    >
                      {dc.domain.membersActive} de {dc.domain.membersTotal} activos
                    </text>
                    <text
                      x={dc.cx}
                      y={dc.cy + dc.radius + 36}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--color-silver-400)"
                      fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                    >
                      Resonancia: {dc.domain.resonance} · Competencia: {dc.domain.competition}
                    </text>
                    <text
                      x={dc.cx}
                      y={dc.cy + dc.radius + 50}
                      textAnchor="middle"
                      fontSize={9}
                      fill={dc.color}
                      fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                      fontWeight="600"
                    >
                      {dc.vitalityLevel === "thriving" ? "Floreciendo" :
                       dc.vitalityLevel === "healthy" ? "Saludable" :
                       dc.vitalityLevel === "stressed" ? "Estresado" :
                       dc.vitalityLevel === "critical" ? "Crítico" : "Extinto"}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="eng-ecosystem__legend">
        <div className="eng-ecosystem__legend-item">
          <span className="eng-ecosystem__legend-dot eng-ecosystem__legend-dot--thriving" />
          <span>Floreciendo</span>
        </div>
        <div className="eng-ecosystem__legend-item">
          <span className="eng-ecosystem__legend-dot eng-ecosystem__legend-dot--healthy" />
          <span>Saludable</span>
        </div>
        <div className="eng-ecosystem__legend-item">
          <span className="eng-ecosystem__legend-dot eng-ecosystem__legend-dot--stressed" />
          <span>Estresado</span>
        </div>
        <div className="eng-ecosystem__legend-item">
          <span className="eng-ecosystem__legend-dot eng-ecosystem__legend-dot--critical" />
          <span>Crítico</span>
        </div>
        <div className="eng-ecosystem__legend-item">
          <span className="eng-ecosystem__legend-dot eng-ecosystem__legend-dot--extinct" />
          <span>Extinto</span>
        </div>
      </div>
    </div>
  );
}