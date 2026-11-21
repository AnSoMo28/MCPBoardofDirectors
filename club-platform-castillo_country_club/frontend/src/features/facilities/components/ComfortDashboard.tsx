// src/features/facilities/components/ComfortDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// COMFORT DASHBOARD — §F5 + Prop 12 (REWRITE)
//
// Two intelligence layers:
//   Technical (5 dims): temperature, lighting, noise, air_quality, crowding
//   Psychological (5 dims): perceived_space, aesthetic_warmth,
//     sense_of_control, social_density_feel, prestige_perception
//
// The PERCEPTION GAP between them is the key signal.
// "Sensors say 92. Members feel 68. Gap: 24pts."
//
// Living Protocol 7/7. Level 5+.
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  HeartPulse,
  Thermometer,
  Sun,
  Volume2,
  Wind,
  Users,
  AlertTriangle,
  BookOpen,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Expand,
  Sparkles,
  Sliders,
  Star,
  Wrench,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import type {
  Facility,
  ComfortScore,
  EnhancedComfortScore,
  PsychologicalComfort,
  TrendDirection,
  FacilitiesDashboardMode,
} from "../types";

import "./ComfortDashboard.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ComfortDashboardProps {
  enhancedComfortScores?: Record<string, EnhancedComfortScore>;
  comfortScores: Record<string, ComfortScore>;
  facilities: Facility[];
  ambientMode?: FacilitiesDashboardMode;
  onAdjustConditions?: (facilityId: string) => void;
  className?: string;
}

interface RadarAxis {
  key: string;
  label: string;
  value: number;
  color?: string;
}

interface KPI {
  id: string;
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface InterventionEntry {
  facilityId: string;
  facilityName: string;
  urgency: string;
  overall: number;
  recommendation: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** 5 technical dimensions — includes lighting (V1 bug: was missing). */
const DIMENSION_KEYS = [
  "temperature",
  "lighting",
  "noise",
  "air_quality",
  "crowding",
] as const;

type DimensionKey = (typeof DIMENSION_KEYS)[number];

const DIMENSION_DISPLAY: Record<
  DimensionKey,
  { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }
> = {
  temperature: { label: "Temperatura", icon: Thermometer },
  lighting:    { label: "Iluminación", icon: Sun },
  noise:       { label: "Ruido",       icon: Volume2 },
  air_quality: { label: "Calidad aire", icon: Wind },
  crowding:    { label: "Aglomeración", icon: Users },
};

/** 5 psychological dimensions (Prop 12). */
const PSYCH_KEYS = [
  "perceived_space",
  "aesthetic_warmth",
  "sense_of_control",
  "social_density_feel",
  "prestige_perception",
] as const;

type PsychKey = (typeof PSYCH_KEYS)[number];

const PSYCH_DISPLAY: Record<
  PsychKey,
  { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }
> = {
  perceived_space:     { label: "Espacio",   icon: Expand },
  aesthetic_warmth:    { label: "Calidez",   icon: Sparkles },
  sense_of_control:    { label: "Control",   icon: Sliders },
  social_density_feel: { label: "Social",    icon: Users },
  prestige_perception: { label: "Prestigio", icon: Star },
};

const URGENCY_COLOR: Record<string, string> = {
  low:      "var(--color-teal-400)",
  medium:   "var(--color-amber-400)",
  high:     "var(--color-orange-400)",
  critical: "var(--color-rose-400)",
};

const URGENCY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const URGENCY_LABEL: Record<string, string> = {
  low:      "Baja",
  medium:   "Media",
  high:     "Alta",
  critical: "Crítica",
};

// ── Radar geometry ──
const RADAR_SIZE = 200;
const RADAR_CX = RADAR_SIZE / 2;
const RADAR_CY = RADAR_SIZE / 2;
const RADAR_RADIUS = 70;
const RADAR_AXES = 6;
const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];

// ── Score thresholds ──
const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  moderate: 40,
} as const;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatSensorValue(value: unknown): string {
  if (typeof value === "number") return value.toFixed(1);
  if (typeof value === "string") return value;
  if (value == null) return "\u2014";
  return String(value);
}

function scoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return "var(--color-emerald-400)";
  if (score >= SCORE_THRESHOLDS.good) return "var(--color-teal-400)";
  if (score >= SCORE_THRESHOLDS.moderate) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function scoreTone(
  score: number,
): "excellent" | "good" | "moderate" | "poor" {
  if (score >= SCORE_THRESHOLDS.excellent) return "excellent";
  if (score >= SCORE_THRESHOLDS.good) return "good";
  if (score >= SCORE_THRESHOLDS.moderate) return "moderate";
  return "poor";
}

function psychLevel(value: number): "high" | "medium" | "low" {
  if (value >= 70) return "high";
  if (value >= 45) return "medium";
  return "low";
}

function psychLevelColor(level: "high" | "medium" | "low"): string {
  if (level === "high") return "var(--color-teal-400)";
  if (level === "medium") return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function computePsychOverall(psych: PsychologicalComfort): number {
  const vals = PSYCH_KEYS.map((k) => psych[k]?.value ?? 0);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function trendLabel(trend: TrendDirection): string {
  if (trend === "improving") return "Mejorando";
  if (trend === "declining") return "Deteriorando";
  return "Estable";
}

function trendIcon(trend: TrendDirection) {
  if (trend === "improving") return TrendingUp;
  if (trend === "declining") return TrendingDown;
  return Minus;
}

// ── Radar geometry math ──

function vertex(index: number, radius: number): [number, number] {
  const angle = (Math.PI * 2 * index) / RADAR_AXES - Math.PI / 2;
  return [
    RADAR_CX + radius * Math.cos(angle),
    RADAR_CY + radius * Math.sin(angle),
  ];
}

function polygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const r = (Math.max(0, Math.min(100, v)) / 100) * RADAR_RADIUS;
      const [x, y] = vertex(i, r);
      return `${x},${y}`;
    })
    .join(" ");
}

function gridPoints(fraction: number): string {
  const r = fraction * RADAR_RADIUS;
  return Array.from({ length: RADAR_AXES }, (_, i) => {
    const [x, y] = vertex(i, r);
    return `${x},${y}`;
  }).join(" ");
}

function labelPos(
  index: number,
): [number, number, "start" | "middle" | "end"] {
  const angle = (Math.PI * 2 * index) / RADAR_AXES - Math.PI / 2;
  const lr = RADAR_RADIUS + 18;
  const x = RADAR_CX + lr * Math.cos(angle);
  const y = RADAR_CY + lr * Math.sin(angle);
  const anchor: "start" | "middle" | "end" =
    Math.abs(x - RADAR_CX) < 8 ? "middle" : x > RADAR_CX ? "start" : "end";
  return [x, y, anchor];
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ComfortRadar({
  axes,
  reducedMotion,
}: {
  axes: RadarAxis[];
  reducedMotion: boolean;
}) {
  const values = axes.map((a) => a.value);

  return (
    <div className="fac-comfort__radar">
      <svg
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        className="fac-comfort__radar-svg"
        role="img"
        aria-label="Radar de confort: 5 dimensiones técnicas + alineación de percepción"
      >
        {GRID_LEVELS.map((level) => (
          <polygon
            key={level}
            points={gridPoints(level)}
            className="fac-comfort__radar-grid"
            data-outer={level === 1 ? "" : undefined}
          />
        ))}

        {axes.map((_, i) => {
          const [ex, ey] = vertex(i, RADAR_RADIUS);
          return (
            <line
              key={i}
              x1={RADAR_CX}
              y1={RADAR_CY}
              x2={ex}
              y2={ey}
              className="fac-comfort__radar-axis"
            />
          );
        })}

        <polygon
          points={polygonPoints(values)}
          className="fac-comfort__radar-data"
          data-reduced={reducedMotion}
        />

        {axes.map((axis, i) => {
          const r = (axis.value / 100) * RADAR_RADIUS;
          const [cx, cy] = vertex(i, r);
          return (
            <circle
              key={axis.key}
              cx={cx}
              cy={cy}
              r={3}
              className="fac-comfort__radar-dot"
              data-tone={scoreTone(axis.value)}
            >
              <title>
                {axis.label}: {axis.value.toFixed(0)}%
              </title>
            </circle>
          );
        })}

        {axes.map((axis, i) => {
          const [lx, ly, anchor] = labelPos(i);
          return (
            <text
              key={`lbl-${axis.key}`}
              x={lx}
              y={ly}
              textAnchor={anchor}
              className="fac-comfort__radar-label"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DimensionBar({ dimKey, value, gap, sensor, perception, recommendation, index, reducedMotion }: {
  dimKey: DimensionKey;
  value: number;
  gap: number;
  sensor: string;
  perception: string;
  status: string;
  recommendation?: string;
  index: number;
  reducedMotion: boolean;
}) {
  const display = DIMENSION_DISPLAY[dimKey];
  const Icon = display.icon;
  const color = scoreColor(value);
  const tone = scoreTone(value);

  return (
    <div
      className="fac-comfort__dim"
      data-tone={tone}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <div className="fac-comfort__dim-head">
        <div className="fac-comfort__dim-label">
          <Icon className="fac-comfort__dim-icon" style={{ color }} />
          <span className="fac-comfort__dim-name">{display.label}</span>
        </div>
        <span className="fac-comfort__dim-score" style={{ color }}>
          {value.toFixed(0)}
        </span>
      </div>

      <div className="fac-comfort__dim-bar-track">
        <div
          className="fac-comfort__dim-bar-fill"
          data-reduced={reducedMotion}
          style={
            {
              "--bar-pct": `${value}%`,
              "--bar-color": color,
            } as React.CSSProperties
          }
        />
      </div>

      <div className="fac-comfort__dim-meta">
        <span className="fac-comfort__dim-meta-item">
          Sensor: {formatSensorValue(sensor)}
        </span>
        <span className="fac-comfort__dim-meta-arrow">→</span>
        <span className="fac-comfort__dim-meta-item">
          Perc: {formatSensorValue(perception)}
        </span>
        {gap !== 0 && (
          <span
            className="fac-comfort__dim-meta-gap"
            data-positive={gap > 0}
          >
            Gap: {gap > 0 ? "+" : ""}
            {gap.toFixed(1)}
          </span>
        )}
      </div>

      {recommendation && (tone === "moderate" || tone === "poor") && (
        <p className="fac-comfort__dim-recommendation">{recommendation}</p>
      )}
    </div>
  );
}

function PsychSection({
  psychological,
  reducedMotion,
}: {
  psychological: PsychologicalComfort;
  reducedMotion: boolean;
}) {
  return (
    <section className="fac-comfort__psych">
      <div className="fac-comfort__psych-head">
        <h5 className="fac-comfort__psych-title">Dimensión Psicológica</h5>
        <span className="fac-comfort__psych-subtitle">
          La 6ª Invisible
        </span>
      </div>

      <div className="fac-comfort__psych-grid">
        {PSYCH_KEYS.map((key, i) => {
          const dim = psychological[key];
          if (!dim) return null;
          const level = psychLevel(dim.value);
          const color = psychLevelColor(level);
          const display = PSYCH_DISPLAY[key];
          const Icon = display.icon;

          return (
            <div
              key={key}
              className={`fac-comfort__psych-card fac-comfort__psych-card--${level}`}
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              <div className="fac-comfort__psych-card-header">
                <Icon className="fac-comfort__psych-icon" style={{ color }} />
                <span className="fac-comfort__psych-name">
                  {display.label}
                </span>
              </div>
              <span className="fac-comfort__psych-value" style={{ color }}>
                {dim.value}
              </span>
              <div className="fac-comfort__psych-bar-track">
                <div
                  className="fac-comfort__psych-bar-fill"
                  data-reduced={reducedMotion}
                  style={
                    {
                      "--bar-pct": `${dim.value}%`,
                      "--bar-color": color,
                    } as React.CSSProperties
                  }
                />
              </div>
              {dim.factors.length > 0 && (
                <p className="fac-comfort__psych-factor">{dim.factors[0]}</p>
              )}
              {dim.value < 60 && (
                <p className="fac-comfort__psych-improvement">
                  {dim.improvement}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PerceptionGapPanel({
  technicalOverall,
  psychOverall,
  gap,
  description,
}: {
  technicalOverall: number;
  psychOverall: number;
  gap: number;
  description: string;
}) {
  const gapColor =
    gap > 20
      ? "var(--color-rose-400)"
      : gap > 10
        ? "var(--color-amber-400)"
        : "var(--color-teal-400)";

  return (
    <section className="fac-comfort__gap">
      <h5 className="fac-comfort__gap-title">Brecha de Percepción</h5>

      <div className="fac-comfort__gap-scores">
        <div className="fac-comfort__gap-score">
          <span className="fac-comfort__gap-score-label">Técnico</span>
          <span
            className="fac-comfort__gap-score-value"
            style={{ color: "var(--color-teal-400)" }}
          >
            {technicalOverall}
          </span>
        </div>

        <div className="fac-comfort__gap-divider">
          <span
            className="fac-comfort__gap-number"
            data-critical={gap > 20}
          >
            {gap}pts
          </span>
        </div>

        <div className="fac-comfort__gap-score">
          <span className="fac-comfort__gap-score-label">Percepción</span>
          <span
            className="fac-comfort__gap-score-value"
            style={{ color: "var(--color-amber-400)" }}
          >
            {psychOverall}
          </span>
        </div>
      </div>

      <div className="fac-comfort__gap-bar-track">
        <div
          className="fac-comfort__gap-bar-fill"
          style={{
            width: `${Math.min(100, gap * 2.5)}%`,
            backgroundColor: gapColor,
          }}
        />
      </div>

      <p className="fac-comfort__gap-desc">{description}</p>
    </section>
  );
}

function InterventionPanel({ urgency, recommendation, onAdjust }: {
  urgency: string;
  recommendation: string;
  facilityName: string;
  onAdjust?: () => void;
}) {
  return (
    <div
      className={`fac-comfort__intervention fac-comfort__intervention--${urgency}`}
    >
      <div className="fac-comfort__intervention-head">
        <AlertTriangle
          className="fac-comfort__intervention-icon"
          style={{ color: URGENCY_COLOR[urgency] }}
        />
        <span className="fac-comfort__intervention-badge">
          Intervención {URGENCY_LABEL[urgency] ?? urgency}
        </span>
      </div>
      <p className="fac-comfort__intervention-text">{recommendation}</p>
      {onAdjust && (
        <Button variant="unstyled" className="fac-comfort__intervention-btn" onClick={onAdjust}>
          <Wrench className="fac-comfort__intervention-btn-icon" />
          Ajustar condiciones
        </Button>
      )}
    </div>
  );
}

function FacilityStrip({
  facilities,
  scores,
  selectedId,
  onSelect,
}: {
  facilities: Facility[];
  scores: Record<string, ComfortScore>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div
      className="fac-comfort__strip"
      role="tablist"
      aria-label="Seleccionar espacio"
    >
      <Button
        variant="unstyled"
        className={cn(
          "fac-comfort__pill",
          "fac-comfort__pill--all",
          selectedId === null && "fac-comfort__pill--active",
        )}
        onClick={() => onSelect(null)}
        role="tab"
        aria-selected={selectedId === null}
      >
        <span className="fac-comfort__pill-name">General</span>
      </Button>

      {facilities.map((f) => {
        const cs = scores[f.id];
        if (!cs) return null;
        const isActive = selectedId === f.id;
        const tone = scoreTone(cs.overall);

        return (
          <Button
            variant="unstyled"
            key={f.id}
            className={cn(
              "fac-comfort__pill",
              `fac-comfort__pill--${tone}`,
              isActive && "fac-comfort__pill--active",
            )}
            onClick={() => onSelect(f.id)}
            role="tab"
            aria-selected={isActive}
          >
            <span className="fac-comfort__pill-name">{f.name}</span>
            <span className="fac-comfort__pill-score">{cs.overall}</span>
            {cs.intervention_needed && (
              <span
                className="fac-comfort__pill-alert"
                aria-label="Intervención necesaria"
              />
            )}
          </Button>
        );
      })}
    </div>
  );
}

function InterventionAlert({
  interventions,
}: {
  interventions: InterventionEntry[];
}) {
  if (interventions.length === 0) return null;

  const hasCritical = interventions.some((i) => i.urgency === "critical");

  return (
    <div
      className="fac-comfort__alert"
      role="alert"
      data-urgency={hasCritical ? "critical" : "warning"}
    >
      <AlertTriangle className="fac-comfort__alert-icon" />
      <div className="fac-comfort__alert-body">
        <p className="fac-comfort__alert-title">
          {interventions.length}{" "}
          {interventions.length === 1
            ? "espacio requiere"
            : "espacios requieren"}{" "}
          intervención
        </p>
        <div className="fac-comfort__alert-list">
          {interventions.map((inv) => (
            <span
              key={inv.facilityId}
              className="fac-comfort__alert-chip"
              style={{
                color: URGENCY_COLOR[inv.urgency],
                borderColor: URGENCY_COLOR[inv.urgency],
              }}
            >
              {inv.facilityName}
              <span className="fac-comfort__alert-urgency">
                {inv.urgency}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ComfortDashboard({
  enhancedComfortScores,
  comfortScores,
  facilities,
  ambientMode = "calm",
  onAdjustConditions,
  className,
}: ComfortDashboardProps) {
  const rm = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Resolve effective data ──
  const effectiveScores = enhancedComfortScores ?? comfortScores;

  // ── Selected facility ──
  const selectedFacility = useMemo(
    () =>
      selectedId ? facilities.find((f) => f.id === selectedId) ?? null : null,
    [selectedId, facilities],
  );

  const selectedComfort = useMemo(
    () => (selectedId ? effectiveScores[selectedId] ?? null : null),
    [selectedId, effectiveScores],
  );

  const selectedEnhanced = useMemo(
    () =>
      selectedId && enhancedComfortScores
        ? enhancedComfortScores[selectedId] ?? null
        : null,
    [selectedId, enhancedComfortScores],
  );

  // ── Aggregate computation ──
  const aggregate = useMemo(() => {
    const entries = Object.entries(comfortScores);
    if (entries.length === 0) return null;

    const total = entries.length;
    const avgOverall =
      entries.reduce((s, [, cs]) => s + cs.overall, 0) / total;

    // Per-dimension averages
    const dimAvgs: Record<string, { score: number; gap: number }> = {};
    for (const key of DIMENSION_KEYS) {
      let totalScore = 0;
      let totalGap = 0;
      let count = 0;
      for (const [, cs] of entries) {
        const d = cs.dimensions[key];
        if (d) {
          totalScore += d.value;
          totalGap += d.gap;
          count++;
        }
      }
      dimAvgs[key] = {
        score: count > 0 ? totalScore / count : 0,
        gap: count > 0 ? totalGap / count : 0,
      };
    }

    // Perception alignment (from dimension gaps)
    const gaps = Object.values(dimAvgs).map((d) => Math.abs(d.gap));
    const avgAbsGap =
      gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;
    const perceptionAlignment = Math.max(
      0,
      Math.min(100, 100 - avgAbsGap * 2),
    );

    // Interventions
    const interventions: InterventionEntry[] = entries
      .filter(([, cs]) => cs.intervention_needed)
      .map(([id, cs]) => ({
        facilityId: id,
        facilityName:
          facilities.find((f) => f.id === id)?.name ?? id,
        urgency: cs.intervention_urgency,
        overall: cs.overall,
        recommendation: cs.intervention_recommendation,
      }))
      .sort(
        (a, b) =>
          (URGENCY_ORDER[a.urgency] ?? 4) - (URGENCY_ORDER[b.urgency] ?? 4),
      );

    return {
      avgOverall,
      perceptionAlignment,
      total,
      interventions,
      dimAvgs,
    };
  }, [comfortScores, facilities]);

  // ── Radar axes (context-aware) ──
  const radarAxes = useMemo((): RadarAxis[] => {
    if (selectedComfort) {
      // Per-facility: 5 technical dims + perception alignment
      const enhanced = selectedEnhanced;
      enhanced
                ? computePsychOverall(enhanced.psychological)
                : null;
      const perceptionVal = enhanced
        ? Math.max(0, 100 - enhanced.perception_gap * 2.5)
        : null;

      return [
        ...DIMENSION_KEYS.map((key) => ({
          key,
          label: DIMENSION_DISPLAY[key].label,
          value: selectedComfort.dimensions[key]?.value ?? 0,
        })),
        {
          key: "perception",
          label: "Percepción",
          value:
            perceptionVal ??
            (aggregate?.perceptionAlignment ?? 50),
        },
      ];
    }

    // Aggregate
    if (!aggregate) return [];
    return [
      ...DIMENSION_KEYS.map((key) => ({
        key,
        label: DIMENSION_DISPLAY[key].label,
        value: aggregate.dimAvgs[key]?.score ?? 0,
      })),
      {
        key: "perception",
        label: "Percepción",
        value: aggregate.perceptionAlignment,
      },
    ];
  }, [selectedComfort, selectedEnhanced, aggregate]);

  // ── KPIs (context-aware) ──
  const kpis = useMemo((): KPI[] => {
    if (selectedComfort) {
      // Per-facility
      const enhanced = selectedEnhanced;
      const psychOverall = enhanced
        ? computePsychOverall(enhanced.psychological)
        : null;

      if (enhanced && psychOverall !== null) {
        return [
          {
            id: "overall",
            label: "Confort",
            value: `${selectedComfort.overall}`,
            color: scoreColor(selectedComfort.overall),
            icon: Activity,
          },
          {
            id: "technical",
            label: "Técnico",
            value: `${enhanced.technical_overall}`,
            color: scoreColor(enhanced.technical_overall),
            icon: Thermometer,
          },
          {
            id: "psychological",
            label: "Percepción",
            value: `${psychOverall}`,
            color: scoreColor(psychOverall),
            icon: HeartPulse,
          },
          {
            id: "gap",
            label: "Brecha",
            value: `${enhanced.perception_gap}pts`,
            color:
              enhanced.perception_gap > 20
                ? "var(--color-rose-400)"
                : enhanced.perception_gap > 10
                  ? "var(--color-amber-400)"
                  : "var(--color-teal-400)",
            icon: AlertTriangle,
          },
        ];
      }

      // Basic per-facility
      const TrendIcon = trendIcon(selectedComfort.trend);
      return [
        {
          id: "overall",
          label: "Confort",
          value: `${selectedComfort.overall}`,
          color: scoreColor(selectedComfort.overall),
          icon: Activity,
        },
        {
          id: "trend",
          label: "Tendencia",
          value: trendLabel(selectedComfort.trend),
          color:
            selectedComfort.trend === "improving"
              ? "var(--color-teal-400)"
              : selectedComfort.trend === "declining"
                ? "var(--color-rose-400)"
                : "var(--color-silver-400)",
          icon: TrendIcon,
        },
        {
          id: "deficiency",
          label: "Deficiencia",
          value: selectedComfort.dominant_deficiency,
          color: "var(--color-amber-400)",
          icon: AlertTriangle,
        },
        {
          id: "intervention",
          label: "Estado",
          value: selectedComfort.intervention_needed
            ? URGENCY_LABEL[selectedComfort.intervention_urgency] ?? "—"
            : "OK",
          color: selectedComfort.intervention_needed
            ? URGENCY_COLOR[selectedComfort.intervention_urgency]
            : "var(--color-teal-400)",
          icon: HeartPulse,
        },
      ];
    }

    // Aggregate KPIs
    if (!aggregate) return [];
    return [
      {
        id: "overall",
        label: "Confort promedio",
        value: `${aggregate.avgOverall.toFixed(0)}`,
        color: scoreColor(aggregate.avgOverall),
        icon: Activity,
      },
      {
        id: "facilities",
        label: "Espacios",
        value: `${aggregate.total}`,
        color: "var(--color-silver-200)",
        icon: Users,
      },
      {
        id: "interventions",
        label: "Intervenciones",
        value: `${aggregate.interventions.length}`,
        color:
          aggregate.interventions.length > 0
            ? "var(--color-rose-400)"
            : "var(--color-emerald-400)",
        icon: AlertTriangle,
      },
      {
        id: "perception",
        label: "Alineación perc.",
        value: `${aggregate.perceptionAlignment.toFixed(0)}`,
        color: scoreColor(aggregate.perceptionAlignment),
        icon: HeartPulse,
      },
    ];
  }, [selectedComfort, selectedEnhanced, aggregate]);

  // ── Narrative (now string, not boolean) ──
  const narrativeText = useMemo(() => {
    if (!selectedComfort) return null;
    if (typeof selectedComfort.narrative === "string" && selectedComfort.narrative) {
      return selectedComfort.narrative;
    }
    return selectedComfort.intervention_recommendation || null;
  }, [selectedComfort]);

  // ── Handle selection ──
  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // ── Empty guard ──
  if (!aggregate || Object.keys(comfortScores).length === 0) {
    return (
      <EmptyState
        icon={<HeartPulse />}
        title="Sin datos de confort"
        description="Los datos de confort aparecerán cuando los sensores estén activos."
      />
    );
  }

  return (
    <div
      className={cn("fac-comfort", className)}
      data-mode={ambientMode}
      data-prefers-reduced={rm}
    >
      {/* ── Header ── */}
      <header className="fac-comfort__header">
        <HeartPulse className="fac-comfort__header-icon" />
        <h3 className="fac-comfort__title">Inteligencia de Confort</h3>
        {selectedComfort?.trend && (
          <span
            className={`fac-comfort__trend fac-comfort__trend--${selectedComfort.trend}`}
          >
            {trendLabel(selectedComfort.trend)}
          </span>
        )}
        {narrativeText && (
          <span className="fac-comfort__narrative-badge" title={narrativeText}>
            <BookOpen className="fac-comfort__narrative-icon" />
          </span>
        )}
      </header>

      {/* ── KPI Strip ── */}
      <div className="fac-comfort__kpis">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className="fac-comfort__kpi"
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              <div className="fac-comfort__kpi-head">
                <Icon
                  className="fac-comfort__kpi-icon"
                  style={{ color: kpi.color }}
                />
                <span className="fac-comfort__kpi-label">{kpi.label}</span>
              </div>
              <p
                className="fac-comfort__kpi-value"
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Facility Strip ── */}
      <FacilityStrip
        facilities={facilities}
        scores={comfortScores}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      {/* ── Main: Radar + Dimensions ── */}
      <div className="fac-comfort__main">
        <ComfortRadar axes={radarAxes} reducedMotion={rm} />

        <div className="fac-comfort__dims">
          {DIMENSION_KEYS.map((key, i) => {
            if (selectedComfort) {
              const dim = selectedComfort.dimensions[key];
              if (!dim) return null;
              return (
                <DimensionBar
                  key={key}
                  dimKey={key}
                  value={dim.value}
                  gap={dim.gap}
                  sensor={dim.sensor}
                  perception={dim.perception}
                  status={dim.status}
                  recommendation={dim.recommendation}
                  index={i}
                  reducedMotion={rm}
                />
              );
            }

            // Aggregate
            const avg = aggregate.dimAvgs[key];
            if (!avg) return null;
            return (
              <DimensionBar
                key={key}
                dimKey={key}
                value={avg.score}
                gap={avg.gap}
                sensor={"\u2014"}
                perception={"\u2014"}
                status=""
                index={i}
                reducedMotion={rm}
              />
            );
          })}
        </div>
      </div>

      {/* ── Psychological Dimensions (Enhanced only + facility selected) ── */}
      {selectedEnhanced && (
        <PsychSection
          psychological={selectedEnhanced.psychological}
          reducedMotion={rm}
        />
      )}

      {/* ── Perception Gap Panel (Enhanced only + facility selected) ── */}
      {selectedEnhanced && (
        <PerceptionGapPanel
          technicalOverall={selectedEnhanced.technical_overall}
          psychOverall={computePsychOverall(selectedEnhanced.psychological)}
          gap={selectedEnhanced.perception_gap}
          description={selectedEnhanced.perception_gap_description}
        />
      )}

      {/* ── Intervention Panel (per-facility) ── */}
      {selectedComfort?.intervention_needed && selectedFacility && (
        <InterventionPanel
          urgency={selectedComfort.intervention_urgency}
          recommendation={selectedComfort.intervention_recommendation}
          facilityName={selectedFacility.name}
          onAdjust={
            onAdjustConditions
              ? () => onAdjustConditions(selectedFacility.id)
              : undefined
          }
        />
      )}

      {/* ── Narrative ── */}
      {narrativeText && (
        <p className="fac-comfort__narrative">{narrativeText}</p>
      )}

      {/* ── Intervention Alert (aggregate) ── */}
      {selectedId === null && aggregate.interventions.length > 0 && (
        <InterventionAlert interventions={aggregate.interventions} />
      )}
    </div>
  );
}