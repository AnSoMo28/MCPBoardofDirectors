// src/features/facilities/components/AmenityHeatmap.tsx
// ═══════════════════════════════════════════════════════════
// AMENITY HEATMAP — "El Campo Térmico"
//
// Utilization grid + comfort overlay (Prop #4: 5D Comfort).
// Each cell: utilization level, capacity bar, trend, peak hours,
// comfort score, and hover details (forecast, revenue, rate).
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — cell entry stagger, bar fill animation
//   ✅ SENSE 2: REACCIÓN — cell hover translateY(-2px), details reveal
//   ✅ SENSE 3: MEMORIA — utilization %, trend, comfort, forecast
//   ✅ SENSE 4: INTENCIÓN — urgency encoding on comfort intervention
//   ✅ SENSE 5: SINIESTRÍA — critical utilization = pulse border
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — heatmap summary sentence
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  DollarSign,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import {
  getUtilizationLevel,
  FACILITY_TYPE_DISPLAY,
} from "../types";

import type {
  AmenityUtilizationResponse,
  AmenityUtilizationItem,
  ComfortScore,
  TrendDirection,
  FacilitiesDashboardMode,
} from "../types";

import "./AmenityHeatmap.css";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs.toLocaleString("es-CR")}`;
}

const TREND_ICON: Record<TrendDirection, React.ComponentType<{ className?: string }>> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const TREND_LABEL: Record<TrendDirection, string> = {
  improving: "Mejorando",
  stable: "Estable",
  declining: "Descendiendo",
};

const COMFORT_URGENCY_LABEL: Record<string, string> = {
  low: "Estable",
  medium: "Atención",
  high: "Urgente",
  critical: "Crítico",
};

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  utilization: AmenityUtilizationResponse,
  comfortInterventionCount: number,
): string {
  const parts: string[] = [];
  parts.push(`${utilization.facilities.length} espacios analizados.`);
  parts.push(`Utilización promedio: ${utilization.overall_utilization_pct.toFixed(1)}%.`);
  parts.push(`Pico: ${utilization.peak_facility}. Menor: ${utilization.lowest_facility}.`);

  if (comfortInterventionCount > 0) {
    parts.push(`${comfortInterventionCount} espacio${comfortInterventionCount > 1 ? "s" : ""} requiere${comfortInterventionCount === 1 ? "" : "n"} intervención de confort.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface AmenityHeatmapProps {
  utilization: AmenityUtilizationResponse;
  comfortScores?: Record<string, ComfortScore>;
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Heatmap Cell
// ═══════════════════════════════════════════════════════════

function HeatmapCell({
  item,
  comfort,
  index,
  prefersReduced,
}: {
  item: AmenityUtilizationItem;
  comfort?: ComfortScore;
  index: number;
  prefersReduced: boolean;
}) {
  const level = getUtilizationLevel(item.utilization_pct);
  const typeDisplay = FACILITY_TYPE_DISPLAY[
    item.facility_type as keyof typeof FACILITY_TYPE_DISPLAY
  ];
  const TrendComp = TREND_ICON[item.trend] ?? Minus;

  return (
    <div
      className="fac-heat__cell"
      data-util-level={level}
      data-trend={item.trend}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      {/* Top accent */}
      <div className="fac-heat__cell-accent" data-util-level={level} />

      {/* Header */}
      <div className="fac-heat__cell-head">
        <div className="fac-heat__cell-head-left">
          <span className="fac-heat__cell-type">
            {typeDisplay?.label ?? item.facility_type}
          </span>
          <span className="fac-heat__cell-name">
            {item.facility_name}
          </span>
        </div>
        <span className="fac-heat__cell-level" data-util-level={level}>
          {level}
        </span>
      </div>

      {/* Utilization score */}
      <div className="fac-heat__cell-score-row">
        <span className="fac-heat__cell-score" data-util-level={level}>
          {item.utilization_pct.toFixed(0)}
        </span>
        <span className="fac-heat__cell-score-unit">%</span>
      </div>

      {/* Capacity bar */}
      <div className="fac-heat__cell-bar-wrap">
        <div className="fac-heat__cell-bar-track">
          <div
            className="fac-heat__cell-bar-fill"
            data-util-level={level}
            style={{ "--bar-pct": `${Math.min(100, item.utilization_pct)}%` } as React.CSSProperties}
          />
        </div>
        <div className="fac-heat__cell-bar-info">
          <span className="fac-heat__cell-bar-occupancy">
            {item.current_occupancy}/{item.capacity}
          </span>
          <span className="fac-heat__cell-bar-trend" data-trend={item.trend}>
            <TrendComp className="fac-heat__cell-bar-trend-icon" />
            {TREND_LABEL[item.trend]}
          </span>
        </div>
      </div>

      {/* Peak hours */}
      {item.peak_hours.length > 0 && (
        <div className="fac-heat__cell-peak">
          <Clock className="fac-heat__cell-peak-icon" />
          <span>Pico: {item.peak_hours.join(", ")}</span>
        </div>
      )}

      {/* Comfort indicator (Prop #4: 5D Comfort) */}
      {comfort && (
        <div
          className="fac-heat__cell-comfort"
          data-comfort-urgency={comfort.intervention_urgency}
        >
          <span className="fac-heat__cell-comfort-label">Confort</span>
          <span className="fac-heat__cell-comfort-score">{comfort.overall}</span>
          <span className="fac-heat__cell-comfort-dot" />
          <span className="fac-heat__cell-comfort-status">
            {comfort.intervention_needed
              ? (COMFORT_URGENCY_LABEL[comfort.intervention_urgency] ?? comfort.intervention_urgency)
              : "Óptimo"}
          </span>
        </div>
      )}

      {/* Hover details (CSS :hover driven) */}
      <div className="fac-heat__cell-details">
        <div className="fac-heat__cell-detail-row">
          <span className="fac-heat__cell-detail-label">Forecast</span>
          <span className="fac-heat__cell-detail-value">
            {item.forecast_pct.toFixed(1)}%
          </span>
        </div>
        <div className="fac-heat__cell-detail-row">
          <span className="fac-heat__cell-detail-label">
            <DollarSign className="fac-heat__cell-detail-icon" />
            Revenue est.
          </span>
          <span className="fac-heat__cell-detail-value fac-heat__cell-detail-value--gold">
            {formatCRC(item.estimated_monthly_revenue)}
          </span>
        </div>
        <div className="fac-heat__cell-detail-row">
          <span className="fac-heat__cell-detail-label">Rate</span>
          <span className="fac-heat__cell-detail-value">
            ₡{item.base_rate.toLocaleString("es-CR")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Legend
// ═══════════════════════════════════════════════════════════

function HeatmapLegend() {
  return (
    <div className="fac-heat__legend">
      {(["low", "medium", "high", "critical"] as const).map((level) => (
        <div key={level} className="fac-heat__legend-item">
          <span className="fac-heat__legend-swatch" data-util-level={level} />
          <span className="fac-heat__legend-label">
            {level === "low" && "Bajo (<40%)"}
            {level === "medium" && "Medio (40–70%)"}
            {level === "high" && "Alto (70–90%)"}
            {level === "critical" && "Crítico (>90%)"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function AmenityHeatmap({
  utilization,
  comfortScores,
  ambientMode = "calm",
}: AmenityHeatmapProps) {
  const prefersReduced = useReducedMotion();

  const comfortInterventionCount = useMemo(() => {
    if (!comfortScores) return 0;
    return Object.values(comfortScores).filter((c) => c.intervention_needed).length;
  }, [comfortScores]);

  const narrative = buildNarrative(utilization, comfortInterventionCount);

  // ── Empty state ──
  if (!utilization || utilization.facilities.length === 0) {
    return (
      <div className="fac-heat fac-heat--empty" data-mode={ambientMode}>
        <EmptyState
          title="Sin datos de utilización"
          description="No hay lecturas de utilización disponibles para los espacios del club."
        />
      </div>
    );
  }

  return (
    <div
      className="fac-heat"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <header className="fac-heat__header">
        <div className="fac-heat__header-text">
          <h3 className="fac-heat__title">Mapa de Utilización</h3>
          <p className="fac-heat__subtitle">
            Promedio: {utilization.overall_utilization_pct.toFixed(1)}%
            {" · "}Pico: {utilization.peak_facility}
            {" · "}Menor: {utilization.lowest_facility}
          </p>
        </div>
        <HeatmapLegend />
      </header>

      {/* Narrative (Sense 7) */}
      <p className="fac-heat__narrative">{narrative}</p>

      {/* Grid */}
      <div className="fac-heat__grid">
        {utilization.facilities.map((item, index) => (
          <HeatmapCell
            key={item.facility_id}
            item={item}
            comfort={comfortScores?.[item.facility_id]}
            index={index}
            prefersReduced={prefersReduced}
          />
        ))}
      </div>
    </div>
  );
}