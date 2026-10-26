// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Opportunity Radar (2027 NEW)
//
// "The War Room" — SVG concentric radar where each opportunity is a blip.
//
// Layout:
//   - Concentric rings: score tiers (low/moderate/strong/exceptional)
//   - Domain sectors: 6 wedges, one per active SignalSource
//   - Blips: positioned by score (radius) + domain (angle)
//   - Rotating scan line (CSS animation)
//   - Hover: tooltip with title + reasoning summary
//   - Click: emits opportunity ID for drill-down
//
// Glass namespace: .glass-ror
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useRef } from "react";
import { Target, Crosshair, Info } from "lucide-react";

import type { OpportunitySynthesis } from "../types";
import {
  SignalSource,
  SIGNAL_SOURCE_CONFIG,
  OPPORTUNITY_LEVEL_CONFIG,
  OpportunityLevel,
} from "../types";

import "./RecOpportunityRadar.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface CrossDomainSummary {
  source: SignalSource;
  signalCount: number;
  topSignal: string;
  urgency: number;
}

interface RecOpportunityRadarProps {
  opportunities: OpportunitySynthesis[];
  crossDomainSummaries: CrossDomainSummary[];
  reducedMotion: boolean;
  onSelectOpportunity?: (id: string) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SVG CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const SVG_SIZE = 400;
const CENTER = SVG_SIZE / 2;

// Ring radii — score tiers (closer to center = higher score)
const RINGS: Array<{ radius: number; level: OpportunityLevel; label: string }> = [
  { radius: 45, level: OpportunityLevel.Exceptional, label: "90+" },
  { radius: 90, level: OpportunityLevel.Strong, label: "70" },
  { radius: 135, level: OpportunityLevel.Moderate, label: "40" },
  { radius: 170, level: OpportunityLevel.Low, label: "" },
];

// Domain sector angles — evenly distributed around the circle
const DOMAIN_SECTORS: Array<{
  source: SignalSource;
  startAngle: number;
  endAngle: number;
}> = [
  { source: SignalSource.Wellness, startAngle: -30, endAngle: 30 },
  { source: SignalSource.Events, startAngle: 30, endAngle: 90 },
  { source: SignalSource.Finance, startAngle: 90, endAngle: 150 },
  { source: SignalSource.Sports, startAngle: 150, endAngle: 210 },
  { source: SignalSource.Families, startAngle: 210, endAngle: 270 },
  { source: SignalSource.Internal, startAngle: 270, endAngle: 330 },
];

// ═══════════════════════════════════════════════════════════════════════
// LAYOUT — Position blips within their domain sector
// ═══════════════════════════════════════════════════════════════════════

interface BlipPosition {
  x: number;
  y: number;
  opportunity: OpportunitySynthesis;
  ringIndex: number;
}

function scoreToRadius(score: number): number {
  // Map score 0-100 to radius 170-15 (inverted: high score = center)
  const maxR = RINGS[RINGS.length - 1].radius;
  const minR = RINGS[0].radius - 10;
  return maxR - ((score / 100) * (maxR - minR));
}

function scoreToRingIndex(score: number): number {
  if (score >= 90) return 0;
  if (score >= 70) return 1;
  if (score >= 40) return 2;
  return 3;
}

function positionBlips(
  opportunities: OpportunitySynthesis[],
): BlipPosition[] {
  // Group by primary domain
  const byDomain = new Map<SignalSource, OpportunitySynthesis[]>();
  for (const opp of opportunities) {
    const primaryDomain = opp.source_domains[0] ?? SignalSource.Internal;
    if (!byDomain.has(primaryDomain)) {
      byDomain.set(primaryDomain, []);
    }
    byDomain.get(primaryDomain)!.push(opp);
  }

  const positions: BlipPosition[] = [];

  for (const [domain, domainOpps] of byDomain) {
    const sector = DOMAIN_SECTORS.find((s) => s.source === domain);
    if (!sector) continue;

    const sectorOpps = [...domainOpps].sort((a, b) => b.score - a.score);

    sectorOpps.forEach((opp, idx) => {
      // Spread within sector angle
      const angleSpread = sector.endAngle - sector.startAngle;
      const angleStep =
        sectorOpps.length > 1
          ? angleSpread / (sectorOpps.length + 1)
          : angleSpread / 2;
      const angleDeg = sector.startAngle + angleStep * (idx + 1);
      const angleRad = (angleDeg * Math.PI) / 180;

      const radius = scoreToRadius(opp.score);

      positions.push({
        x: CENTER + radius * Math.cos(angleRad),
        y: CENTER + radius * Math.sin(angleRad),
        opportunity: opp,
        ringIndex: scoreToRingIndex(opp.score),
      });
    });
  }

  return positions;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecOpportunityRadar({
  opportunities,
  crossDomainSummaries,
  reducedMotion,
  onSelectOpportunity,
  className,
}: RecOpportunityRadarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const svgRef = useRef<SVGSVGElement>(null);

  const blips = useMemo(() => positionBlips(opportunities), [opportunities]);

  const hoveredOpp = useMemo(
    () => opportunities.find((o) => o.id === hoveredId) ?? null,
    [opportunities, hoveredId],
  );

  // ── Active domains (for sector labels) ──────────────────────────────
  const activeDomains = useMemo(
    () =>
      new Set(
        crossDomainSummaries
          .filter((s) => s.signalCount > 0)
          .map((s) => s.source),
      ),
    [crossDomainSummaries],
  );

  // ── Level counts for legend ─────────────────────────────────────────
  const levelCounts = useMemo(() => {
    const counts: Record<OpportunityLevel, number> = {
      exceptional: 0,
      strong: 0,
      moderate: 0,
      low: 0,
    };
    for (const opp of opportunities) {
      counts[opp.level]++;
    }
    return counts;
  }, [opportunities]);

  // ── Hover handler ───────────────────────────────────────────────────
  const handleBlipHover = useCallback(
    (id: string, cx: number, cy: number) => {
      setHoveredId(id);
      // Convert SVG coords to approximate screen coords
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

  const handleBlipLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  // ── Click handler ───────────────────────────────────────────────────
  const handleBlipClick = useCallback(
    (id: string) => {
      onSelectOpportunity?.(id);
    },
    [onSelectOpportunity],
  );

  // ── Empty state ─────────────────────────────────────────────────────
  if (opportunities.length === 0) {
    return (
      <div className={`glass-ror ${className ?? ""}`} data-empty>
        <div className="ror-header">
          <Target size={16} aria-hidden="true" className="ror-header-icon" />
          <span className="ror-header-title">Radar de Oportunidades</span>
        </div>
        <div className="ror-empty">
          <Crosshair size={40} aria-hidden="true" className="ror-empty-icon" />
          <p className="ror-empty-text">
            Sin oportunidades detectadas. El motor de síntesis necesita más
            datos para identificar correlaciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-ror ${className ?? ""}`}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="ror-header">
        <Target size={16} aria-hidden="true" className="ror-header-icon" />
        <span className="ror-header-title">Radar de Oportunidades</span>
        <span className="ror-header-count">{opportunities.length}</span>
      </div>

      {/* ── Radar + Legend Layout ──────────────────────────────────────── */}
      <div className="ror-body">
        {/* ── SVG Radar ────────────────────────────────────────────────── */}
        <div className="ror-radar-container">
          <svg
            ref={svgRef}
            className="ror-radar-svg"
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            role="img"
            aria-label={`Radar con ${opportunities.length} oportunidades`}
          >
            {/* ── Concentric rings ─────────────────────────────────────── */}
            {RINGS.map((ring, idx) => (
              <g key={`ring-${idx}`}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={ring.radius}
                  className="ror-ring"
                  fill="none"
                />
                {ring.label && (
                  <text
                    x={CENTER + ring.radius + 4}
                    y={CENTER - 4}
                    className="ror-ring-label"
                  >
                    {ring.label}
                  </text>
                )}
              </g>
            ))}

            {/* ── Domain sector lines ──────────────────────────────────── */}
            {DOMAIN_SECTORS.map((sector) => {
              const midAngle =
                ((sector.startAngle + sector.endAngle) / 2 * Math.PI) / 180;
              const endRadius = RINGS[RINGS.length - 1].radius;
              const labelRadius = endRadius + 18;
              const config = SIGNAL_SOURCE_CONFIG[sector.source];
              const isActive = activeDomains.has(sector.source);

              return (
                <g key={`sector-${sector.source}`}>
                  {/* Sector divider line */}
                  <line
                    x1={CENTER}
                    y1={CENTER}
                    x2={CENTER + endRadius * Math.cos((sector.startAngle * Math.PI) / 180)}
                    y2={CENTER + endRadius * Math.sin((sector.startAngle * Math.PI) / 180)}
                    className="ror-sector-line"
                    data-active={isActive ? "" : undefined}
                  />
                  {/* Sector label */}
                  <text
                    x={CENTER + labelRadius * Math.cos(midAngle)}
                    y={CENTER + labelRadius * Math.sin(midAngle)}
                    className="ror-sector-label"
                    textAnchor="middle"
                    dominantBaseline="central"
                    data-active={isActive ? "" : undefined}
                    data-signal-source={sector.source}
                  >
                    {config.label}
                  </text>
                </g>
              );
            })}

            {/* ── Scan line (animated rotation) ────────────────────────── */}
            {!reducedMotion && (
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER + RINGS[RINGS.length - 1].radius}
                y2={CENTER}
                className="ror-scan-line"
              />
            )}

            {/* ── Crosshair ────────────────────────────────────────────── */}
            <line
              x1={CENTER - 8}
              y1={CENTER}
              x2={CENTER + 8}
              y2={CENTER}
              className="ror-crosshair"
            />
            <line
              x1={CENTER}
              y1={CENTER - 8}
              x2={CENTER}
              y2={CENTER + 8}
              className="ror-crosshair"
            />

            {/* ── Opportunity blips ────────────────────────────────────── */}
            {blips.map((blip, idx) => {
              const opp = blip.opportunity;
              const domain = opp.source_domains[0] ?? SignalSource.Internal;
              const config = SIGNAL_SOURCE_CONFIG[domain];
              const isHovered = hoveredId === opp.id;
              const levelConfig = OPPORTUNITY_LEVEL_CONFIG[opp.level];

              return (
                <g
                  key={opp.id}
                  className="ror-blip"
                  data-opportunity-level={opp.level}
                  data-hovered={isHovered ? "" : undefined}
                  style={
                    {
                      "--stagger-i": idx,
                    } as React.CSSProperties
                  }
                  onMouseEnter={() =>
                    handleBlipHover(opp.id, blip.x, blip.y)
                  }
                  onMouseLeave={handleBlipLeave}
                  onClick={() => handleBlipClick(opp.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${opp.title} — Score ${opp.score} — ${levelConfig.label}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleBlipClick(opp.id);
                    }
                  }}
                >
                  {/* Glow (hovered) */}
                  {isHovered && (
                    <circle
                      cx={blip.x}
                      cy={blip.y}
                      r={18}
                      className="ror-blip-glow"
                      fill={config.color}
                      opacity="0.15"
                    />
                  )}
                  {/* Pulse ring (exceptional) */}
                  {opp.level === OpportunityLevel.Exceptional && (
                    <circle
                      cx={blip.x}
                      cy={blip.y}
                      r={12}
                      className="ror-blip-pulse"
                      fill="none"
                      stroke={config.color}
                      strokeWidth="1"
                    />
                  )}
                  {/* Blip circle */}
                  <circle
                    cx={blip.x}
                    cy={blip.y}
                    r={isHovered ? 8 : 6}
                    className="ror-blip-circle"
                    fill={config.color}
                    stroke={
                      isHovered
                        ? "var(--color-silver-100)"
                        : "var(--color-surface-0)"
                    }
                    strokeWidth={isHovered ? 2 : 1.5}
                  />
                  {/* Score label (hovered) */}
                  {isHovered && (
                    <text
                      x={blip.x}
                      y={blip.y - 16}
                      className="ror-blip-score"
                      textAnchor="middle"
                    >
                      {opp.score}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* ── Tooltip (positioned in DOM, not SVG) ───────────────────── */}
          {hoveredOpp && (
            <div
              className="ror-tooltip"
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y - 10}px`,
              }}
              role="tooltip"
            >
              <div className="ror-tooltip-header">
                <span
                  className="ror-tooltip-score"
                  data-level={hoveredOpp.level}
                >
                  {hoveredOpp.score}
                </span>
                <span className="ror-tooltip-level">
                  {OPPORTUNITY_LEVEL_CONFIG[hoveredOpp.level].label}
                </span>
              </div>
              <h4 className="ror-tooltip-title">{hoveredOpp.title}</h4>
              <p className="ror-tooltip-desc">
                {hoveredOpp.description.length > 120
                  ? `${hoveredOpp.description.slice(0, 120)}...`
                  : hoveredOpp.description}
              </p>
              <div className="ror-tooltip-domains">
                {hoveredOpp.source_domains.map((d) => (
                  <span
                    key={d}
                    className="ror-tooltip-domain"
                    data-signal-source={d}
                  >
                    {SIGNAL_SOURCE_CONFIG[d]?.label ?? d}
                  </span>
                ))}
              </div>
              {hoveredOpp.reasoning_chain && (
                <div className="ror-tooltip-reasoning">
                  <Info size={11} aria-hidden="true" />
                  <span>
                    Confianza: {hoveredOpp.reasoning_chain.overall_confidence}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Legend ───────────────────────────────────────────────────── */}
        <div className="ror-legend">
          <span className="ror-legend-title">Niveles</span>
          {(
            [
              OpportunityLevel.Exceptional,
              OpportunityLevel.Strong,
              OpportunityLevel.Moderate,
              OpportunityLevel.Low,
            ] as const
          ).map((level) => {
            const config = OPPORTUNITY_LEVEL_CONFIG[level];
            return (
              <div key={level} className="ror-legend-item">
                <span
                  className="ror-legend-dot"
                  style={{ background: config.color }}
                  aria-hidden="true"
                />
                <span className="ror-legend-label">{config.label}</span>
                <span className="ror-legend-count">{levelCounts[level]}</span>
              </div>
            );
          })}

          <span className="ror-legend-title ror-legend-title--domains">
            Dominios
          </span>
          {DOMAIN_SECTORS.map((sector) => {
            const config = SIGNAL_SOURCE_CONFIG[sector.source];
            const isActive = activeDomains.has(sector.source);
            const count = opportunities.filter(
              (o) => o.source_domains[0] === sector.source,
            ).length;

            return (
              <div
                key={sector.source}
                className="ror-legend-item"
                data-inactive={!isActive ? "" : undefined}
              >
                <span
                  className="ror-legend-dot"
                  style={{ background: isActive ? config.color : undefined }}
                  aria-hidden="true"
                />
                <span className="ror-legend-label">{config.label}</span>
                <span className="ror-legend-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}