/**
 * MemberRiskRadar — Risk Intelligence Observatory
 * Phase 30 — Block 4.8: What Threatens Them + What Protects Them
 *
 * Risk gauge with severity color.
 * Risk factors with weight visualization (stacked bar).
 * Protective factors as shield badges.
 * Risk trend with directional indicator.
 *
 * The risk radar doesn't just list threats —
 * it QUANTIFIES, PRIORITIZES, and SUGGESTS MITIGATION.
 */

import { useMemo } from "react";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Skeleton, EmptyState } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMemberRiskAssessment } from "../hooks/useMember360MCP";
import type {
  MemberTemperature,
  DomainSignal
} from "../types";
import type { MemberPredictions } from "../lib/memberPredictions";
import {
  SEVERITY_DISPLAY as SEVERITY_LEVEL_DISPLAY,
  TREND_DISPLAY as TREND_DIRECTION_DISPLAY,
  type SeverityLevel,
  type TrendDirection,
} from "@/shared/types/domain-enums";

import "./MemberRiskRadar.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MemberRiskRadarProps {
  memberId: string;
  temperature?: MemberTemperature;
  signals?: DomainSignal[];
  predictions?: MemberPredictions;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const SOURCE_LABELS: Record<
  string,
  { label: string; icon: string }
> = {
  financial: { label: "Financiero", icon: "💰" },
  engagement: { label: "Engagement", icon: "📊" },
  social: { label: "Social", icon: "🤝" },
  wellness: { label: "Bienestar", icon: "🧘" },
  satisfaction: { label: "Satisfacción", icon: "⭐" },
  lifecycle: { label: "Lifecycle", icon: "🔄" },
  communication: { label: "Comunicación", icon: "📨" },
  events: { label: "Eventos", icon: "📅" },
};

const SEVERITY_STYLE: Record<
  string,
  { color: string; bgColor: string }
> = {
  critical: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  high: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  medium: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  low: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getRiskLevel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

/** Derive 8 risk axes from signals + predictions (fallback when risk assessment is null) */
function deriveRiskAxes(
  signals: DomainSignal[] | undefined,
  predictions: MemberPredictions | null,
  temperature: MemberTemperature | undefined,
): Array<{ axis: string; value: number; color: string }> | null {
  if (!signals && !predictions && !temperature) return null;

  const getSignalAvg = (domains: string[]): number => {
    if (!signals) return 50;
    const matched = signals.filter((s) =>
      domains.includes(s.domain),
    );
    if (matched.length === 0) return 50;
    return (
      matched.reduce((sum, s) => sum + (100 - s.value), 0) /
      matched.length
    );
  };

  return [
    {
      axis: "Churn",
      value: predictions
        ? predictions.churnForecast.predictedProbability.estimate * 100
        : 50,
      color: "var(--color-rose-400)",
    },
    {
      axis: "Financiero",
      value: getSignalAvg(["events", "dining"]),
      color: "var(--color-amber-400)",
    },
    {
      axis: "Social",
      value: getSignalAvg(["social"]),
      color: "var(--color-teal-400)",
    },
    {
      axis: "Engagement",
      value: temperature
        ? 100 - temperature.composite
        : getSignalAvg(["sports", "wellness"]),
      color: "var(--color-gold-400)",
    },
    {
      axis: "Satisfacción",
      value: getSignalAvg(["recommendations"]),
      color: "var(--color-silver-400)",
    },
    {
      axis: "Actividad",
      value: getSignalAvg([
        "sports",
        "wellness",
        "cultural",
      ]),
      color: "var(--color-emerald-400)",
    },
    {
      axis: "Bienestar",
      value: getSignalAvg(["wellness"]),
      color: "var(--color-teal-300)",
    },
    {
      axis: "Externo",
      value:
        signals
          ?.filter((s) => s.severity === "high" || s.severity === "critical")
          .reduce((sum, s) => sum + s.value, 0) ?? 0,
      color: "var(--color-rose-300)",
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberRiskRadar({
  memberId,
  temperature,
  signals,
  predictions,
  className,
}: MemberRiskRadarProps) {
  const reduced = useReducedMotion();
  const { data, isLoading, isError } =
    useMemberRiskAssessment(memberId);

  if (isLoading) {
    return (
      <div className="glass-m360-riskradar space-y-4">
        <Skeleton className="h-24 rounded-[18px]" />
        <Skeleton className="h-48 rounded-[18px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <SectionError title="Error cargando evaluación de riesgo" />
    );
  }

  // Derive risk axes for enrichment display
  const riskAxes = useMemo(
    () => deriveRiskAxes(signals, predictions ?? null, temperature),
    [signals, predictions, temperature],
  );

  const overallStyle =
    SEVERITY_STYLE[data.overall_risk] ?? SEVERITY_STYLE.medium;
  const riskLevel = getRiskLevel(data.risk_score);
  const trendDisplay =
    TREND_DIRECTION_DISPLAY[data.risk_trend as TrendDirection];
  const TrendIcon =
    data.risk_trend === "improving"
      ? TrendingUp
      : data.risk_trend === "declining"
        ? TrendingDown
        : Minus;

  // Ring math
  const R = 38;
  const STROKE = 6;
  const CIRC = 2 * Math.PI * R;
  const CX = 50;
  const offset = CIRC - (data.risk_score / 100) * CIRC;

  // Weight total for stacked bar
  const totalWeight = data.risk_factors.reduce(
    (sum, rf) => sum + rf.weight,
    0,
  );

  return (
    <div
      className={cn("glass-m360-riskradar", className)}
      data-overall-risk={data.overall_risk}
      data-risk-level={riskLevel}
      data-risk-trend={data.risk_trend}
    >
      {/* ── Risk Score Header ── */}
      <div className="glass-m360-riskradar__header">
        {/* Gauge */}
        <div className="glass-m360-riskradar__gauge">
          <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
          >
            <circle
              cx={CX}
              cy={CX}
              r={R}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth={STROKE}
            />
            <circle
              cx={CX}
              cy={CX}
              r={R}
              fill="none"
              stroke={overallStyle.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={reduced ? offset : CIRC}
              transform={`rotate(-90 ${CX} ${CX})`}
              className={
                reduced
                  ? ""
                  : "glass-m360-riskradar__gauge-arc"
              }
              style={
                reduced ? { strokeDashoffset: offset } : undefined
              }
            />
            <text
              x={CX}
              y={CX - 4}
              textAnchor="middle"
              fill="var(--color-silver-100)"
              fontSize="20"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              {Math.round(data.risk_score)}
            </text>
            <text
              x={CX}
              y={CX + 10}
              textAnchor="middle"
              fill="var(--color-silver-400)"
              fontSize="9"
            >
              Riesgo
            </text>
          </svg>
        </div>

        {/* Summary */}
        <div className="glass-m360-riskradar__header-info">
          <div className="glass-m360-riskradar__header-badges">
            <span
              className="glass-m360-riskradar__severity-badge"
              style={{
                color: overallStyle.color,
                background: overallStyle.bgColor,
              }}
            >
              {SEVERITY_LEVEL_DISPLAY[
                data.overall_risk as SeverityLevel
              ]?.label ?? data.overall_risk}
            </span>
            <span
              className="glass-m360-riskradar__trend-badge"
              style={{
                color:
                  trendDisplay?.color ?? "var(--color-silver-400)",
              }}
            >
              <TrendIcon className="w-3.5 h-3.5" />
              {trendDisplay?.label ?? data.risk_trend}
            </span>
          </div>

          <p className="glass-m360-riskradar__header-summary">
            {data.risk_factors.length} factor
            {data.risk_factors.length !== 1 ? "es" : ""} de riesgo
            {" · "}
            {data.protective_factors.length} factor
            {data.protective_factors.length !== 1 ? "es" : ""}{" "}
            protector
            {data.protective_factors.length !== 1 ? "es" : ""}
          </p>

          {data.similar_at_risk_count != null && (
            <p className="glass-m360-riskradar__header-similar">
              <Users className="w-3 h-3" />
              {data.similar_at_risk_count} socio
              {data.similar_at_risk_count !== 1 ? "s" : ""} en
              situación similar
            </p>
          )}
        </div>
      </div>

      {/* ── Risk Weight Stacked Bar ── */}
      {data.risk_factors.length > 0 && (
        <div className="glass-m360-riskradar__weight-bar">
          {data.risk_factors.map((rf, i) => {
            const sevStyle =
              SEVERITY_STYLE[rf.severity] ?? SEVERITY_STYLE.medium;
            const pct =
              totalWeight > 0
                ? (rf.weight / totalWeight) * 100
                : 0;

            return (
              <div
                key={`${rf.source}-${i}`}
                className="glass-m360-riskradar__weight-segment"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  background: sevStyle.color,
                }}
                title={`${SOURCE_LABELS[rf.source]?.label ?? rf.source}: ${Math.round(rf.weight * 100)}%`}
              />
            );
          })}
        </div>
      )}

      {/* ── Risk Factors ── */}
      <div className="glass-m360-riskradar__factors">
        <h3 className="glass-m360-riskradar__section-title">
          <AlertTriangle className="w-4 h-4 text-[var(--color-amber-400)]" />
          Factores de Riesgo ({data.risk_factors.length})
        </h3>

        {data.risk_factors.length === 0 ? (
          <EmptyState
            icon={
              <Shield className="w-8 h-8 text-[var(--color-emerald-400)]" />
            }
            title="Sin factores de riesgo"
            description="No se detectaron factores de riesgo significativos"
          />
        ) : (
          <div className="glass-m360-riskradar__factor-list">
            {data.risk_factors.map((rf, idx) => {
              const sourceInfo = SOURCE_LABELS[rf.source] ?? {
                label: rf.source,
                icon: "📋",
              };
              const sevStyle =
                SEVERITY_STYLE[rf.severity] ??
                SEVERITY_STYLE.medium;
              const sevLabel =
                SEVERITY_LEVEL_DISPLAY[
                  rf.severity as SeverityLevel
                ]?.label ?? rf.severity;

              return (
                <div
                  key={`${rf.source}-${idx}`}
                  className="glass-m360-riskradar__factor"
                  data-severity={rf.severity}
                  style={
                    {
                      "--stagger-i": idx,
                      "--factor-color": sevStyle.color,
                    } as React.CSSProperties
                  }
                >
                  {/* Left border + icon */}
                  <span className="glass-m360-riskradar__factor-icon">
                    {sourceInfo.icon}
                  </span>

                  {/* Content */}
                  <div className="glass-m360-riskradar__factor-content">
                    <div className="glass-m360-riskradar__factor-header">
                      <span className="glass-m360-riskradar__factor-name">
                        {sourceInfo.label}
                      </span>
                      <span
                        className="glass-m360-riskradar__factor-severity"
                        style={{
                          color: sevStyle.color,
                          background: sevStyle.bgColor,
                        }}
                      >
                        {sevLabel.toUpperCase()}
                      </span>
                      <span className="glass-m360-riskradar__factor-weight">
                        peso {Math.round(rf.weight * 100)}%
                      </span>
                    </div>

                    <p className="glass-m360-riskradar__factor-detail">
                      {rf.detail}
                    </p>

                    {/* Weight bar */}
                    <div className="glass-m360-riskradar__factor-bar-track">
                      <div
                        className="glass-m360-riskradar__factor-bar-fill"
                        style={{
                          width: `${Math.round(rf.weight * 100)}%`,
                          background: sevStyle.color,
                        }}
                      />
                    </div>

                    {/* Mitigation */}
                    {rf.mitigation && (
                      <div className="glass-m360-riskradar__factor-mitigation">
                        <Lightbulb className="w-3 h-3 text-[var(--color-gold-400)] flex-shrink-0" />
                        <span>{rf.mitigation}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Protective Factors ── */}
      {data.protective_factors.length > 0 && (
        <div className="glass-m360-riskradar__protective">
          <h3 className="glass-m360-riskradar__section-title">
            <Shield className="w-4 h-4 text-[var(--color-emerald-400)]" />
            Factores Protectores ({data.protective_factors.length})
          </h3>
          <div className="glass-m360-riskradar__protective-list">
            {data.protective_factors.map((pf, idx) => {
              const sourceInfo = SOURCE_LABELS[pf.source] ?? {
                label: pf.source,
                icon: "📋",
              };

              return (
                <div
                  key={`${pf.source}-${idx}`}
                  className="glass-m360-riskradar__protective-card"
                  style={
                    { "--stagger-i": idx } as React.CSSProperties
                  }
                >
                  <span className="glass-m360-riskradar__protective-icon">
                    {sourceInfo.icon}
                  </span>
                  <div className="glass-m360-riskradar__protective-info">
                    <span className="glass-m360-riskradar__protective-name">
                      {sourceInfo.label}
                    </span>
                    <p className="glass-m360-riskradar__protective-detail">
                      {pf.detail}
                    </p>
                  </div>
                  <Shield className="w-4 h-4 text-[var(--color-emerald-400)] flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── Derived Risk Axes (from signals/predictions) ── */}
      {riskAxes && riskAxes.some((a) => a.value > 0) && (
        <div className="glass-m360-riskradar__axes">
          <h3 className="glass-m360-riskradar__section-title">
            Ejes de Riesgo Derivados
          </h3>
          <div className="glass-m360-riskradar__axes-grid">
            {riskAxes.map((axis: { axis: string; value: number; color: string }, i: number) => (
              <div
                key={axis.axis}
                className="glass-m360-riskradar__axis"
                style={
                  {
                    "--stagger-i": i,
                    "--axis-color": axis.color,
                  } as React.CSSProperties
                }
              >
                <span className="glass-m360-riskradar__axis-name">
                  {axis.axis}
                </span>
                <div className="glass-m360-riskradar__axis-bar-track">
                  <div
                    className="glass-m360-riskradar__axis-bar-fill"
                    style={{
                      width: `${Math.min(100, axis.value)}%`,
                      background: axis.color,
                    }}
                  />
                </div>
                <span className="glass-m360-riskradar__axis-value">
                  {Math.round(axis.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Predicted Risk Trajectory ── */}
      {predictions?.churnForecast && (
        <div className="glass-m360-riskradar__trajectory">
          <h3 className="glass-m360-riskradar__section-title">
            Trayectoria Predicha
          </h3>
          <div className="glass-m360-riskradar__trajectory-info">
            <span className="glass-m360-riskradar__trajectory-prob">
              {Math.round(
                predictions.churnForecast.predictedProbability.estimate * 100,
              )}
              % churn
            </span>
            <span className="glass-m360-riskradar__trajectory-horizon">
              en {predictions.churnForecast.daysToLikelyChurn ?? "?"} días
            </span>
            <span className="glass-m360-riskradar__trajectory-confidence">
              {Math.round(
                predictions.churnForecast.predictedProbability.confidence * 100,
              )}
              % confianza
            </span>
          </div>
        </div>
      )}
    </div>
  );
}