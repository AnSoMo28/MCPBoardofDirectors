/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessAIAdvisor.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness AI Advisor
   Two-phase on-demand intelligence: Insights → Predictions.

   Proposals: P1 Oracle · P2 Compliance · P3 CSS Stagger ·
     P4 Level Gauge · P5 Archive · P6 Confidence Ring ·
     P7 Glass CSS · P8 Glass Predictions
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Brain,
  Activity,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Zap,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Calendar,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { showToast } from "@/shared/components/ui/Toast";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";

import type {
  WellnessInsightsResponse,
  WellnessPredictResponse,
  InsightCategory,
} from "../types";
import { getWellnessLevel } from "../types";
import "./WellnessAIAdvisor.css";

// ═══════════════════════════════════════════════════════════════
// §1  Config maps
// ═══════════════════════════════════════════════════════════════

const FINDING_CATEGORY_CONFIG: Record<
  InsightCategory,
  { label: string; icon: LucideIcon }
> = {
  engagement: { label: "Engagement", icon: Activity },
  risk: { label: "Riesgo", icon: ShieldAlert },
  opportunity: { label: "Oportunidad", icon: Lightbulb },
  financial: { label: "Financiero", icon: TrendingUp },
};

const IMPACT_BADGE: Record<string, "danger" | "warning" | "default"> = {
  high: "danger",
  medium: "warning",
  low: "default",
};

const IMPACT_LABEL: Record<string, string> = {
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

const TREND_ICON: Record<string, LucideIcon> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const LEVEL_LABELS: Record<string, string> = {
  excellent: "Excelente",
  good: "Bueno",
  moderate: "Moderado",
  low: "Bajo",
  critical: "Crítico",
};

const URGENCY_CONFIG: Record<
  string,
  { label: string; variant: "danger" | "warning" | "default" }
> = {
  today: { label: "Hoy", variant: "danger" },
  this_week: { label: "Esta semana", variant: "warning" },
  this_month: { label: "Este mes", variant: "default" },
};

// ═══════════════════════════════════════════════════════════════
// §2  Compact gauge constants
// ═══════════════════════════════════════════════════════════════

const GAUGE_SIZE = 100;
const GC = GAUGE_SIZE / 2;
const GR = 36;
const GS = 8;
const GA = 270;
const GG = 90;
const GROT = 135;
const GCIRC = 2 * Math.PI * GR;
const GVIS = GCIRC * (GA / 360);
const GGAP = GCIRC * (GG / 360);
const GDASH = `${GVIS} ${GGAP}`;

// ═══════════════════════════════════════════════════════════════
// §3  Helpers
// ═══════════════════════════════════════════════════════════════

function getLevelFromScore(score: number): {
  label: string;
  level: string;
} {
  const level = getWellnessLevel(score);
  return { label: LEVEL_LABELS[level] ?? level, level };
}

// ═══════════════════════════════════════════════════════════════
// §4  Mini Confidence Gauge (P6)
// ═══════════════════════════════════════════════════════════════

const MINI_R = 12;
const MINI_C = 2 * Math.PI * MINI_R;
const MINI_ARC = 250;
const MINI_VIS = MINI_C * (MINI_ARC / 360);

function ConfidenceGauge({ value }: { value: number }) {
  const offset = MINI_VIS * (1 - value);
  const level =
    value > 0.8 ? "critical" : value > 0.6 ? "medium" : "low";

  return (
    <svg viewBox="0 0 32 32" className="waa__conf-gauge" data-level={level}>
      <circle
        cx="16" cy="16" r={MINI_R}
        fill="none" stroke="var(--color-surface-3)" strokeWidth="3"
        strokeDasharray={`${MINI_VIS} ${MINI_C - MINI_VIS}`}
        strokeLinecap="round"
        transform={`rotate(145 16 16)`}
      />
      <circle
        cx="16" cy="16" r={MINI_R}
        fill="none" stroke="currentColor" strokeWidth="3"
        strokeDasharray={`${MINI_VIS} ${MINI_C - MINI_VIS}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(145 16 16)`}
        className="waa__conf-fill"
      />
      <text
        x="16" y="17" textAnchor="middle" dominantBaseline="central"
        className="waa__conf-text"
      >
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// §5  TrendMetric
// ═══════════════════════════════════════════════════════════════

function TrendMetric({
  label,
  value,
  direction,
}: {
  label: string;
  value: string;
  direction: string;
}) {
  const Icon = TREND_ICON[direction] ?? TREND_ICON.stable;

  return (
    <div className="waa__trend-metric">
      <span className="waa__trend-label">{label}</span>
      <div className="waa__trend-value">
        {direction !== "stable" && (
          <span className="waa__trend-icon" data-trend={direction}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        )}
        <span className="waa__trend-text">{value}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §6  Props
// ═══════════════════════════════════════════════════════════════

interface WellnessAIAdvisorProps {
  familyId: string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// §7  Component
// ═══════════════════════════════════════════════════════════════

export function WellnessAIAdvisor({
  familyId,
  className,
}: WellnessAIAdvisorProps) {
  const prefersReducedMotion = useReducedMotion();

  // ── On-demand triggers ──
  const [insightsTriggered, setInsightsTriggered] = useState(false);
  const [predictionsTriggered, setPredictionsTriggered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(
    new Set(),
  );

  // ── Queries ──
  const {
    data: insightsResp,
    isLoading: loadingInsights,
    error: insightsError,
    refetch: refetchInsights,
  } = useMCPQuery<WellnessInsightsResponse>(
    "wellness",
    "wellness_insights",
    { family_id: familyId },
    { enabled: insightsTriggered, staleTime: 300_000 },
  );

  const {
    data: predictResp,
    isLoading: loadingPredict,
    error: predictError,
    refetch: refetchPredict,
  } = useMCPQuery<WellnessPredictResponse>(
    "wellness",
    "wellness_predict",
    { family_id: familyId },
    { enabled: predictionsTriggered, staleTime: 300_000 },
  );

  const insights = insightsResp?.data;
  const predictions = predictResp?.data;

  // ── Reveal ──
  useEffect(() => {
    if (!insights || prefersReducedMotion) {
      setIsRevealed(!!insights);
      return;
    }
    const timer = setTimeout(() => setIsRevealed(true), 100);
    return () => clearTimeout(timer);
  }, [insights, prefersReducedMotion]);

  // ── Level ──
  const level = useMemo(
    () => (insights ? getLevelFromScore(insights.health_score) : null),
    [insights],
  );

  // ── Handlers ──
  const toggleFinding = (i: number) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // ── Initial trigger ──
  if (!insightsTriggered) {
    return (
      <div className={cn("glass-waa", className)}>
        <div className="waa__trigger">
          <span className="waa__trigger-icon">
            <Brain className="w-8 h-8" />
          </span>
          <h3 className="waa__trigger-title">Motor de Inteligencia Wellness</h3>
          <p className="waa__trigger-desc">
            Ejecuta el análisis de AI para obtener insights de bienestar,
            detección de riesgos, y recomendaciones estratégicas personalizadas.
          </p>
          <Button
            variant="primary"
            onClick={() => setInsightsTriggered(true)}
            className="min-h-[44px]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Ejecutar Análisis de Bienestar
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loadingInsights) {
    return (
      <div className={cn("glass-waa", className)}>
        <div className="waa__loading">
          <Skeleton className="h-40 rounded-xl" />
          <div className="waa__loading-grid">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (insightsError) {
    return (
      <div className={cn("glass-waa", className)}>
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title="Error en el análisis"
          description="No se pudo completar el análisis de bienestar."
          action={
            <Button
              variant="primary"
              onClick={() => refetchInsights?.()}
              className="min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  if (!insights) return null;

  // ── Gauge ──
  const dashOffset = GVIS * (1 - insights.health_score / 100);

  return (
    <div
      className={cn("glass-waa", className)}
      data-level={level?.level}
      data-revealed={isRevealed ? "" : undefined}
    >
      {/* ═══ Health Score + Executive Summary ═══ */}
      <div className="waa__hero">
        <div className="waa__hero-glow" aria-hidden="true" />
        <div className="waa__hero-content">
          {/* Compact gauge */}
          <div
            className="waa__gauge-wrap"
            role="meter"
            aria-valuenow={insights.health_score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Health score: ${insights.health_score}`}
          >
            <svg
              viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
              className="waa__gauge-svg"
              aria-hidden="true"
            >
              <circle
                cx={GC} cy={GC} r={GR}
                fill="none" stroke="var(--color-surface-3)"
                strokeWidth={GS}
                strokeDasharray={GDASH}
                strokeLinecap="round"
                transform={`rotate(${GROT} ${GC} ${GC})`}
              />
              <circle
                cx={GC} cy={GC} r={GR}
                fill="none" stroke="currentColor"
                strokeWidth={GS}
                strokeDasharray={GDASH}
                strokeDashoffset={isRevealed ? dashOffset : GVIS}
                strokeLinecap="round"
                transform={`rotate(${GROT} ${GC} ${GC})`}
                className="waa__gauge-fill"
                style={{
                  transition: prefersReducedMotion
                    ? "none"
                    : "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
                }}
              />
            </svg>
            <div className="waa__gauge-center">
              <span className="waa__gauge-score">{insights.health_score}</span>
              <span className="waa__gauge-level">{level?.label}</span>
            </div>
          </div>

          {/* Executive summary */}
          <div className="waa__summary">
            <div className="waa__summary-header">
              <Brain size={16} />
              <h3 className="waa__summary-title">Resumen Ejecutivo</h3>
            </div>
            <p className="waa__summary-text">{insights.executive_summary}</p>
            <p className="waa__summary-time">
              Generado: {new Date(insights.generated_at).toLocaleString("es-CR")}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Key Findings (P5) ═══ */}
      {insights.key_findings.length > 0 && (
        <div className="waa__section">
          <h4 className="waa__section-title">
            <Lightbulb size={16} />
            Hallazgos Clave
          </h4>
          <div className="waa__findings-grid">
            {insights.key_findings.map((finding, i) => {
              const catConfig =
                FINDING_CATEGORY_CONFIG[finding.category] ??
                FINDING_CATEGORY_CONFIG.engagement;
              const CatIcon = catConfig.icon;
              const isExpanded = expandedFindings.has(i);

              return (
                <div
                  key={i}
                  className="waa__finding waa__stagger"
                  data-category={finding.category}
                  data-impact={finding.impact}
                  data-expanded={isExpanded ? "" : undefined}
                  style={
                    { "--stagger-i": i } as React.CSSProperties
                  }
                >
                  <Button
                    variant="unstyled"
                    className="waa__finding-header"
                    onClick={() => toggleFinding(i)}
                    type="button"
                    aria-expanded={isExpanded}
                  >
                    <span className="waa__finding-icon">
                      <CatIcon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <div className="waa__finding-meta">
                      <div className="waa__finding-tags">
                        <Badge variant={IMPACT_BADGE[finding.impact]} size="sm">
                          {IMPACT_LABEL[finding.impact]}
                        </Badge>
                        <span className="waa__finding-cat">{catConfig.label}</span>
                      </div>
                      <p className="waa__finding-text">{finding.finding}</p>
                    </div>
                    <ChevronDown className="waa__finding-chevron w-4 h-4" aria-hidden="true" />
                  </Button>
                  <div className="waa__finding-body">
                    <p className="waa__finding-action">→ {finding.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Trend Analysis ═══ */}
      <div className="waa__trend-card">
        <h4 className="waa__section-title">
          <TrendingUp size={16} />
          Análisis de Tendencia
        </h4>
        <div className="waa__trend-row">
          <TrendMetric
            label="Dirección"
            value={
              insights.trend_analysis.direction === "improving"
                ? "Mejorando"
                : insights.trend_analysis.direction === "declining"
                  ? "Bajando"
                  : "Estable"
            }
            direction={insights.trend_analysis.direction}
          />
          <TrendMetric
            label="Velocidad"
            value={insights.trend_analysis.velocity}
            direction="stable"
          />
          <TrendMetric
            label="Período"
            value={insights.trend_analysis.period}
            direction="stable"
          />
          <TrendMetric
            label="Comparación"
            value={insights.trend_analysis.comparison}
            direction="stable"
          />
        </div>
      </div>

      {/* ═══ Critical Insights (P6: Confidence Ring) ═══ */}
      {insights.critical_insights.length > 0 && (
        <div className="waa__section">
          <h4 className="waa__section-title waa__section-title--danger">
            <AlertTriangle size={16} />
            Insights Críticos
          </h4>
          <div className="waa__critical-list">
            {insights.critical_insights.map((ci, i) => (
              <div
                key={i}
                className="waa__critical waa__stagger"
                data-confident={ci.confidence > 0.8 ? "" : undefined}
                style={
                  { "--stagger-i": i } as React.CSSProperties
                }
              >
                <div className="waa__critical-left">
                  <ConfidenceGauge value={ci.confidence} />
                </div>
                <div className="waa__critical-body">
                  <p className="waa__critical-text">{ci.insight}</p>
                  <div className="waa__critical-footer">
                    <p className="waa__critical-action">→ {ci.recommended_action}</p>
                    {ci.deadline && (
                      <span className="waa__critical-deadline">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        {ci.deadline}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Global Predictions ═══ */}
      {insights.predictions && (
        <div className="waa__predictions-card">
          <h4 className="waa__section-title">
            <Zap size={16} />
            Predicciones Generales
          </h4>
          <div className="waa__predictions-grid">
            <div className="waa__pred-item">
              <span className="waa__pred-label">Engagement próximo mes</span>
              <span className="waa__pred-value">{insights.predictions.next_month_engagement}</span>
            </div>
            <div className="waa__pred-item">
              <span className="waa__pred-label">Socios en riesgo de churn</span>
              <span className="waa__pred-value waa__pred-value--danger">
                {insights.predictions.churn_risk_members}
              </span>
            </div>
            <div className="waa__pred-item">
              <span className="waa__pred-label">Oportunidad de crecimiento</span>
              <span className="waa__pred-value">{insights.predictions.growth_opportunity}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Deep Predictions (P8: Glass) ═══ */}
      <div className="waa__forecast-card">
        <div className="waa__forecast-header">
          <h4 className="waa__section-title">
            <Target size={16} />
            Predicciones de Engagement
          </h4>
          {!predictionsTriggered && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPredictionsTriggered(true)}
              className="min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ejecutar Predicciones
            </Button>
          )}
        </div>

        {loadingPredict && (
          <div className="waa__loading-grid">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        )}

        {predictError && (
          <EmptyState
            icon={<AlertTriangle size={24} />}
            title="Error en predicciones"
            description="No se pudieron calcular las predicciones."
            compact
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => refetchPredict?.()}
                className="min-h-[44px]"
              >
                Reintentar
              </Button>
            }
          />
        )}

        {!predictionsTriggered && !loadingPredict && (
          <p className="waa__forecast-hint">
            Las predicciones de engagement a 30, 60 y 90 días requieren
            un análisis computacional adicional.
          </p>
        )}

        {predictions && !loadingPredict && (
          <div className="waa__forecast-body">
            {/* 30/60/90 cards */}
            <div className="waa__forecast-grid">
              {(
                ["engagement_30d", "engagement_60d", "engagement_90d"] as const
              ).map((key) => {
                const pred = predictions.predictions[key];
                const label =
                  key === "engagement_30d"
                    ? "30 días"
                    : key === "engagement_60d"
                      ? "60 días"
                      : "90 días";
                const TrendIcon = TREND_ICON[pred.trend] ?? TREND_ICON.stable;

                return (
                  <div key={key} className="waa__forecast-item" data-trend={pred.trend}>
                    <span className="waa__forecast-horizon">{label}</span>
                    <span className="waa__forecast-score">{pred.score}</span>
                    <span className="waa__forecast-trend">
                      <TrendIcon className="w-4 h-4" aria-hidden="true" />
                      {pred.trend === "improving"
                        ? "mejorando"
                        : pred.trend === "declining"
                          ? "bajando"
                          : "estable"}
                    </span>
                    <div className="waa__forecast-conf">
                      <span className="waa__forecast-conf-label">Confianza</span>
                      <span className="waa__forecast-conf-val">
                        {Math.round(pred.confidence * 100)}%
                      </span>
                    </div>
                    <div className="waa__forecast-bar">
                      <div
                        className="waa__forecast-fill"
                        style={{ width: `${pred.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Risk factors */}
            {predictions.risk_factors.length > 0 && (
              <div className="waa__risks">
                <h5 className="waa__subsection-title">
                  <ShieldAlert size={14} />
                  Factores de Riesgo
                </h5>
                <div className="waa__risks-list">
                  {predictions.risk_factors.map((rf, i) => (
                    <div key={i} className="waa__risk-item waa__stagger" style={{ "--stagger-i": i } as React.CSSProperties}>
                      <Badge variant={IMPACT_BADGE[rf.impact] ?? "default"} size="sm">
                        {IMPACT_LABEL[rf.impact] ?? rf.impact}
                      </Badge>
                      <div className="waa__risk-body">
                        <p className="waa__risk-factor">{rf.factor}</p>
                        <p className="waa__risk-desc">{rf.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interventions */}
            {predictions.recommended_interventions.length > 0 && (
              <div className="waa__interventions">
                <h5 className="waa__subsection-title">
                  <Zap size={14} />
                  Intervenciones Recomendadas
                </h5>
                <div className="waa__interventions-list">
                  {predictions.recommended_interventions.map((intv, i) => {
                    const urgCfg = URGENCY_CONFIG[intv.urgency] ?? URGENCY_CONFIG.this_month;

                    return (
                      <div
                        key={i}
                        className="waa__intervention waa__stagger"
                        data-urgency={intv.urgency}
                        style={{ "--stagger-i": i } as React.CSSProperties}
                      >
                        <div className="waa__intervention-body">
                          <div className="waa__intervention-header">
                            <Badge variant={urgCfg.variant} size="sm">
                              {urgCfg.label}
                            </Badge>
                            {intv.expected_impact && (
                              <span className="waa__intervention-impact">
                                {intv.expected_impact}
                              </span>
                            )}
                          </div>
                          <p className="waa__intervention-text">{intv.action}</p>
                        </div>
                        {intv.related_class_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="waa__intervention-btn"
                            aria-label={`Agendar: ${intv.action}`}
                            onClick={() =>
                              showToast({
                                type: "success",
                                message: "Función de agendamiento próximamente",
                              })
                            }
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Refresh ═══ */}
      <div className="waa__refresh">
        <Button
          variant="ghost"
          onClick={() => {
            setIsRevealed(false);
            refetchInsights?.();
            if (predictionsTriggered) refetchPredict?.();
          }}
          className="min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar análisis
        </Button>
      </div>
    </div>
  );
}