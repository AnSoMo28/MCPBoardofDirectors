// src/features/facilities/components/FacilityPersonalityRadar.tsx
// ═══════════════════════════════════════════════════════════════
// FACILITY PERSONALITY RADAR — "El Alma del Espacio"
//
// Full 6-axis radar chart showing a facility's "soul".
// Each axis represents a dimension of the space's personality
// computed from REAL data by computeFacilityPersonality().
//
// Below the radar: personality name in display font italic
// and a narrative paragraph from the data.
//
// ENHANCED: Their typed axes + poetic names + narrative
//           + Our breathing area + hover dots + dominant pulse
//           + data-mode responsive + stagger
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — area grows in, dots stagger
//   ✅ SENSE 2: REACCIÓN — dot hover shows value tooltip
//   ✅ SENSE 3: MEMORIA — value display on hover + narrative
//   ✅ SENSE 4: INTENCIÓN — dominant axis highlighted
//   ✅ SENSE 5: SINIESTRÍA — strongest axis pulses, hero dot
//   ✅ SENSE 6: EMPATÍA — data-mode responsive accent
//   ✅ SENSE 7: NARRATIVA — poetic name + paragraph
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState, useCallback } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import type {
  FacilityPersonality,
  FacilitiesDashboardMode,
} from "../types";
import "./FacilityPersonalityRadar.css";

// ═══════════════════════════════════════════════════════════════
// AXIS DEFINITIONS — Typed and ordered
// ═══════════════════════════════════════════════════════════════

interface PersonalityAxis {
  key: keyof Pick<
    FacilityPersonality,
    | "activity_level"
    | "popularity_score"
    | "efficiency_rating"
    | "comfort_contribution"
    | "versatility_index"
    | "vitality_trend"
  >;
  label: string;
  description: string;
  angle: number; // degrees, -90 = up
}

const AXES: PersonalityAxis[] = [
  { key: "activity_level", label: "Actividad", description: "Intensidad de uso del espacio", angle: -90 },
  { key: "popularity_score", label: "Popularidad", description: "Demanda y preferencia entre socios", angle: -30 },
  { key: "efficiency_rating", label: "Eficiencia", description: "Ratio de utilización vs capacidad", angle: 30 },
  { key: "comfort_contribution", label: "Confort", description: "Contribución al confort general del club", angle: 90 },
  { key: "versatility_index", label: "Versatilidad", description: "Capacidad de adaptación a distintos usos", angle: 150 },
  { key: "vitality_trend", label: "Vitalidad", description: "Tendencia de mejora o deterioro", angle: 210 },
];

// ═══════════════════════════════════════════════════════════════
// PERSONALITY NAME + NARRATIVE — Sense 7: NARRATIVA
// ═══════════════════════════════════════════════════════════════

function generatePersonalityName(personality: FacilityPersonality): string {
  const type = personality.personality_type;
  const axes = AXES.map((a) => ({
    label: a.label,
    value: personality[a.key],
  }));
  const dominant = [...axes].sort((a, b) => b.value - a.value)[0];

  const typeNames: Record<string, string> = {
    high_energy: "El Impulsor",
    moderate: "El Equilibrado",
    low_activity: "El Refugio",
    dormant: "El Durmiente",
    versatile: "El Camaleón",
  };

  const dominantModifiers: Record<string, string> = {
    Actividad: "Incansable",
    Popularidad: "Magnético",
    Eficiencia: "Preciso",
    Confort: "Reconfortante",
    Versatilidad: "Multifacético",
    Vitalidad: "Resiliente",
  };

  const base = typeNames[type] ?? "El Espacio";
  const modifier = dominantModifiers[dominant.label] ?? "";

  return `${base} ${modifier}`.trim();
}

function generateNarrative(
  personality: FacilityPersonality,
  facilityName: string,
): string {
  const axes = AXES.map((a) => ({
    label: a.label,
    value: personality[a.key],
  }));
  const sorted = [...axes].sort((a, b) => b.value - a.value);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const sentences: string[] = [];

  sentences.push(
    `${facilityName} es un espacio "${personality.personality_type}" con puntuación general de ${personality.overall_score}/100.`,
  );

  if (strongest.value >= 70) {
    sentences.push(
      `Su mayor fortaleza es la ${strongest.label.toLowerCase()} (${strongest.value}/100) — alto impacto en esa dimensión.`,
    );
  }

  if (weakest.value < 40) {
    sentences.push(
      `Área de mejora: ${weakest.label.toLowerCase()} (${weakest.value}/100) — oportunidad de optimización.`,
    );
  }

  if (personality.vitality_trend >= 60) {
    sentences.push("Tendencia vital positiva — el espacio está mejorando.");
  } else if (personality.vitality_trend < 40) {
    sentences.push("Tendencia vital preocupante — el espacio necesita atención.");
  }

  return sentences.join(" ");
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface FacilityPersonalityRadarProps {
  facilityId: string;
  facilityName: string;
  personality: FacilityPersonality;
  compact?: boolean;
  /** Dashboard mode for ambient coloring */
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function FacilityPersonalityRadar({ facilityName, personality, compact = false, ambientMode = "calm" }: FacilityPersonalityRadarProps) {
  const prefersReduced = useReducedMotion();
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  // ── SVG dimensions ──
  const size = compact ? 200 : 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // ── Personality data ──
  const personalityName = useMemo(
    () => generatePersonalityName(personality),
    [personality],
  );

  const narrative = useMemo(
    () => generateNarrative(personality, facilityName),
    [personality, facilityName],
  );

  // ── Dominant axis (Sense 5: SINIESTRÍA) ──
  const dominantAxis = useMemo(() => {
    let max = -1;
    let dominant: PersonalityAxis = AXES[0];
    for (const axis of AXES) {
      if (personality[axis.key] > max) {
        max = personality[axis.key];
        dominant = axis;
      }
    }
    return dominant;
  }, [personality]);

  // ── Value polygon points ──
  const valuePoints = AXES.map((a) => {
    const rad = (a.angle * Math.PI) / 180;
    const r = (personality[a.key] / 100) * maxR;
    return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
  }).join(" ");

  // ── Hover handlers (Sense 2) ──
  const handleDotEnter = useCallback((axisKey: string) => {
    setHoveredAxis(axisKey);
  }, []);

  const handleDotLeave = useCallback(() => {
    setHoveredAxis(null);
  }, []);

  return (
    <div
      className="glass-fac-radar"
      data-mode={ambientMode}
      data-compact={compact ? "true" : undefined}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* ── Radar SVG ── */}
      <svg
        className="glass-fac-radar__svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Personality radar for ${facilityName}: ${personalityName}`}
      >
        {/* Grid circles */}
        {gridLevels.map((level) => (
          <polygon
            key={`grid-${level}`}
            className="glass-fac-radar__grid"
            points={AXES.map((a) => {
              const rad = (a.angle * Math.PI) / 180;
              const r = level * maxR;
              return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
            }).join(" ")}
          />
        ))}

        {/* Axis lines */}
        {AXES.map((a) => {
          const rad = (a.angle * Math.PI) / 180;
          const isDominant = a.key === dominantAxis.key;
          return (
            <line
              key={`axis-${a.key}`}
              className="glass-fac-radar__axis-line"
              data-dominant={isDominant ? "true" : undefined}
              x1={cx}
              y1={cy}
              x2={cx + maxR * Math.cos(rad)}
              y2={cy + maxR * Math.sin(rad)}
            />
          );
        })}

        {/* Value area — animated grow-in (Sense 1) */}
        <polygon
          className="glass-fac-radar__area"
          points={valuePoints}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Value dots — staggered (Sense 1 + 5) */}
        {AXES.map((a, i) => {
          const rad = (a.angle * Math.PI) / 180;
          const r = (personality[a.key] / 100) * maxR;
          const dotCx = cx + r * Math.cos(rad);
          const dotCy = cy + r * Math.sin(rad);
          const isDominant = a.key === dominantAxis.key;
          const isHovered = a.key === hoveredAxis;

          return (
            <g
              key={`dot-${a.key}`}
              className="glass-fac-radar__dot-group"
              data-dominant={isDominant ? "true" : undefined}
              data-hovered={isHovered ? "true" : undefined}
              onMouseEnter={() => handleDotEnter(a.key)}
              onMouseLeave={handleDotLeave}
              style={
                prefersReduced
                  ? undefined
                  : ({ "--stagger-i": i } as React.CSSProperties)
              }
            >
              {/* Hover target (larger invisible circle) */}
              <circle
                cx={dotCx}
                cy={dotCy}
                r={12}
                fill="transparent"
                style={{ cursor: "pointer" }}
              />

              {/* Dominant dot pulse ring (Sense 5) */}
              {isDominant && !compact && (
                <circle
                  className="glass-fac-radar__dot-pulse"
                  cx={dotCx}
                  cy={dotCy}
                  r={8}
                />
              )}

              {/* Actual dot */}
              <circle
                className="glass-fac-radar__dot"
                cx={dotCx}
                cy={dotCy}
                r={isDominant && !compact ? 5 : 3.5}
              />

              {/* Value tooltip on hover (Sense 2 + 3) */}
              {isHovered && !prefersReduced && (
                <g className="glass-fac-radar__dot-tooltip">
                  <rect
                    x={dotCx - 18}
                    y={dotCy - 24}
                    width={36}
                    height={18}
                    rx={4}
                    className="glass-fac-radar__dot-tooltip-bg"
                  />
                  <text
                    x={dotCx}
                    y={dotCy - 11}
                    textAnchor="middle"
                    className="glass-fac-radar__dot-tooltip-text"
                  >
                    {personality[a.key]}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Axis labels */}
        {AXES.map((a) => {
          const rad = (a.angle * Math.PI) / 180;
          const labelR = maxR + (compact ? 16 : 22);
          const lx = cx + labelR * Math.cos(rad);
          const ly = cy + labelR * Math.sin(rad);
          const isDominant = a.key === dominantAxis.key;

          return (
            <g key={`label-${a.key}`}>
              <text
                className="glass-fac-radar__axis-label"
                data-dominant={isDominant ? "true" : undefined}
                x={lx}
                y={ly - (compact ? 3 : 5)}
                textAnchor="middle"
              >
                {a.label}
              </text>
              <text
                className="glass-fac-radar__axis-value"
                data-dominant={isDominant ? "true" : undefined}
                x={lx}
                y={ly + (compact ? 9 : 12)}
                textAnchor="middle"
              >
                {personality[a.key]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Personality Name (Sense 7: NARRATIVA) ── */}
      {!compact && (
        <div className="glass-fac-radar__name">{personalityName}</div>
      )}

      {/* ── Narrative ── */}
      {!compact && (
        <p className="glass-fac-radar__narrative">{narrative}</p>
      )}
    </div>
  );
}