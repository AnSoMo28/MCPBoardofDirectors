// src/features/facilities/components/SpaceROICalculator.tsx
// ═══════════════════════════════════════════════════════════════
// SPACE ROI CALCULATOR — "La Balanza" (REWRITE)
//
// Revenue vs cost analysis per facility WITH:
//   - Monte Carlo P10-P90 confidence bands
//   - Sweet spot indicator (Nash equilibrium)
//   - Revenue per m²
//   - Cross-domain revenue impact
//   - Demand elasticity context
//
// Living Protocol 7/7. Level 5+.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";

import {
  DollarSign,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Target,
  Zap,
  Activity
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";

import { FACILITY_TYPE_CONFIG } from "../config";
import type { FacilityCategory } from "../config";

import type {
  Facility,
  RevenueModel,
  OccupancyPrediction,
  MaintenanceTask,
  FacilitiesDashboardMode,
  ConfidenceBand,
} from "../types";

import "./SpaceROICalculator.css";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FacilityROI {
  facility: Facility;
  revenue: number;
  revenuePerSqm: number;
  eventsPerMonth: number;
  cost: number;
  net: number;
  roiPct: number;
  roiTone: "excellent" | "good" | "moderate" | "negative";
  occupancyPct: number;
  trend: React.ReactNode | undefined;
  category: FacilityCategory;
  // Monte Carlo
  mcBand: ConfidenceBand | null;
  // Sweet spot
  sweetSpotPct: number | null;
  sweetSpotRevenue: number | null;
  isNearSweetSpot: boolean;
  // Cross-domain
  crossDomainMultiplier: number;
  crossDomainRevenue: number;
  // Elasticity
  demandElasticity: number;
}

export interface SpaceROICalculatorProps {
  facilities: Facility[];
  revenueModels?: Record<string, RevenueModel>;
  maintenanceTasks?: MaintenanceTask[];
  occupancyPredictions?: Record<string, OccupancyPrediction>;
  ambientMode?: FacilitiesDashboardMode;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ROI_THRESHOLDS = {
  excellent: 100,
  good: 50,
  moderate: 0,
} as const;

const ROI_INFINITY_CAP = 999;

const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  wellness: "Bienestar",
  sport: "Deportes",
  social: "Social",
  service: "Servicios",
  admin: "Operaciones",
};

const KPI_DEFS: ReadonlyArray<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "total_revenue", label: "Revenue total", icon: DollarSign },
  { id: "total_cost", label: "Costo mantenim.", icon: DollarSign },
  { id: "total_net", label: "Neto mensual", icon: TrendingUp },
  { id: "avg_roi", label: "ROI promedio", icon: TrendingUp },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs.toLocaleString("es-CR")}`;
}

function computeRoiTone(roi: number): FacilityROI["roiTone"] {
  if (roi >= ROI_THRESHOLDS.excellent) return "excellent";
  if (roi >= ROI_THRESHOLDS.good) return "good";
  if (roi >= ROI_THRESHOLDS.moderate) return "moderate";
  return "negative";
}

function mcBandWidth(band: ConfidenceBand): number {
  return band.p90 - band.p10;
}

function uncertaintyLevel(width: number, p50: number): "low" | "medium" | "high" {
  if (p50 === 0) return "low";
  const ratio = width / Math.abs(p50);
  if (ratio < 0.3) return "low";
  if (ratio < 0.6) return "medium";
  return "high";
}

function uncertaintyColor(level: "low" | "medium" | "high"): string {
  if (level === "low") return "var(--color-teal-400)";
  if (level === "medium") return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════════

function buildNarrative(
  roiData: FacilityROI[],
  totals: { totalRevenue: number; totalCost: number; totalNet: number; avgRoi: number },
): string {
  if (roiData.length === 0) return "Sin datos de ROI disponibles.";

  const excellent = roiData.filter((d) => d.roiTone === "excellent").length;
  const negative = roiData.filter((d) => d.roiTone === "negative").length;
  const withSweetSpot = roiData.filter((d) => d.sweetSpotPct !== null);
  const nearSweetSpot = roiData.filter((d) => d.isNearSweetSpot);
  const highUncertainty = roiData.filter(
    (d) => d.mcBand && uncertaintyLevel(mcBandWidth(d.mcBand), d.mcBand!.p50) === "high",
  );

  const topFacility = [...roiData].sort((a, b) => b.net - a.net)[0];

  const parts: string[] = [];
  parts.push(`${roiData.length} espacio${roiData.length > 1 ? "s" : ""} analizado${roiData.length > 1 ? "s" : ""}.`);
  parts.push(`Neto mensual: ${formatCRC(totals.totalNet)}.`);
  parts.push(`ROI promedio: ${totals.avgRoi >= 0 ? "+" : ""}${totals.avgRoi}%.`);

  if (excellent > 0) parts.push(`${excellent} con rendimiento excelente.`);
  if (negative > 0) parts.push(`${negative} con ROI negativo — requiere atención.`);

  if (highUncertainty.length > 0) {
    parts.push(`${highUncertainty.length} con alta incertidumbre en predicción.`);
  }

  if (nearSweetSpot.length > 0 && withSweetSpot.length > 0) {
    parts.push(`${nearSweetSpot.length}/${withSweetSpot.length} cerca del sweet spot.`);
  }

  if (topFacility) {
    parts.push(`Mayor contribución: ${topFacility.facility.name}.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MonteCarloBand({
  band,
  currentRevenue,
  reducedMotion,
}: {
  band: ConfidenceBand;
  currentRevenue: number;
  reducedMotion: boolean;
}) {
  const width = mcBandWidth(band);
  const level = uncertaintyLevel(width, band.p50);
  const color = uncertaintyColor(level);

  // Normalize to 0-100% range based on P10-P90 span + margin
  const margin = width * 0.15;
  const rangeMin = band.p10 - margin;
  const rangeMax = band.p90 + margin;
  const rangeSize = rangeMax - rangeMin;

  const p10Pct = rangeSize > 0 ? ((band.p10 - rangeMin) / rangeSize) * 100 : 0;
  const p50Pct = rangeSize > 0 ? ((band.p50 - rangeMin) / rangeSize) * 100 : 50;
  const p90Pct = rangeSize > 0 ? ((band.p90 - rangeMin) / rangeSize) * 100 : 100;
  const currentPct = rangeSize > 0
    ? Math.max(0, Math.min(100, ((currentRevenue - rangeMin) / rangeSize) * 100))
    : 50;
  const bandLeft = p10Pct;
  const bandWidth = p90Pct - p10Pct;

  return (
    <div className="fac-roi__mc">
      <div className="fac-roi__mc-head">
        <BarChart3 className="fac-roi__mc-icon" />
        <span className="fac-roi__mc-label">Incertidumbre Monte Carlo</span>
        <span className="fac-roi__mc-level" data-level={level}>
          {level === "low" ? "Baja" : level === "medium" ? "Media" : "Alta"}
        </span>
      </div>

      <div className="fac-roi__mc-track">
        {/* P10-P90 band */}
        <div
          className="fac-roi__mc-band"
          data-reduced={reducedMotion}
          style={{
            left: `${bandLeft}%`,
            width: `${bandWidth}%`,
            backgroundColor: color,
          }}
        />

        {/* P50 marker */}
        <div
          className="fac-roi__mc-p50"
          style={{ left: `${p50Pct}%` }}
        >
          <span className="fac-roi__mc-p50-label">P50</span>
        </div>

        {/* Current revenue marker */}
        <div
          className="fac-roi__mc-current"
          style={{ left: `${currentPct}%` }}
        >
          <span className="fac-roi__mc-current-label">Actual</span>
        </div>
      </div>

      <div className="fac-roi__mc-values">
        <span className="fac-roi__mc-value">{formatCRC(band.p10)}</span>
        <span className="fac-roi__mc-value fac-roi__mc-value--p50">{formatCRC(band.p50)}</span>
        <span className="fac-roi__mc-value">{formatCRC(band.p90)}</span>
      </div>
    </div>
  );
}

function SweetSpotIndicator({
  currentPct,
  sweetSpotPct,
  sweetSpotRevenue,
  isNear,
  currentRevenue,
}: {
  currentPct: number;
  sweetSpotPct: number;
  sweetSpotRevenue: number;
  isNear: boolean;
  currentRevenue: number;
}) {
  const delta = sweetSpotRevenue - currentRevenue;
  const deltaLabel = delta >= 0 ? `+${formatCRC(delta)}` : formatCRC(delta);
  const direction = sweetSpotPct > currentPct ? "↑" : sweetSpotPct < currentPct ? "↓" : "≈";

  return (
    <div className={cn("fac-roi__sweet", isNear && "fac-roi__sweet--near")}>
      <div className="fac-roi__sweet-head">
        <Target className="fac-roi__sweet-icon" />
        <span className="fac-roi__sweet-label">Sweet Spot</span>
        {isNear && (
          <span className="fac-roi__sweet-badge">✓ En equilibrio</span>
        )}
      </div>

      <div className="fac-roi__sweet-body">
        <div className="fac-roi__sweet-compare">
          <div className="fac-roi__sweet-col">
            <span className="fac-roi__sweet-col-label">Actual</span>
            <span className="fac-roi__sweet-col-value">{currentPct}%</span>
          </div>
          <span className="fac-roi__sweet-arrow">{direction}</span>
          <div className="fac-roi__sweet-col">
            <span className="fac-roi__sweet-col-label">Óptimo</span>
            <span className="fac-roi__sweet-col-value fac-roi__sweet-col-value--optimal">
              {sweetSpotPct}%
            </span>
          </div>
        </div>

        {!isNear && (
          <span className="fac-roi__sweet-delta" data-positive={delta >= 0}>
            {deltaLabel} potencial
          </span>
        )}
      </div>
    </div>
  );
}

function CrossDomainBadge({
  multiplier,
  revenue,
}: {
  multiplier: number;
  revenue: number;
}) {
  if (multiplier <= 0) return null;

  return (
    <div className="fac-roi__cross">
      <Zap className="fac-roi__cross-icon" />
      <span className="fac-roi__cross-label">
        +{Math.round(multiplier * 100)}% impacto cross-domain ({formatCRC(revenue)})
      </span>
    </div>
  );
}

function ROICard({
  data,
  maxRevenue,
  index,
  prefersReduced,
}: {
  data: FacilityROI;
  maxRevenue: number;
  index: number;
  prefersReduced: boolean;
}) {
  const revenuePct =
    maxRevenue > 0
      ? Math.min(100, Math.round((data.revenue / maxRevenue) * 100))
      : 0;

  return (
    <article
      className="fac-roi__card"
      data-roi-tone={data.roiTone}
      data-category={data.category}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      {/* Header */}
      <div className="fac-roi__card-head">
        <div className="fac-roi__card-head-left">
          <span
            className="fac-roi__card-category"
            data-category={data.category}
          >
            {CATEGORY_LABELS[data.category] ?? data.category}
          </span>
          <h4 className="fac-roi__card-name">{data.facility.name}</h4>
        </div>

        <div className="fac-roi__card-head-right">
          {data.trend !== undefined && (
            <span className="fac-roi__card-trend">{data.trend}</span>
          )}
          <span
            className="fac-roi__card-roi"
            data-roi-tone={data.roiTone}
          >
            {data.roiPct >= 0 ? "+" : ""}
            {data.roiPct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Revenue bar */}
      <div className="fac-roi__bar">
        <div className="fac-roi__bar-head">
          <span className="fac-roi__bar-label">Revenue mensual</span>
          <span className="fac-roi__bar-value">
            {formatCRC(data.revenue)}
          </span>
        </div>
        <div className="fac-roi__bar-track">
          <div
            className="fac-roi__bar-fill"
            data-roi-tone={data.roiTone}
            style={
              prefersReduced
                ? ({ width: `${revenuePct}%` } as React.CSSProperties)
                : ({
                    "--bar-pct": `${revenuePct}%`,
                  } as React.CSSProperties)
            }
          />
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="fac-roi__breakdown">
        <div className="fac-roi__breakdown-cell">
          <span className="fac-roi__breakdown-label">Costo</span>
          <span className="fac-roi__breakdown-value">
            {formatCRC(data.cost)}
          </span>
        </div>
        <div className="fac-roi__breakdown-cell">
          <span className="fac-roi__breakdown-label">Neto</span>
          <span
            className="fac-roi__breakdown-value"
            data-net={data.net >= 0 ? "positive" : "negative"}
          >
            {formatCRC(data.net)}
          </span>
        </div>
        <div className="fac-roi__breakdown-cell">
          <span className="fac-roi__breakdown-label">Util.</span>
          <span className="fac-roi__breakdown-value">
            {data.occupancyPct.toFixed(0)}%
          </span>
        </div>
        <div className="fac-roi__breakdown-cell">
          <span className="fac-roi__breakdown-label">Rev/m²</span>
          <span className="fac-roi__breakdown-value">
            {formatCRC(data.revenuePerSqm)}
          </span>
        </div>
      </div>

      {/* Monte Carlo band */}
      {data.mcBand && (
        <MonteCarloBand
          band={data.mcBand}
          currentRevenue={data.revenue}
          reducedMotion={prefersReduced}
        />
      )}

      {/* Sweet Spot */}
      {data.sweetSpotPct !== null && data.sweetSpotRevenue !== null && (
        <SweetSpotIndicator
          currentPct={Math.round(data.occupancyPct)}
          sweetSpotPct={data.sweetSpotPct}
          sweetSpotRevenue={data.sweetSpotRevenue}
          isNear={data.isNearSweetSpot}
          currentRevenue={data.revenue}
        />
      )}

      {/* Cross-domain impact */}
      <CrossDomainBadge
        multiplier={data.crossDomainMultiplier}
        revenue={data.crossDomainRevenue}
      />
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SpaceROICalculator({
  facilities,
  revenueModels,
  maintenanceTasks = [],
  occupancyPredictions,
  ambientMode = "calm",
  className,
}: SpaceROICalculatorProps) {
  const prefersReduced = useReducedMotion();

  // Build ROI data with Monte Carlo + Sweet Spot
  const roiData = useMemo((): FacilityROI[] => {
    const costMap = new Map<string, number>();
    for (const t of maintenanceTasks) {
      if (t.status === "cancelled") continue;
      const current = costMap.get(t.facility_id) ?? 0;
      costMap.set(t.facility_id, current + (t.cost ?? 0));
    }

    return facilities.map((facility) => {
      const rev = revenueModels?.[facility.id];
      const occ = occupancyPredictions?.[facility.id];
      const config = FACILITY_TYPE_CONFIG[facility.facility_type];

      const monthlyRevenue = rev?.current?.revenue_per_month ?? 0;
      const cost = costMap.get(facility.id) ?? 0;
      const net = monthlyRevenue - cost;
      const roi =
        cost > 0
          ? (net / cost) * 100
          : monthlyRevenue > 0
            ? ROI_INFINITY_CAP
            : 0;

      // Monte Carlo
      const mcBand = rev?.optimization?.monte_carlo ?? null;

      // Sweet Spot (from scenarios — the "Sweet spot óptimo" scenario)
      const sweetSpotScenario = rev?.optimization?.scenarios?.find(
        (s) => s.name === "Sweet spot óptimo",
      );
      const sweetSpotPct =
        sweetSpotScenario
          ? (() => {
              const match = sweetSpotScenario.changes?.[0]?.match(/(\d+)%/);
              return match ? parseInt(match[1], 10) : null;
            })()
          : null;
      const sweetSpotRevenue =
        sweetSpotScenario && sweetSpotScenario.revenue_delta !== undefined
          ? monthlyRevenue + sweetSpotScenario.revenue_delta
          : null;
      const isNearSweetSpot =
        sweetSpotPct !== null &&
        Math.abs((occ?.current_pct ?? 50) - sweetSpotPct) < 10;

      // Cross-domain
      const crossDomainImpact = rev?.cross_domain_impact ?? {};
      const crossDomainMultiplier = Object.values(crossDomainImpact).reduce(
        (s, v) => s + v,
        0,
      );
      const crossDomainRevenue = Math.round(
        monthlyRevenue * crossDomainMultiplier,
      );

      // Elasticity
      const demandElasticity = rev?.demand_elasticity ?? -0.6;

      return {
        facility,
        revenue: monthlyRevenue,
        revenuePerSqm: rev?.current?.revenue_per_sqm ?? 0,
        eventsPerMonth: rev?.current?.events_per_month ?? 0,
        cost,
        net,
        roiPct: Math.round(roi),
        roiTone: computeRoiTone(Math.round(roi)),
        occupancyPct: occ?.current_pct ?? 0,
        trend: occ?.trend,
        category: (config?.category ?? "service") as FacilityCategory,
        mcBand,
        sweetSpotPct,
        sweetSpotRevenue,
        isNearSweetSpot,
        crossDomainMultiplier,
        crossDomainRevenue,
        demandElasticity,
      };
    });
  }, [
    facilities,
    revenueModels,
    maintenanceTasks,
    occupancyPredictions,
  ]);

  // Sorted by net
  const sorted = useMemo(
    () => [...roiData].sort((a, b) => b.net - a.net),
    [roiData],
  );

  // Totals
  const totals = useMemo(() => {
    const totalRevenue = roiData.reduce((s, f) => s + f.revenue, 0);
    const totalCost = roiData.reduce((s, f) => s + f.cost, 0);
    const totalNet = totalRevenue - totalCost;
    const avgRoi =
      roiData.length > 0
        ? Math.round(
            roiData.reduce((s, f) => s + f.roiPct, 0) / roiData.length,
          )
        : 0;
    return { totalRevenue, totalCost, totalNet, avgRoi };
  }, [roiData]);

  const maxRevenue = useMemo(
    () =>
      sorted.length > 0 ? Math.max(...sorted.map((f) => f.revenue)) : 1,
    [sorted],
  );

  const narrative = buildNarrative(roiData, totals);

  // Aggregate uncertainty
  const uncertaintySummary = useMemo(() => {
    const withMC = roiData.filter((d) => d.mcBand !== null);
    if (withMC.length === 0) return null;
    const high = withMC.filter(
      (d) =>
        uncertaintyLevel(mcBandWidth(d.mcBand!), d.mcBand!.p50) === "high",
    ).length;
    const sweetSpots = roiData.filter((d) => d.sweetSpotPct !== null).length;
    const nearSweet = roiData.filter((d) => d.isNearSweetSpot).length;
    return { total: withMC.length, high, sweetSpots, nearSweet };
  }, [roiData]);

  // Empty guard
  if (roiData.length === 0) return null;

  return (
    <div
      className={cn("fac-roi", className)}
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <header className="fac-roi__header">
        <DollarSign className="fac-roi__header-icon" />
        <h3 className="fac-roi__title">Space ROI</h3>
      </header>

      {/* Narrative (Sense 7) */}
      <p className="fac-roi__narrative">{narrative}</p>

      {/* KPI Strip */}
      <div className="fac-roi__kpis">
        {KPI_DEFS.map((def) => {
          const value =
            def.id === "total_revenue"
              ? formatCRC(totals.totalRevenue)
              : def.id === "total_cost"
                ? formatCRC(totals.totalCost)
                : def.id === "total_net"
                  ? formatCRC(totals.totalNet)
                  : `${totals.avgRoi >= 0 ? "+" : ""}${totals.avgRoi}%`;

          const isNetPositive =
            def.id === "total_net" && totals.totalNet >= 0;
          const isNetNegative =
            def.id === "total_net" && totals.totalNet < 0;
          const isRoiPositive =
            def.id === "avg_roi" && totals.avgRoi >= 0;

          return (
            <div
              key={def.id}
              className="fac-roi__kpi"
              data-kpi-id={def.id}
              data-kpi-tone={
                isNetNegative
                  ? "negative"
                  : isNetPositive || isRoiPositive
                    ? "positive"
                    : undefined
              }
            >
              <div className="fac-roi__kpi-head">
                <def.icon className="fac-roi__kpi-icon" data-kpi-id={def.id} />
                <span className="fac-roi__kpi-label">{def.label}</span>
              </div>
              <p className="fac-roi__kpi-value" data-kpi-id={def.id}>
                {value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Uncertainty Summary */}
      {uncertaintySummary && (
        <div className="fac-roi__uncertainty">
          <Activity className="fac-roi__uncertainty-icon" />
          <span className="fac-roi__uncertainty-text">
            {uncertaintySummary.high > 0 && (
              <span className="fac-roi__uncertainty-alert">
                {uncertaintySummary.high} con alta incertidumbre
              </span>
            )}
            {uncertaintySummary.sweetSpots > 0 && (
              <span className="fac-roi__uncertainty-sweet">
                {uncertaintySummary.nearSweet}/{uncertaintySummary.sweetSpots} en sweet spot
              </span>
            )}
          </span>
        </div>
      )}

      {/* Per-facility Cards */}
      <div className="fac-roi__grid">
        {sorted.map((data, index) => (
          <ROICard
            key={data.facility.id}
            data={data}
            maxRevenue={maxRevenue}
            index={index}
            prefersReduced={prefersReduced}
          />
        ))}
      </div>

      {/* Net Ranking */}
      {sorted.length > 1 && (
        <div className="fac-roi__ranking">
          <span className="fac-roi__ranking-title">
            Ranking de contribución neta
          </span>
          <div className="fac-roi__ranking-list">
            {sorted.map((f, idx) => (
              <div
                key={f.facility.id}
                className="fac-roi__ranking-row"
                data-first={idx === 0 ? "true" : undefined}
              >
                <span className="fac-roi__ranking-pos">{idx + 1}</span>
                <span className="fac-roi__ranking-name">
                  {f.facility.name}
                </span>
                <ArrowRight className="fac-roi__ranking-arrow" />
                <span
                  className="fac-roi__ranking-net"
                  data-net={f.net >= 0 ? "positive" : "negative"}
                >
                  {formatCRC(f.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}