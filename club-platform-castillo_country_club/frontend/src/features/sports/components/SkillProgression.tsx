// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SkillProgression.tsx
// §B3.14 — Skill Progression V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// SVG trajectory curve replaces static progress bars.
// Historical line + predicted dashed line. Plateau zones
// highlighted. Breakthrough markers. Event annotations.
// Per-sport breakdown below the chart.
// Living Protocol: 7/7
//
// Aha Moment: "La curva cuenta tu historia — plateaus,
// breakthroughs, y hacia dónde vas."
//
// Changes from V1:
//   ✗ cn() → BEM classes
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color: X }} → data-attributes
//   ✗ MOCK_PROGRESSIONS → real data via props
//   ✗ SportProgression local type → AthleticProfile
//   ✗ className prop → removed
//   ✗ Static progress bars → SVG trajectory curve
//   ✓ data-trend, data-level, data-mode, data-event
//   ✓ Plateau zone visualization
//   ✓ Predicted trajectory (dashed)
//   ✓ Breakthrough markers
//   ✓ Narrative (LP 7)
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SkillProgression
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type {
  AthleticProfile,
  SkillTrajectoryPoint,
  SportType,
  SportsDashboardMode,
} from "../types";
import {
  SPORT_CONFIG,
  ATHLETIC_LEVEL_CONFIG,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./SkillProgression.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SkillProgressionProps {
  profile: AthleticProfile | null;
  ambientMode?: SportsDashboardMode;
  onSportSelect?: (sport: SportType) => void;
}

type TrendDirection = "improving" | "stable" | "declining";

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const CHART_WIDTH = 520;
const CHART_HEIGHT = 200;
const CHART_PAD = { top: 20, right: 20, bottom: 30, left: 40 };
const CHART_INNER_W = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
const CHART_INNER_H = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

const Y_TICKS = [0, 25, 50, 75, 100];

const EVENT_MARKERS: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  breakthrough:    { icon: Zap,        color: "var(--color-gold-400, #d4af37)",   label: "Breakthrough" },
  plateau_start:   { icon: AlertTriangle, color: "var(--color-amber-400, #d4a017)", label: "Inicio plateau" },
  plateau_end:     { icon: Target,     color: "var(--color-emerald-400, #3daa70)", label: "Fin plateau" },
  injury:          { icon: AlertTriangle, color: "var(--color-rose-400, #e54d4d)", label: "Lesión" },
  coaching_start:  { icon: Target,     color: "var(--color-teal-400, #2a9ab5)",   label: "Inicio coaching" },
  competition:     { icon: Target,     color: "var(--color-violet-400, #8b5cf6)", label: "Competencia" },
};

// ═══════════════════════════════════════════════════════════
// §3 — SVG MATH HELPERS
// ═══════════════════════════════════════════════════════════

function scaleX(index: number, total: number): number {
  if (total <= 1) return CHART_PAD.left + CHART_INNER_W / 2;
  return CHART_PAD.left + (index / (total - 1)) * CHART_INNER_W;
}

function scaleY(value: number): number {
  return CHART_PAD.top + CHART_INNER_H - (value / 100) * CHART_INNER_H;
}

function buildLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

// ═══════════════════════════════════════════════════════════
// §4 — DATA HELPERS
// ═══════════════════════════════════════════════════════════

function detectTrend(points: SkillTrajectoryPoint[]): TrendDirection {
  if (points.length < 3) return "stable";
  const recent = points.slice(-5);
  const first = recent[0]?.overall ?? 0;
  const last = recent[recent.length - 1]?.overall ?? 0;
  const delta = last - first;
  if (delta > 3) return "improving";
  if (delta < -3) return "declining";
  return "stable";
}

function findPlateauZones(
  points: SkillTrajectoryPoint[],
): Array<{ startIndex: number; endIndex: number }> {
  const zones: Array<{ startIndex: number; endIndex: number }> = [];
  let zoneStart: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const isPlateau = points[i].event === "plateau_start";
    const isEnd = points[i].event === "plateau_end";

    if (isPlateau && zoneStart === null) {
      zoneStart = i;
    }
    if ((isEnd || i === points.length - 1) && zoneStart !== null) {
      zones.push({ startIndex: zoneStart, endIndex: i });
      zoneStart = null;
    }
  }

  return zones;
}

function buildProgressionNarrative(
  profile: AthleticProfile,
  trend: TrendDirection,
): string {
  const levelConfig = ATHLETIC_LEVEL_CONFIG[profile.athleticLevel];
  const trendPart =
    trend === "improving"
      ? "Progresión ascendente"
      : trend === "declining"
        ? "Tendencia descendente"
        : "Rendimiento estable";

  const plateauPart =
    profile.plateauDurationWeeks > 0
      ? ` Plateau de ${profile.plateauDurationWeeks} semana(s) detectado.`
      : "";

  const breakthroughPart =
    profile.breakthroughProbability > 50
      ? ` Probabilidad de breakthrough: ${profile.breakthroughProbability}%.`
      : "";

  const sportCount = Object.keys(profile.sportBreakdown).length;

  return `${trendPart}. Nivel: ${levelConfig.label} (${profile.overallScore}/100). ${sportCount} deporte${sportCount !== 1 ? "s" : ""} activo${sportCount !== 1 ? "s" : ""}.${plateauPart}${breakthroughPart}`;
}

// ═══════════════════════════════════════════════════════════
// §5 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §5.1 TrajectoryChart ─────────────────────────────────

function TrajectoryChart({ trajectory, predictedTrajectory, plateauZones }: {
  trajectory: SkillTrajectoryPoint[];
  predictedTrajectory: SkillTrajectoryPoint[];
  plateauZones: Array<{ startIndex: number; endIndex: number }>;
  reducedMotion: boolean;
  ambientMode: SportsDashboardMode;
}) {
  // Build historical line points
  const histPoints = useMemo(
    () =>
      trajectory.map((pt, i) => ({
        x: scaleX(i, trajectory.length + predictedTrajectory.length),
        y: scaleY(pt.overall),
      })),
    [trajectory, predictedTrajectory.length],
  );

  // Build predicted line points (continuation)
  const predPoints = useMemo(() => {
    const offset = trajectory.length;
    const total = trajectory.length + predictedTrajectory.length;
    return predictedTrajectory.map((pt, i) => ({
      x: scaleX(offset + i, total),
      y: scaleY(pt.overall),
    }));
  }, [trajectory, predictedTrajectory]);

  const histPath = useMemo(() => buildLinePath(histPoints), [histPoints]);
  const predPath = useMemo(() => buildLinePath(predPoints), [predPoints]);

  // Total points for x-axis labels
  const totalPoints = trajectory.length + predictedTrajectory.length;

  return (
    <svg
      className="spt-prog__chart"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label="Curva de progresión"
    >
      {/* Y-axis grid lines + labels */}
      {Y_TICKS.map((tick) => {
        const y = scaleY(tick);
        return (
          <g key={`ytick-${tick}`}>
            <line
              className="spt-prog__grid-line"
              x1={CHART_PAD.left}
              y1={y.toFixed(1)}
              x2={CHART_WIDTH - CHART_PAD.right}
              y2={y.toFixed(1)}
            />
            <text
              className="spt-prog__y-label"
              x={CHART_PAD.left - 6}
              y={(y + 3).toFixed(1)}
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* Plateau zones */}
      {plateauZones.map((zone, i) => {
        const x1 = scaleX(zone.startIndex, totalPoints);
        const x2 = scaleX(zone.endIndex, totalPoints);
        return (
          <rect
            key={`plateau-${i}`}
            className="spt-prog__plateau-zone"
            x={x1.toFixed(1)}
            y={CHART_PAD.top}
            width={(x2 - x1).toFixed(1)}
            height={CHART_INNER_H}
          />
        );
      })}

      {/* Divider: historical | predicted */}
      {predictedTrajectory.length > 0 && (
        <line
          className="spt-prog__divider"
          x1={scaleX(trajectory.length - 0.5, totalPoints).toFixed(1)}
          y1={CHART_PAD.top}
          x2={scaleX(trajectory.length - 0.5, totalPoints).toFixed(1)}
          y2={CHART_HEIGHT - CHART_PAD.bottom}
        />
      )}

      {/* Historical line */}
      {histPath && (
        <path className="spt-prog__line spt-prog__line--historical" d={histPath} />
      )}

      {/* Predicted line (dashed) */}
      {predPath && (
        <path className="spt-prog__line spt-prog__line--predicted" d={predPath} />
      )}

      {/* Historical data points + event markers */}
      {histPoints.map((pt, i) => {
        const dataPoint = trajectory[i];
        const event = dataPoint?.event;
        const eventCfg = event ? EVENT_MARKERS[event] : null;

        return (
          <g key={`hpt-${i}`}>
            <circle
              className="spt-prog__dot"
              cx={pt.x.toFixed(1)}
              cy={pt.y.toFixed(1)}
              r={event ? 5 : 3}
              data-event={event ?? "none"}
            />
            {/* Event label */}
            {eventCfg && (
              <>
                <line
                  className="spt-prog__event-line"
                  x1={pt.x.toFixed(1)}
                  y1={pt.y.toFixed(1)}
                  x2={pt.x.toFixed(1)}
                  y2={(pt.y - 14).toFixed(1)}
                  stroke={eventCfg.color}
                />
                <text
                  className="spt-prog__event-label"
                  x={pt.x.toFixed(1)}
                  y={(pt.y - 17).toFixed(1)}
                  textAnchor="middle"
                  fill={eventCfg.color}
                >
                  {eventCfg.label}
                </text>
              </>
            )}
            {/* Confidence tooltip */}
            <title>
              {`${dataPoint.date}: ${dataPoint.overall}/100 (confianza: ${dataPoint.confidence}%)`}
            </title>
          </g>
        );
      })}

      {/* Predicted data points */}
      {predPoints.map((pt, i) => {
        const dataPoint = predictedTrajectory[i];
        return (
          <g key={`ppt-${i}`}>
            <circle
              className="spt-prog__dot spt-prog__dot--predicted"
              cx={pt.x.toFixed(1)}
              cy={pt.y.toFixed(1)}
              r={2.5}
            />
            <title>
              {`Predicción ${dataPoint.date}: ${dataPoint.overall}/100 (confianza: ${dataPoint.confidence}%)`}
            </title>
          </g>
        );
      })}

      {/* X-axis labels (first, middle, last) */}
      {trajectory.length > 0 && (
        <>
          <text
            className="spt-prog__x-label"
            x={scaleX(0, totalPoints).toFixed(1)}
            y={CHART_HEIGHT - 6}
            textAnchor="start"
          >
            {trajectory[0]?.date?.slice(5) ?? ""}
          </text>
          {trajectory.length > 2 && (
            <text
              className="spt-prog__x-label"
              x={scaleX(Math.floor(trajectory.length / 2), totalPoints).toFixed(1)}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
            >
              {trajectory[Math.floor(trajectory.length / 2)]?.date?.slice(5) ?? ""}
            </text>
          )}
          <text
            className="spt-prog__x-label"
            x={scaleX(trajectory.length - 1, totalPoints).toFixed(1)}
            y={CHART_HEIGHT - 6}
            textAnchor="end"
          >
            {trajectory[trajectory.length - 1]?.date?.slice(5) ?? ""}
          </text>
        </>
      )}
    </svg>
  );
}

// ── §5.2 SportBreakdownCard ──────────────────────────────

function SportBreakdownCard({
  sport,
  data,
  ambientMode,
  onSelect,
}: {
  sport: SportType;
  data: import("../types").SportSpecificProfile;
  ambientMode: SportsDashboardMode;
  onSelect?: (sport: SportType) => void;
}) {
  const cfg = SPORT_CONFIG[sport];
  const levelCfg = ATHLETIC_LEVEL_CONFIG[data.level];

  const trendDir: TrendDirection =
    data.progressionRate > 1
      ? "improving"
      : data.progressionRate < -1
        ? "declining"
        : "stable";

  return (
    <Button
      variant="unstyled"
      type="button"
      className="spt-prog__sport-card"
      data-trend={trendDir}
      data-level={data.level}
      data-mode={ambientMode}
      onClick={() => onSelect?.(sport)}
    >
      <div className="spt-prog__sport-header">
        <span className="spt-prog__sport-icon">{cfg?.icon ?? "🏅"}</span>
        <div className="spt-prog__sport-info">
          <p className="spt-prog__sport-name">{cfg?.label ?? sport}</p>
          <span className="spt-prog__sport-level" data-level={data.level}>
            {levelCfg.label}
          </span>
        </div>
        <div className="spt-prog__sport-trend" data-trend={trendDir}>
          {trendDir === "improving" && <TrendingUp className="spt-prog__trend-icon" />}
          {trendDir === "declining" && <TrendingDown className="spt-prog__trend-icon" />}
          {trendDir === "stable" && <Minus className="spt-prog__trend-icon" />}
        </div>
      </div>

      <div className="spt-prog__sport-stats">
        <span className="spt-prog__sport-stat">
          {data.sessionsCount} sesiones
        </span>
        <span className="spt-prog__sport-stat">
          {data.totalHours.toFixed(0)}h
        </span>
        <span className="spt-prog__sport-stat" data-trend={trendDir}>
          {data.progressionRate > 0 ? "+" : ""}
          {data.progressionRate.toFixed(1)}/mes
        </span>
      </div>

      {data.bestDiscipline && (
        <p className="spt-prog__sport-discipline">
          Fuerte: {data.bestDiscipline}
        </p>
      )}
    </Button>
  );
}

// ── §5.3 SummaryStats ────────────────────────────────────

function SummaryStats({ profile }: { profile: AthleticProfile }) {
  const sportCount = Object.keys(profile.sportBreakdown).length;
  const improvingCount = Object.values(profile.sportBreakdown).filter(
    (s) => s.progressionRate > 1,
  ).length;
  const totalHours = Object.values(profile.sportBreakdown).reduce(
    (sum, s) => sum + s.totalHours,
    0,
  );

  return (
    <div className="spt-prog__summary">
      <span className="spt-prog__summary-item">
        🏅 <strong>{sportCount}</strong> deporte{sportCount !== 1 ? "s" : ""}
      </span>
      <span className="spt-prog__summary-item">
        📈 <strong>{improvingCount}</strong> mejorando
      </span>
      <span className="spt-prog__summary-item">
        ⏱️ <strong>{totalHours.toFixed(0)}h</strong> totales
      </span>
      {profile.breakthroughProbability > 50 && (
        <span className="spt-prog__summary-item spt-prog__summary-item--highlight">
          ⚡ {profile.breakthroughProbability}% prob. breakthrough
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §6 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SkillProgression({
  profile,
  ambientMode = "calm",
  onSportSelect,
}: SkillProgressionProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [selectedSport, setSelectedSport] = useState<SportType | "all">("all");

  // ── §6.1 — Trend detection ────────────────────────────
  const trend = useMemo(
    () => (profile ? detectTrend(profile.trajectory) : "stable"),
    [profile],
  );

  // ── §6.2 — Plateau zones ──────────────────────────────
  const plateauZones = useMemo(
    () => (profile ? findPlateauZones(profile.trajectory) : []),
    [profile],
  );

  // ── §6.3 — Narrative ──────────────────────────────────
  const narrative = useMemo(
    () => (profile ? buildProgressionNarrative(profile, trend) : ""),
    [profile, trend],
  );

  // ── §6.4 — Filtered sports ────────────────────────────
  const sportEntries = useMemo(() => {
    if (!profile) return [];
    const entries = Object.entries(profile.sportBreakdown) as Array<
      [SportType, import("../types").SportSpecificProfile]
    >;
    if (selectedSport === "all") return entries;
    return entries.filter(([sport]) => sport === selectedSport);
  }, [profile, selectedSport]);

  const availableSports = useMemo(
    () => (profile ? (Object.keys(profile.sportBreakdown) as SportType[]) : []),
    [profile],
  );

  // ── §6.5 — Degraded ──────────────────────────────────
  if (!profile || profile.totalSessions === 0) {
    return (
      <section
        className="spt-prog"
        data-mode={ambientMode}
        role="region"
        aria-label="Progresión deportiva"
      >
        <EmptyState
          icon={<Target className="w-5 h-5" />}
          title="Sin datos de progresión"
          description="Necesitamos al menos 3 sesiones para mostrar la curva de progresión. La gráfica revelará patrones, plateaus y predicciones."
          compact
        />
      </section>
    );
  }

  // ── §6.6 — Render ─────────────────────────────────────
  return (
    <section
      className="spt-prog"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      data-trend={trend}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-prog__header">
        <div className="spt-prog__header-left">
          <h3 className="spt-prog__title">Progresión Deportiva</h3>
          <span className="spt-prog__level" data-level={profile.athleticLevel}>
            {ATHLETIC_LEVEL_CONFIG[profile.athleticLevel].label}
          </span>
          <span className="spt-prog__trend-badge" data-trend={trend}>
            {trend === "improving" && <TrendingUp className="spt-prog__trend-icon" />}
            {trend === "declining" && <TrendingDown className="spt-prog__trend-icon" />}
            {trend === "stable" && <Minus className="spt-prog__trend-icon" />}
            {trend === "improving" ? "Mejorando" : trend === "declining" ? "Descendiendo" : "Estable"}
          </span>
        </div>

        {/* Sport filter */}
        <div className="spt-prog__filter" role="tablist" aria-label="Filtro deporte">
          <Button
            variant="unstyled"
            type="button"
            role="tab"
            aria-selected={selectedSport === "all"}
            className="spt-prog__filter-btn"
            data-active={selectedSport === "all"}
            onClick={() => setSelectedSport("all")}
          >
            Todos
          </Button>
          {availableSports.map((sport) => {
            const cfg = SPORT_CONFIG[sport];
            return (
              <Button
                variant="unstyled"
                key={sport}
                type="button"
                role="tab"
                aria-selected={selectedSport === sport}
                className="spt-prog__filter-btn"
                data-active={selectedSport === sport}
                onClick={() => setSelectedSport(sport)}
              >
                {cfg?.icon} {cfg?.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Summary stats ── */}
      <SummaryStats profile={profile} />

      {/* ── Trajectory Chart (SVG) ── */}
      <div className="spt-prog__chart-container">
        <TrajectoryChart
          trajectory={profile.trajectory}
          predictedTrajectory={profile.predictedTrajectory}
          plateauZones={plateauZones}
          reducedMotion={rm}
          ambientMode={ambientMode}
        />

        {/* Legend */}
        <div className="spt-prog__chart-legend">
          <span className="spt-prog__legend-item">
            <span className="spt-prog__legend-line spt-prog__legend-line--historical" />
            Histórico
          </span>
          <span className="spt-prog__legend-item">
            <span className="spt-prog__legend-line spt-prog__legend-line--predicted" />
            Predicción
          </span>
          {plateauZones.length > 0 && (
            <span className="spt-prog__legend-item">
              <span className="spt-prog__legend-line spt-prog__legend-line--plateau" />
              Plateau
            </span>
          )}
        </div>
      </div>

      {/* ── Per-Sport Breakdown Cards ── */}
      {sportEntries.length > 0 && (
        <div className="spt-prog__sports-grid">
          {sportEntries.map(([sport, data]) => (
            <SportBreakdownCard
              key={sport}
              sport={sport}
              data={data}
              ambientMode={ambientMode}
              onSelect={onSportSelect}
            />
          ))}
        </div>
      )}

      {/* ── Footer: Narrative ── */}
      <div className="spt-prog__footer">
        <p className="spt-prog__narrative">{narrative}</p>
      </div>
    </section>
  );
}