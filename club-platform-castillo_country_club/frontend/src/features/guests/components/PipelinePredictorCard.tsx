// ═══════════════════════════════════════════════════════════
// src/features/guests/components/PipelinePredictorCard.tsx
// Phase 34 "The Gateway" — Pipeline Predictor Card (Rewrite)
// Level 6+ Agency · Production Grade
//
// Forward-looking pipeline health visualization.
// Synthesizes funnel rates + active guest counts + seasonal
// forecast to project expected conversions and revenue.
//
// Original: cn() + Tailwind + inline styles → BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   ConversionFunnel { stages(Array<{stage, count}>),
//     total_guests(number), overall_conversion_pct(number),
//     overall_benchmark_pct(number) }                     ← mocks/contracts ✅
//   GuestAnalyticsEnhanced { active_guests(number),
//     active_trials(number) }                             ← mocks/contracts ✅
//   GuestDemandForecast { seasonal_multiplier(number),
//     peak_months(string[]) }                             ← mocks/contracts ✅
//
// ANTI-PATTERNS REMOVED: cn(), Tailwind, inline colors,
//   className prop, division-by-zero risk
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import { TrendingUp, Users, Sparkles, DollarSign, Calendar } from "lucide-react";

import type {
  ConversionFunnel,
  GuestAnalyticsEnhanced,
  GuestDemandForecast,
} from "@/shared/mocks/contracts";

import "./PipelinePredictorCard.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface PipelinePredictorCardProps {
  /** Conversion funnel from MCP. null → empty state. */
  readonly funnel: ConversionFunnel | null;
  /** Analytics from MCP. null → empty state. */
  readonly analytics: GuestAnalyticsEnhanced | null;
  /** Demand forecast from MCP. Optional enrichment. */
  readonly forecast: GuestDemandForecast | null;
}

interface PredictionData {
  readonly activeGuests: number;
  readonly activeTrials: number;
  readonly expectedTrials: number;
  readonly adjustedTrials: number;
  readonly expectedConversions: number;
  readonly trialRate: number;
  readonly conversionRate: number;
  readonly overallRate: number;
  readonly projectedAnnualRevenue: number;
  readonly seasonalMult: number;
  readonly funnelHealth: number;
  readonly peakMonths: readonly string[];
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Average monthly membership revenue in Costa Rica colones.
 * ₡180,000/month × 12 = ₡2,160,000/year per member.
 * TODO: Move to config.ts when domain config is extended.
 */
const AVG_MONTHLY_MEMBERSHIP_CRC = 180_000;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Derive health level string from funnel health score. */
function deriveHealthLevel(health: number): string {
  if (health >= 80) return "good";
  if (health >= 50) return "attention";
  return "critical";
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Pipeline Predictor — forward-looking conversion projections.
 * Uses real funnel math to project expected trials, conversions,
 * and annual revenue impact with seasonal adjustments.
 *
 * @example
 * <PipelinePredictorCard
 *   funnel={funnelData}
 *   analytics={analyticsData}
 *   forecast={forecastData}
 * />
 */
export function PipelinePredictorCard({
  funnel,
  analytics,
  forecast,
}: PipelinePredictorCardProps) {
  // ── Compute predictions ──
  const predictions: PredictionData | null = useMemo(() => {
    if (!funnel || !analytics) return null;

    const activeGuests = analytics.active_guests ?? 0;
    const activeTrials = analytics.active_trials ?? 0;

    // Stage conversion rates from funnel
    const trialStage = funnel.stages.find((s) => s.stage === "trial_applicant");
    const convertedStage = funnel.stages.find((s) => s.stage === "converted_member");

    const trialRate = trialStage && funnel.total_guests > 0
      ? trialStage.count / funnel.total_guests
      : 0;

    // FIX: guard against division by zero when trialStage.count === 0
    const conversionRate = convertedStage && trialStage && trialStage.count > 0
      ? convertedStage.count / trialStage.count
      : 0;

    const overallRate = funnel.overall_conversion_pct / 100;

    // Projections
    const expectedTrials = Math.round(activeGuests * trialRate);
    const expectedConversions = Math.round(expectedTrials * conversionRate);
    const projectedAnnualRevenue =
      expectedConversions * AVG_MONTHLY_MEMBERSHIP_CRC * 12;

    // Seasonal adjustment
    const seasonalMult = forecast?.seasonal_multiplier ?? 1.0;
    const adjustedTrials = Math.round(expectedTrials * seasonalMult);

    // Pipeline health: actual vs benchmark, clamped [0, 100]
    const funnelHealth = Math.min(
      100,
      Math.round(
        (funnel.overall_conversion_pct /
          Math.max(funnel.overall_benchmark_pct, 1)) *
          100,
      ),
    );

    return {
      activeGuests,
      activeTrials,
      expectedTrials,
      adjustedTrials,
      expectedConversions,
      trialRate: trialRate * 100,
      conversionRate: conversionRate * 100,
      overallRate: overallRate * 100,
      projectedAnnualRevenue,
      seasonalMult,
      funnelHealth,
      peakMonths: forecast?.peak_months ?? [],
    };
  }, [funnel, analytics, forecast]);

  // ── Empty state ──
  if (!predictions) {
    return (
      <div
        className="gst-predictor"
        data-state="empty"
        role="region"
        aria-label="Predictor de pipeline"
        data-testid="pipeline-predictor"
      >
        <Users className="gst-predictor__empty-icon" />
        <p className="gst-predictor__empty-text">
          Datos insuficientes para predicción.
        </p>
      </div>
    );
  }

  const healthLevel = deriveHealthLevel(predictions.funnelHealth);

  const metrics = [
    {
      metric: "guests" as const,
      icon: Users,
      label: "Guests activos",
      value: predictions.activeGuests.toString(),
      sub: `${predictions.activeTrials} trials activos`,
    },
    {
      metric: "trials" as const,
      icon: Sparkles,
      label: "Trials esperados",
      value: predictions.adjustedTrials.toString(),
      sub: `tasa: ${predictions.trialRate.toFixed(1)}% × ${predictions.seasonalMult}x estacional`,
    },
    {
      metric: "conversions" as const,
      icon: TrendingUp,
      label: "Conversiones esperadas",
      value: predictions.expectedConversions.toString(),
      sub: `tasa: ${predictions.conversionRate.toFixed(0)}%`,
    },
    {
      metric: "revenue" as const,
      icon: DollarSign,
      label: "Revenue proyectado",
      value: `₡${(predictions.projectedAnnualRevenue / 1_000_000).toFixed(1)}M`,
      sub: "anual estimado",
    },
  ];

  return (
    <div
      className="gst-predictor"
      data-state="data"
      data-health-level={healthLevel}
      role="region"
      aria-label={`Predictor de pipeline — Salud: ${predictions.funnelHealth}/100`}
      data-testid="pipeline-predictor"
    >
      {/* ── Header ── */}
      <div className="gst-predictor__header">
        <div className="gst-predictor__header-title">
          <TrendingUp className="gst-predictor__header-icon" />
          <h3 className="gst-predictor__title">Pipeline Predictor</h3>
        </div>
        <div className="gst-predictor__header-health">
          <span className="gst-predictor__health-label">Salud del funnel:</span>
          <span
            className="gst-predictor__health-value"
            data-health-level={healthLevel}
          >
            {predictions.funnelHealth}/100
          </span>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="gst-predictor__metrics">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="gst-predictor__metric"
              data-metric={m.metric}
            >
              <div className="gst-predictor__metric-header">
                <Icon className="gst-predictor__metric-icon" />
                <span className="gst-predictor__metric-label">{m.label}</span>
              </div>
              <p className="gst-predictor__metric-value">{m.value}</p>
              <p className="gst-predictor__metric-sub">{m.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Peak Months ── */}
      {predictions.peakMonths.length > 0 && (
        <div className="gst-predictor__peak-months">
          <Calendar className="gst-predictor__peak-icon" />
          <span className="gst-predictor__peak-label">Meses pico de demanda:</span>
          <div className="gst-predictor__peak-tags">
            {predictions.peakMonths.map((m) => (
              <span key={m} className="gst-predictor__peak-tag">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}