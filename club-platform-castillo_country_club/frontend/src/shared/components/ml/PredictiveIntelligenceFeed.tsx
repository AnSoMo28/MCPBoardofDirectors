// src/shared/components/ml/PredictiveIntelligenceFeed.tsx
// ═══════════════════════════════════════════════════════════
// Predictive Intelligence Feed — Castillo Country Club
//
// Premium enhancements:
// + Glass ML cards with colored top borders
// + Scenario comparison bars (animated width)
// + Churn ML vs Rules visual diff bars
// + Anomaly severity glow on hover
// + Data Quality animated gauge arc
// + Entrance stagger animation
// + Glass empty state
// ═══════════════════════════════════════════════════════════
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import {
  Brain, AlertTriangle, DollarSign, Users,
  Shield, ChevronRight,
} from "lucide-react";
import type {
  RevenueForecast, ChurnMLReport, AnomalyReport, DataQualityReport,
} from "@/shared/mocks/contracts";
import { Button } from "@/shared/components/ui";
import '@/shared/components/ml/ml-glass.css';
/* ══════════════════════════════════════════════════════════
   Config
   ══════════════════════════════════════════════════════════ */

const SCENARIO_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  optimistic: { label: "Optimista", color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)" },
  base: { label: "Base", color: "var(--color-teal-400)", bgColor: "var(--color-teal-bg)" },
  pessimistic: { label: "Pesimista", color: "var(--color-amber-400)", bgColor: "var(--color-amber-bg)" },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: "CRÍTICO", color: "var(--color-rose-400)", bgColor: "var(--color-rose-bg)" },
  high: { label: "ALTO", color: "var(--color-rose-400)", bgColor: "var(--color-rose-bg)" },
  medium: { label: "MEDIO", color: "var(--color-amber-400)", bgColor: "var(--color-amber-bg)" },
  low: { label: "BAJO", color: "var(--color-teal-400)", bgColor: "var(--color-teal-bg)" },
};

function getQualityColor(score: number): string {
  if (score >= 80) return "var(--color-emerald-400)";
  if (score >= 60) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

/* ══════════════════════════════════════════════════════════
   DataQualityGauge — Animated SVG arc
   ══════════════════════════════════════════════════════════ */

function DataQualityGauge({ score, reduced }: { score: number; reduced: boolean }) {
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const color = getQualityColor(score);

  return (
    <div className="relative w-10 h-10 flex-shrink-0" title={`Data Quality: ${score}/100`}>
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? { strokeDashoffset: circumference - filled } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={reduced ? { duration: 0 } : { duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RevenueForecastCard
   ══════════════════════════════════════════════════════════ */

function RevenueForecastCard({ forecast, reduced }: { forecast: RevenueForecast; reduced: boolean }) {
  const { scenarios, budget_monthly, current_monthly_revenue, confidence } = forecast;
  const baseScenario = scenarios.find((s) => s.scenario_type === "base");
  const currentM = current_monthly_revenue / 1_000_000;
  const budgetM = budget_monthly / 1_000_000;
  const maxQ = Math.max(...scenarios.map((s) => s.quarterly_total), 1);

  return (
    <div className="glass-ml-card glass-ml-card--revenue">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: "var(--color-gold-400)" }} />
            <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">Revenue Forecast</h3>
            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
              {forecast.horizon_months} meses
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-silver-500)]">
            Confianza:{" "}
            <span className="font-[family-name:var(--font-mono)] font-bold text-[var(--color-teal-400)]">
              {(confidence * 100).toFixed(0)}%
            </span>
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current vs Budget vs Forecast */}
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider">Actual</p>
            <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-100)]">
              ₡{currentM.toFixed(1)}M
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider">Budget</p>
            <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-100)]">
              ₡{budgetM.toFixed(1)}M
            </p>
          </div>
          {baseScenario && (
            <div>
              <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider">Q3 Forecast</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-[var(--color-teal-400)]">
                ₡{(baseScenario.quarterly_total / 1_000_000).toFixed(1)}M
              </p>
              <span
                className="text-[10px] font-[family-name:var(--font-mono)] font-bold"
                style={{ color: baseScenario.vs_budget_pct >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}
              >
                {baseScenario.vs_budget_pct > 0 ? "+" : ""}
                {baseScenario.vs_budget_pct.toFixed(1)}% vs budget
              </span>
            </div>
          )}
        </div>

        {/* 3 Scenarios — glass inner + comparison bars + stagger */}
        {scenarios.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {scenarios.map((s, idx) => {
              const cfg = SCENARIO_CONFIG[s.scenario_type] ?? SCENARIO_CONFIG.base;
              const barPct = (s.quarterly_total / maxQ) * 100;

              return (
                <motion.div
                  key={s.scenario_type}
                  className="glass-ml-scenario"
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.4, delay: 0.2 + idx * 0.1 }}
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                    style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                  >
                    {cfg.label}
                  </span>
                  <p
                    className="font-[family-name:var(--font-mono)] text-sm font-bold mt-1.5"
                    style={{ color: cfg.color }}
                  >
                    ₡{(s.quarterly_total / 1_000_000).toFixed(1)}M
                  </p>
                  <p className="text-[10px] text-[var(--color-silver-500)] mt-0.5">
                    {s.vs_budget_pct > 0 ? "+" : ""}
                    {s.vs_budget_pct.toFixed(1)}% vs budget
                  </p>

                  {/* Comparison bar */}
                  <div className="glass-ml-diff-bar">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: cfg.color }}
                      initial={reduced ? { width: `${barPct}%` } : { width: "0%" }}
                      animate={{ width: `${barPct}%` }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { duration: 0.7, delay: 0.3 + idx * 0.1, ease: "easeOut" }
                      }
                    />
                  </div>

                  <p className="text-[9px] text-[var(--color-silver-600)] mt-1.5">
                    P{(s.probability * 100).toFixed(0)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ChurnComparisonCard — ML vs Rules with visual diff
   ══════════════════════════════════════════════════════════ */

function ChurnComparisonCard({ churn, reduced }: { churn: ChurnMLReport; reduced: boolean }) {
  const { total_analyzed, total_at_risk, avg_ml_score, avg_rule_score, significant_discrepancies, top_churn_features } = churn;
  const atRiskPct = total_analyzed > 0 ? (total_at_risk / total_analyzed) * 100 : 0;
  const scoreDiff = avg_ml_score - avg_rule_score;

  return (
    <div className="glass-ml-card glass-ml-card--churn">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: "var(--color-amber-400)" }} />
          <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">Churn: ML vs Reglas</h3>
          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
            {total_analyzed} analizados
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary stats */}
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider">En Riesgo</p>
            <p className="font-[family-name:var(--font-mono)] text-lg font-bold text-[var(--color-rose-400)]">
              {total_at_risk}
            </p>
            <p className="text-[10px] text-[var(--color-silver-500)]">{atRiskPct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider">Score ML</p>
            <p className="font-[family-name:var(--font-mono)] text-lg font-bold text-[var(--color-teal-400)]">
              {avg_ml_score.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider">Score Reglas</p>
            <p className="font-[family-name:var(--font-mono)] text-lg font-bold text-[var(--color-silver-300)]">
              {avg_rule_score.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Visual diff bars — ML vs Rules */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--color-teal-400)] font-semibold w-10 flex-shrink-0">ML</span>
            <div className="flex-1 glass-ml-diff-bar">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "var(--color-teal-400)" }}
                initial={reduced ? { width: `${avg_ml_score}%` } : { width: "0%" }}
                animate={{ width: `${avg_ml_score}%` }}
                transition={reduced ? { duration: 0 } : { duration: 0.8, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <span className="text-[11px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-teal-400)] w-8 text-right flex-shrink-0">
              {avg_ml_score.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--color-silver-400)] font-semibold w-10 flex-shrink-0">Reglas</span>
            <div className="flex-1 glass-ml-diff-bar">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "var(--color-silver-400)" }}
                initial={reduced ? { width: `${avg_rule_score}%` } : { width: "0%" }}
                animate={{ width: `${avg_rule_score}%` }}
                transition={reduced ? { duration: 0 } : { duration: 0.8, delay: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="text-[11px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] w-8 text-right flex-shrink-0">
              {avg_rule_score.toFixed(0)}
            </span>
          </div>
          {/* Diff indicator */}
          {Math.abs(scoreDiff) > 5 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-[var(--color-silver-500)]">Diferencia:</span>
              <span
                className="text-[11px] font-bold font-[family-name:var(--font-mono)]"
                style={{ color: scoreDiff > 0 ? "var(--color-teal-400)" : "var(--color-amber-400)" }}
              >
                {scoreDiff > 0 ? "+" : ""}{scoreDiff.toFixed(0)} pts
              </span>
              <span className="text-[10px] text-[var(--color-silver-500)]">
                ({scoreDiff > 0 ? "ML más conservador" : "ML detecta más riesgo"})
              </span>
            </div>
          )}
        </div>

        {/* Discrepancy insight */}
        {significant_discrepancies > 0 && (
          <div className="rounded-lg p-2.5 bg-[var(--color-amber-bg)] border border-[rgba(245,158,11,0.10)]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-amber-400)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-[var(--color-amber-400)]">
                  {significant_discrepancies} discrepancia(s) significativa(s)
                </p>
                <p className="text-[10px] text-[var(--color-silver-400)] mt-0.5">
                  ML detecta patrones que las reglas no capturan. Diferencia promedio: {Math.abs(scoreDiff).toFixed(0)} puntos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top risk factors */}
        {top_churn_features.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider mb-1.5">
              Top Factores de Riesgo
            </p>
            <div className="flex flex-wrap gap-1">
              {top_churn_features.map((d) => (
                <span
                  key={d.feature}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-0)] text-[var(--color-silver-400)] border border-[rgba(255,255,255,0.04)]"
                >
                  {d.feature} ({d.importance_pct}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AnomalySummaryCard — with severity glow
   ══════════════════════════════════════════════════════════ */

function AnomalySummaryCard({
  anomaly,
  dataQuality,
  reduced,
}: {
  anomaly: AnomalyReport;
  dataQuality: DataQualityReport | null;
  reduced: boolean;
}) {
  const { total_anomalies, critical_count, high_count, domains_affected, systemic_risk_score } = anomaly;

  const topAnomalies = anomaly.anomalies
    .filter((a) => a.severity === "critical" || a.severity === "high")
    .slice(0, 3);

  return (
    <div className="glass-ml-card glass-ml-card--anomaly">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: "var(--color-rose-400)" }} />
            <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">Anomalías & Calidad</h3>
          </div>
          {dataQuality && (
            <DataQualityGauge score={dataQuality.overall_score} reduced={reduced} />
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: total_anomalies, color: "var(--color-silver-200)" },
            { label: "Críticas", value: critical_count, color: "var(--color-rose-400)" },
            { label: "Altas", value: high_count, color: "var(--color-amber-400)" },
            {
              label: "Riesgo Sist.",
              value: systemic_risk_score,
              color: systemic_risk_score > 50 ? "var(--color-rose-400)" : "var(--color-teal-400)",
            },
          ].map((s) => (
            <div key={s.label} className="text-center rounded-lg p-2 bg-[var(--color-surface-0)]">
              <p className="text-[9px] text-[var(--color-silver-500)] uppercase tracking-wider">{s.label}</p>
              <p className="font-[family-name:var(--font-mono)] text-sm font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Domains affected */}
        {domains_affected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-silver-500)]">Dominios:</span>
            <div className="flex flex-wrap gap-1">
              {domains_affected.map((d) => (
                <span
                  key={d}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--color-rose-bg)] text-[var(--color-rose-400)]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top anomalies — with severity glow */}
        {topAnomalies.length > 0 && (
          <div className="space-y-2">
            {topAnomalies.map((a) => {
              const sevCfg = SEVERITY_CONFIG[a.severity] ?? SEVERITY_CONFIG.medium;

              return (
                <div key={a.anomaly_id} className="glass-anomaly-item">
                  <div
                    className={`glass-anomaly-item__glow glass-anomaly-item__glow--${a.severity}`}
                    aria-hidden="true"
                  />
                  <div className="relative z-[1]">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-[11px] font-medium text-[var(--color-silver-200)]">
                        {a.metric}
                      </span>
                      <span
                        className="px-1 py-0.5 rounded text-[9px] font-semibold"
                        style={{ color: sevCfg.color, backgroundColor: sevCfg.bgColor }}
                      >
                        {sevCfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-silver-400)] line-clamp-2">
                      {a.explanation}
                    </p>
                    {a.affected_domains.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {a.affected_domains.map((d) => (
                          <span
                            key={d}
                            className="px-1 py-0.5 rounded text-[8px] bg-[var(--color-surface-2)] text-[var(--color-silver-500)]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component — with entrance stagger
   ══════════════════════════════════════════════════════════ */

interface Props {
  revenueForecast: RevenueForecast | null;
  churnReport: ChurnMLReport | null;
  anomalyReport: AnomalyReport | null;
  dataQuality: DataQualityReport | null;
  onNavigateToML?: () => void;
  className?: string;
}

export function PredictiveIntelligenceFeed({
  revenueForecast,
  churnReport,
  anomalyReport,
  dataQuality,
  onNavigateToML,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const hasData = revenueForecast || churnReport || anomalyReport;

  const containerVariants = reduced
    ? undefined
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
      };

  const cardVariants = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
      };

  if (!hasData) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("glass-panel p-8 text-center", className)}
      >
        <Brain className="w-8 h-8 mx-auto text-[var(--color-silver-500)] mb-2" />
        <p className="text-sm text-[var(--color-silver-400)]">Inteligencia predictiva no disponible</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-4", className)}
    >
      {/* Section header */}
      <motion.div variants={cardVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" style={{ color: "var(--color-gold-400)" }} />
          <h2 className="text-base font-bold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
            Inteligencia Predictiva
          </h2>
          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
            ML Intelligence
          </span>
        </div>
        {onNavigateToML && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToML}
            className="text-xs text-[var(--color-teal-400)] h-auto min-h-0 p-0"
            icon={<ChevronRight className="w-3 h-3" />}
            iconPosition="right"
          >
            Ver todo
          </Button>
        )}
      </motion.div>

      {/* Cards with stagger */}
      {revenueForecast && (
        <motion.div variants={cardVariants}>
          <RevenueForecastCard forecast={revenueForecast} reduced={reduced} />
        </motion.div>
      )}
      {churnReport && (
        <motion.div variants={cardVariants}>
          <ChurnComparisonCard churn={churnReport} reduced={reduced} />
        </motion.div>
      )}
      {anomalyReport && (
        <motion.div variants={cardVariants}>
          <AnomalySummaryCard anomaly={anomalyReport} dataQuality={dataQuality} reduced={reduced} />
        </motion.div>
      )}
    </motion.div>
  );
}