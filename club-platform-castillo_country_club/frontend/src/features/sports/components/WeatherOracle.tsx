// ═══════════════════════════════════════════════════════════
// src/features/sports/components/WeatherOracle.tsx
// §B3.10 — Weather Oracle
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// SVG semicircular gauge showing weather impact (0-1).
// 3 zones: red (0-0.5), amber (0.5-0.8), green (0.8-1).
// Forecast cards for upcoming days. Impact on outdoor sports.
// Season risk from CR_WEATHER_RISK.
// Living Protocol: 7/7
//
// Aha Moment: "El clima decide por ti. Antes de que pase."
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component WeatherOracle
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import type {
  WeatherImpact,
  DemandForecastPoint,
  SportType,
  SportsDashboardMode,
} from "../types";
import {
  CR_WEATHER_RISK,
  SPORT_CONFIG,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./WeatherOracle.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface WeatherOracleProps {
  /** 0-1 weather multiplier. Pre-computed by parent via computeWeatherMultiplier() */
  multiplier: number;
  /** Current condition key (e.g. "sunny", "light_rain") */
  condition: string;
  /** Detailed weather impact assessment */
  weatherImpact: WeatherImpact | null;
  /** Hourly demand forecast (optional, for forecast cards) */
  forecast?: DemandForecastPoint[];
  /** Outdoor sports affected by current weather */
  affectedOutdoorSports?: SportType[];
  /** Dashboard ambient mode */
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const GAUGE_SIZE = 200;
const GAUGE_CX = GAUGE_SIZE / 2;
const GAUGE_CY = GAUGE_SIZE * 0.6;
const GAUGE_RADIUS = 70;
const GAUGE_START_ANGLE = -210;
const GAUGE_END_ANGLE = 30;
const GAUGE_TOTAL_ANGLE = GAUGE_END_ANGLE - GAUGE_START_ANGLE;

const CONDITION_LABELS: Record<string, string> = {
  sunny: "Soleado",
  partly_cloudy: "Parcialmente nublado",
  cloudy: "Nublado",
  light_rain: "Lluvia ligera",
  rain: "Lluvia",
  heavy_rain: "Lluvia intensa",
  thunderstorm: "Tormenta eléctrica",
  hot: "Calor extremo",
  cold: "Frío",
  windy: "Viento fuerte",
};

const CONDITION_ICONS: Record<string, typeof Sun> = {
  sunny: Sun,
  partly_cloudy: Cloud,
  cloudy: Cloud,
  light_rain: CloudRain,
  rain: CloudRain,
  heavy_rain: CloudRain,
  thunderstorm: CloudLightning,
  hot: Thermometer,
  cold: Thermometer,
  windy: Wind,
};
const ZONE_THRESHOLDS = {
  danger: 0.5,
  warning: 0.8,
} as const;

// ═══════════════════════════════════════════════════════════
// §3 — SVG MATH HELPERS
// ═══════════════════════════════════════════════════════════

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    "M", start.x.toFixed(2), start.y.toFixed(2),
    "A", r.toFixed(2), r.toFixed(2), 0, largeArc, 0,
    end.x.toFixed(2), end.y.toFixed(2),
  ].join(" ");
}

// ═══════════════════════════════════════════════════════════
// §4 — NARRATIVE HELPERS
// ═══════════════════════════════════════════════════════════

function getZone(
  multiplier: number,
): "danger" | "warning" | "good" {
  if (multiplier < ZONE_THRESHOLDS.danger) return "danger";
  if (multiplier < ZONE_THRESHOLDS.warning) return "warning";
  return "good";
}

function getZoneLabel(zone: "danger" | "warning" | "good"): string {
  switch (zone) {
    case "danger": return "Riesgo alto";
    case "warning": return "Precaución";
    case "good": return "Condiciones favorables";
  }
}

function buildNarrative(
  multiplier: number,
  condition: string,
  weatherImpact: WeatherImpact | null,
  affectedSports: SportType[],
  seasonalRisk: { label: string; level: string },
): string {
  const pct = Math.round(multiplier * 100);
  const condLabel = CONDITION_LABELS[condition] ?? condition;
  const zone = getZone(multiplier);

  const main =
    `Clima: ${condLabel} — multiplier ${pct}%. ${getZoneLabel(zone)}.`;

  const impactPart = weatherImpact
    ? ` Severidad: ${weatherImpact.severity}/100. ${weatherImpact.recommendation}`
    : "";

  const sportPart =
    affectedSports.length > 0
      ? ` Deportes outdoor afectados: ${affectedSports.map((s) => SPORT_CONFIG[s]?.label ?? s).join(", ")}.`
      : "";

  const seasonPart = ` Estación actual: ${seasonalRisk.label} (riesgo ${seasonalRisk.level}).`;

  return `${main}${impactPart}${sportPart}${seasonPart}`;
}

function getSeasonalRisk(): { label: string; level: string; color: string } {
  const month = new Date().getMonth() + 1;
  return CR_WEATHER_RISK[month] ?? { label: "Desconocido", level: "medium", color: "var(--color-amber-400)" };
}

// ═══════════════════════════════════════════════════════════
// §5 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §5.1 Gauge ───────────────────────────────────────────

function WeatherGauge({ multiplier }: {
  multiplier: number;
  reducedMotion: boolean;
}) {
  const zone = getZone(multiplier);
  const pct = Math.round(multiplier * 100);

  // Arc paths
  const bgArc = describeArc(
    GAUGE_CX, GAUGE_CY, GAUGE_RADIUS,
    GAUGE_START_ANGLE, GAUGE_END_ANGLE,
  );

  const valueAngle =
    GAUGE_START_ANGLE + GAUGE_TOTAL_ANGLE * Math.min(multiplier, 1);

  const valueArc = describeArc(
    GAUGE_CX, GAUGE_CY, GAUGE_RADIUS,
    GAUGE_START_ANGLE, valueAngle,
  );

  // Zone arcs (background bands)
  const dangerEnd = GAUGE_START_ANGLE + GAUGE_TOTAL_ANGLE * ZONE_THRESHOLDS.danger;
  const warningEnd = GAUGE_START_ANGLE + GAUGE_TOTAL_ANGLE * ZONE_THRESHOLDS.warning;

  const dangerArc = describeArc(
    GAUGE_CX, GAUGE_CY, GAUGE_RADIUS,
    GAUGE_START_ANGLE, dangerEnd,
  );
  const warningArc = describeArc(
    GAUGE_CX, GAUGE_CY, GAUGE_RADIUS,
    dangerEnd, warningEnd,
  );
  const goodArc = describeArc(
    GAUGE_CX, GAUGE_CY, GAUGE_RADIUS,
    warningEnd, GAUGE_END_ANGLE,
  );

  // Needle endpoint
  const needleEnd = polarToCartesian(
    GAUGE_CX, GAUGE_CY, GAUGE_RADIUS - 16, valueAngle,
  );

  return (
    <svg
      className="spt-weather__gauge-svg"
      viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE * 0.7}`}
      role="img"
      aria-label={`Multiplier: ${pct}% — ${getZoneLabel(zone)}`}
    >
      {/* Zone bands */}
      <path className="spt-weather__zone spt-weather__zone--danger" d={dangerArc} />
      <path className="spt-weather__zone spt-weather__zone--warning" d={warningArc} />
      <path className="spt-weather__zone spt-weather__zone--good" d={goodArc} />

      {/* Background arc */}
      <path className="spt-weather__bg-arc" d={bgArc} />

      {/* Value arc */}
      <path
        className="spt-weather__value-arc"
        data-zone={zone}
        d={valueArc}
      />

      {/* Needle */}
      <line
        className="spt-weather__needle"
        data-zone={zone}
        x1={GAUGE_CX}
        y1={GAUGE_CY}
        x2={needleEnd.x.toFixed(2)}
        y2={needleEnd.y.toFixed(2)}
      />

      {/* Center dot */}
      <circle
        className="spt-weather__center-dot"
        cx={GAUGE_CX}
        cy={GAUGE_CY}
        r={4}
      />

      {/* Value label */}
      <text
        className="spt-weather__gauge-value"
        x={GAUGE_CX}
        y={GAUGE_CY + 24}
        textAnchor="middle"
        data-zone={zone}
      >
        {pct}%
      </text>

      {/* Zone labels */}
      <text className="spt-weather__zone-label spt-weather__zone-label--danger"
        x={GAUGE_CX - GAUGE_RADIUS - 8} y={GAUGE_CY + 4}
        textAnchor="end"
      >Riesgo</text>
      <text className="spt-weather__zone-label spt-weather__zone-label--good"
        x={GAUGE_CX + GAUGE_RADIUS + 8} y={GAUGE_CY + 4}
        textAnchor="start"
      >Ideal</text>
    </svg>
  );
}

// ── §5.2 ForecastCard ────────────────────────────────────

function ForecastCard({
  point,
  index,
  ambientMode,
}: {
  point: DemandForecastPoint;
  index: number;
  ambientMode: SportsDashboardMode;
}) {
  const weatherFactor = point.weatherFactor ?? 1;
  const wfPct = Math.round(weatherFactor * 100);
  const demandPct = Math.round(point.predictedDemand);

  return (
    <div
      className="spt-weather__forecast-card"
      data-mode={ambientMode}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <p className="spt-weather__forecast-hour">{point.hour}</p>
      <p className="spt-weather__forecast-demand">
        Demanda: <strong>{demandPct}%</strong>
      </p>
      <p className="spt-weather__forecast-wf">
        Clima: <strong>{wfPct}%</strong>
      </p>
      <p className="spt-weather__forecast-conf">
        Confianza: {Math.round(point.confidence)}%
      </p>
    </div>
  );
}

// ── §5.3 AffectedSportsList ──────────────────────────────

function AffectedSportsList({
  sports,
}: {
  sports: SportType[];
}) {
  if (sports.length === 0) return null;

  return (
    <div className="spt-weather__affected">
      <p className="spt-weather__affected-label">
        <Droplets className="spt-weather__affected-icon" />
        Deportes outdoor afectados:
      </p>
      <div className="spt-weather__affected-list">
        {sports.map((sport) => (
          <span key={sport} className="spt-weather__affected-badge">
            {SPORT_CONFIG[sport]?.icon ?? "🏃"} {SPORT_CONFIG[sport]?.label ?? sport}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §6 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function WeatherOracle({
  multiplier,
  condition,
  weatherImpact,
  forecast,
  affectedOutdoorSports = [],
  ambientMode = "calm",
}: WeatherOracleProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const zone = useMemo(() => getZone(multiplier), [multiplier]);

  const seasonalRisk = useMemo(() => getSeasonalRisk(), []);

  const narrative = useMemo(
    () => buildNarrative(multiplier, condition, weatherImpact, affectedOutdoorSports, seasonalRisk),
    [multiplier, condition, weatherImpact, affectedOutdoorSports, seasonalRisk],
  );

  const CondIcon = CONDITION_ICONS[condition] ?? Cloud;
  const condLabel = CONDITION_LABELS[condition] ?? condition;

  // ── §6.1 — Degraded ───────────────────────────────────
  if (multiplier === 1 && !weatherImpact && (!forecast || forecast.length === 0)) {
    return (
      <section
        className="spt-weather"
        data-mode={ambientMode}
        role="region"
        aria-label="Oráculo del clima"
      >
        <EmptyState
          icon={<Sun className="w-5 h-5" />}
          title="Sin datos meteorológicos"
          description="Cuando el servicio de pronóstico esté disponible, el impacto del clima en las reservas outdoor se mostrará aquí."
          compact
        />
      </section>
    );
  }

  // ── §6.2 — Render ─────────────────────────────────────
  return (
    <section
      className="spt-weather"
      data-mode={ambientMode}
      data-zone={zone}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-weather__header">
        <div className="spt-weather__header-left">
          <CondIcon className="spt-weather__cond-icon" data-zone={zone} />
          <div className="spt-weather__header-text">
            <h3 className="spt-weather__title">Oráculo del Clima</h3>
            <p className="spt-weather__condition">{condLabel}</p>
          </div>
        </div>
        <div
          className="spt-weather__season-badge"
          data-risk-level={seasonalRisk.level}
        >
          🗓️ {seasonalRisk.label}
        </div>
      </div>

      {/* ── Gauge ── */}
      <div className="spt-weather__gauge-container">
        <WeatherGauge multiplier={multiplier} reducedMotion={rm} />
        <p className="spt-weather__gauge-narrative" data-zone={zone}>
          {getZoneLabel(zone)}
        </p>
      </div>

      {/* ── Weather Impact (if available) ── */}
      {weatherImpact && (
        <div className="spt-weather__impact" data-zone={zone}>
          <div className="spt-weather__impact-header">
            <AlertTriangle className="spt-weather__impact-icon" />
            <span className="spt-weather__impact-severity">
              Severidad: {weatherImpact.severity}/100
            </span>
          </div>
          <p className="spt-weather__impact-recommendation">
            {weatherImpact.recommendation}
          </p>
          {weatherImpact.optimalReschedule && (
            <p className="spt-weather__impact-reschedule">
              Reprogramar: {weatherImpact.optimalReschedule}
            </p>
          )}
        </div>
      )}

      {/* ── Affected Outdoor Sports ── */}
      <AffectedSportsList sports={affectedOutdoorSports} />

      {/* ── Forecast cards ── */}
      {forecast && forecast.length > 0 && (
        <div className="spt-weather__forecast">
          <p className="spt-weather__forecast-title">Próximas horas</p>
          <div className="spt-weather__forecast-grid">
            {forecast.slice(0, 6).map((point, i) => (
              <ForecastCard
                key={point.hour}
                point={point}
                index={i}
                ambientMode={ambientMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer: Narrative ── */}
      <div className="spt-weather__footer">
        <p className="spt-weather__narrative">{narrative}</p>
      </div>
    </section>
  );
}