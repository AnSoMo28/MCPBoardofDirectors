// src/shared/components/ai/TwinResults.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Twin Results
// Digital Twin Observatory — Fase 23 AI
//
// Visualization of Digital Twin simulation results.
// Verdict theater, impact bars, cascade flow diagrams,
// health divergence, confidence encoding.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Target,
  Activity,
  Zap,
  GitBranch,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCRC, formatPct } from "@/shared/lib/financial/format";
import type {
  TwinSimulationResult,
  RuleActivationDelta,
  CascadePrediction,
  TwinPrediction,
  HealthScoreDelta,
  SimulatedGoalCandidate,
  TwinVerdict,
} from "@/shared/lib/advisor-engine/twin-types";
import {
  VERDICT_CONFIG,
  RECOMMENDATION_CONFIG,
} from "@/shared/lib/advisor-engine/twin-types";
import './TwinResults.css';

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const VERDICT_ICONS: Record<TwinVerdict["assessment"], typeof ShieldCheck> = {
  positive: ShieldCheck,
  neutral: ShieldQuestion,
  negative: ShieldX,
  mixed: ShieldAlert,
};

const VERDICT_GLOW: Record<string, string> = {
  positive: "glass-twin__glow--positive",
  neutral: "glass-twin__glow--neutral",
  negative: "glass-twin__glow--negative",
  mixed: "glass-twin__glow--mixed",
};

const EASE = [0.16, 1, 0.3, 1] as any;

// ═══════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════

function useCountUp(target: number, duration: number, enabled: boolean) {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    let start = 0;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return value;
}

function useTwinResults(result: TwinSimulationResult) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["verdict", "predictions"]),
  );

  const toggle = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const { ruleDeltas, cascades, predictions } = result;

  const derived = useMemo(() => ({
    newlyActivated: ruleDeltas.filter((d) => d.changeType === "newly_activated"),
    newlyDeactivated: ruleDeltas.filter((d) => d.changeType === "newly_deactivated"),
    intensified: ruleDeltas.filter((d) => d.changeType === "intensified"),
    newCascades: cascades.filter((c) => c.isNewCascade),
    existingCascades: cascades.filter((c) => !c.isNewCascade),
    directPredictions: predictions.filter((p) => p.source === "direct_delta"),
    cascadePredictions: predictions.filter((p) => p.source === "causal_chain"),
  }), [ruleDeltas, cascades, predictions]);

  return { expandedSections, toggle, derived };
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

/* Verdict Theater — hero verdict display */
function VerdictTheater({
  verdict,
  executionMs,
  onResimulate,
  reduced,
}: {
  verdict: TwinVerdict;
  executionMs: number;
  onResimulate?: () => void;
  reduced: boolean;
}) {
  const vCfg = VERDICT_CONFIG[verdict.assessment];
  const rCfg = RECOMMENDATION_CONFIG[verdict.recommendation];
  const VIcon = VERDICT_ICONS[verdict.assessment];
  const confidence = useCountUp(verdict.averageConfidence, 1200, !reduced);

  const isExecute =
    verdict.recommendation === "execute" ||
    verdict.recommendation === "execute_with_monitoring";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="glass-twin__verdict"
      style={{ background: vCfg.bgColor }}
    >
      <div
        className="glass-twin__verdict-border"
        style={{ borderColor: `color-mix(in srgb, ${vCfg.color} 20%, transparent)` }}
      />
      <div className="glass-twin__verdict-shimmer" />

      <div className="relative z-10 space-y-3">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <VIcon className="w-6 h-6" style={{ color: vCfg.color }} />
              <div
                className="glass-twin__beacon absolute -top-0.5 -right-0.5"
                style={{ color: vCfg.color, backgroundColor: vCfg.color }}
              />
            </div>
            <div>
              <span
                className="text-lg font-bold font-[family-name:var(--font-display)] block"
                style={{ color: vCfg.color }}
              >
                {vCfg.label}
              </span>
              <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                {executionMs}ms · {verdict.cascadeRiskCount} cascada(s) · {verdict.newRuleCount} alerta(s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Confidence counter */}
            <div className="text-right">
              <span
                className="text-2xl font-black font-[family-name:var(--font-display)] block leading-none"
                style={{ color: vCfg.color }}
              >
                {confidence}%
              </span>
              <span className="text-[8px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
                confianza
              </span>
            </div>

            {onResimulate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResimulate}
                className="text-[var(--color-silver-400)] text-[10px] min-h-[32px]"
              >
                Re-simular
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] leading-relaxed">
          {verdict.summary}
        </p>

        {/* Recommendation */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-[family-name:var(--font-ui)]"
            style={{
              color: rCfg.color,
              backgroundColor: `color-mix(in srgb, ${rCfg.color} 10%, transparent)`,
            }}
          >
            {isExecute ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            {rCfg.label}
          </span>
        </div>

        {/* Benefits / Risks */}
        {(verdict.benefits.length > 0 || verdict.risks.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
            {verdict.benefits.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--color-emerald-400)] font-[family-name:var(--font-mono)] uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Beneficios
                </span>
                {verdict.benefits.map((b, i) => (
                  <p
                    key={i}
                    className="text-[11px] text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]"
                  >
                    {b}
                  </p>
                ))}
              </div>
            )}
            {verdict.risks.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--color-rose-400)] font-[family-name:var(--font-mono)] uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Riesgos
                </span>
                {verdict.risks.map((r, i) => (
                  <p
                    key={i}
                    className="text-[11px] text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]"
                  >
                    {r}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* Confidence Dots — 3-dot encoding */
function ConfidenceDots({
  value,
  status,
}: {
  value: number;
  status: "cold" | "warming" | "calibrated";
}) {
  const filled = status === "calibrated" ? 3 : status === "warming" ? 2 : 1;
  const color =
    status === "calibrated"
      ? "var(--color-teal-400)"
      : status === "warming"
        ? "var(--color-amber-400)"
        : "var(--color-silver-500)";

  return (
    <div className="glass-twin__dots" title={`${status} (${value}%)`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="glass-twin__dot"
          style={{
            backgroundColor: i < filled ? color : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
}

/* Prediction Row — with impact bar */
function PredictionRow({ prediction }: { prediction: TwinPrediction }) {
  const isPositive = prediction.delta > 0;
  const isNegative = prediction.delta < 0;
  const noChange = prediction.delta === 0;

  const isGood =
    (prediction.unit === "%" && isPositive && prediction.metricName.toLowerCase().includes("retention")) ||
    (prediction.unit === "%" && isNegative && prediction.metricName.toLowerCase().includes("churn")) ||
    (prediction.unit === "pts" && isPositive) ||
    (prediction.unit === "₡" && isPositive);

  const trendColor = noChange
    ? "var(--color-silver-400)"
    : isGood
      ? "var(--color-emerald-400)"
      : isPositive
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  const impactPct = Math.min(Math.abs(prediction.deltaPct), 50);

  const formatVal = (val: number, unit: string): string => {
    if (unit === "₡") return formatCRC(val);
    if (unit === "%") return formatPct(val);
    if (unit === "pts") return `${Math.round(val)} pts`;
    return Math.round(val).toLocaleString("es-CR");
  };

  return (
    <div className="glass-twin__pred">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate capitalize">
            {prediction.metricName}
          </span>
          {prediction.source === "causal_chain" && (
            <GitBranch className="w-2.5 h-2.5 text-[var(--color-amber-400)] flex-shrink-0" />
          )}
        </div>
        <p className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] truncate mt-0.5">
          {prediction.reasoning}
        </p>
      </div>

      {/* Values */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
          {formatVal(prediction.currentValue, prediction.unit)}
        </span>
        <ArrowRight className="w-3 h-3 text-[var(--color-silver-600)]" />
        <span
          className="text-[10px] font-semibold font-[family-name:var(--font-mono)]"
          style={{ color: trendColor }}
        >
          {formatVal(prediction.predictedValue, prediction.unit)}
        </span>
      </div>

      {/* Impact bar + delta + confidence */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[80px]">
        <span
          className="text-[9px] font-bold font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded"
          style={{
            color: trendColor,
            backgroundColor: `color-mix(in srgb, ${trendColor} 10%, transparent)`,
          }}
        >
          {isPositive ? "+" : ""}
          {prediction.deltaPct.toFixed(1)}%
        </span>
        <div className="glass-twin__impact-track">
          <div
            className="glass-twin__impact-fill"
            style={{
              width: `${(impactPct / 50) * 100}%`,
              backgroundColor: trendColor,
            }}
          />
        </div>
        <ConfidenceDots
          value={prediction.confidence}
          status={prediction.calibrationStatus}
        />
      </div>
    </div>
  );
}

/* Glass Section (collapsible) */
function GlassSection({
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  badge,
  badgeColor,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="glass-twin__section">
      <button
        type="button"
        onClick={onToggle}
        className="glass-twin__section-head focus-visible:outline-2 focus-visible:outline-[var(--color-teal-400)] focus-visible:outline-offset-[-2px]"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
                {title}
              </span>
              {badge && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] font-semibold flex-shrink-0"
                  style={{
                    color: badgeColor ?? "var(--color-silver-400)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] block truncate">
              {subtitle}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-silver-400)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)] flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Rule Group — with state encoding */
function RuleGroup({
  label,
  color,
  rules,
  stateClass,
}: {
  label: string;
  color: string;
  rules: RuleActivationDelta[];
  stateClass: string;
}) {
  return (
    <div className="space-y-1.5">
      <span
        className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider flex items-center gap-1"
        style={{ color }}
      >
        {label} ({rules.length})
      </span>
      {rules.map((rule) => (
        <div key={rule.ruleId} className={cn("glass-twin__rule-delta", stateClass)}>
          <Zap className="w-3 h-3 flex-shrink-0" style={{ color }} />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate block">
              {rule.ruleTitle}
            </span>
            <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
              {rule.domain} · {rule.triggerMetric.split(".").pop()}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-[var(--color-silver-500)]">
              {formatCompact(rule.baselineValue)}
            </span>
            <ArrowRight className="w-2.5 h-2.5 text-[var(--color-silver-600)]" />
            <span style={{ color }} className="font-semibold">
              {formatCompact(rule.simulatedValue)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Cascade Card — with SVG flow */
function CascadeCard({
  cascade,
  isNew,
  reduced,
}: {
  cascade: CascadePrediction;
  isNew: boolean;
  reduced: boolean;
}) {
  const steps = cascade.cascadeSteps;
  const nodeSpacing = 72;
  const nodeR = 20;
  const svgW = steps.length * nodeSpacing + nodeR * 2;
  const svgH = 44;
  const cy = svgH / 2;

  return (
    <div
      className={cn(
        "glass-twin__cascade",
        isNew ? "glass-twin__cascade--new" : "glass-twin__cascade--existing",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-[var(--color-amber-400)]" />
          <span className="text-xs font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-mono)]">
            {cascade.patternId}
          </span>
          {isNew && (
            <span className="text-[8px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] font-bold text-[var(--color-rose-400)] bg-[color-mix(in srgb,var(--color-rose-400)12%,transparent)]">
              NUEVA
            </span>
          )}
        </div>
        <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
          {Math.round(cascade.cascadeConfidence * 100)}% conf
        </span>
      </div>

      {/* SVG Flow */}
      <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
        {/* Connection lines */}
        {steps.map((_step, idx) => {
          if (idx === steps.length - 1) return null;
          const x1 = nodeR + idx * nodeSpacing + nodeR;
          const x2 = nodeR + (idx + 1) * nodeSpacing;
          return (
            <motion.line
              key={`line-${idx}`}
              x1={x1}
              y1={cy}
              x2={x2}
              y2={cy}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              initial={reduced ? undefined : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reduced ? 0 : 0.5,
                delay: 0.2 + idx * 0.15,
                ease: EASE,
              }}
            />
          );
        })}

        {/* Nodes */}
        {steps.map((step, idx) => {
          const cx = nodeR + idx * nodeSpacing;
          const sevColor =
            step.severity === "high"
              ? "var(--color-rose-400)"
              : step.severity === "medium"
                ? "var(--color-amber-400)"
                : "var(--color-silver-400)";

          return (
            <motion.g
              key={`node-${idx}`}
              initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.1 + idx * 0.12,
                ease: EASE,
              }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={nodeR - 4}
                fill="rgba(14,20,32,0.8)"
                stroke={sevColor}
                strokeWidth={1.5}
              />
              <foreignObject
                x={cx - nodeR + 4}
                y={cy - nodeR + 4}
                width={(nodeR - 4) * 2}
                height={(nodeR - 4) * 2}
                className="overflow-visible"
              >
                <div className="flex items-center justify-center w-full h-full">
                  <span
                    className="text-[7px] font-[family-name:var(--font-mono)] font-semibold text-center leading-tight"
                    style={{ color: sevColor }}
                  >
                    {step.domain.length > 6
                      ? step.domain.slice(0, 5) + "…"
                      : step.domain}
                  </span>
                </div>
              </foreignObject>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/* Health Delta Row — with divergence bar */
function HealthDeltaRow({ delta }: { delta: HealthScoreDelta }) {
  const trendColor =
    delta.trend === "improved"
      ? "var(--color-emerald-400)"
      : delta.trend === "degraded"
        ? "var(--color-rose-400)"
        : "var(--color-silver-400)";

  const TrendIcon =
    delta.trend === "improved"
      ? TrendingUp
      : delta.trend === "degraded"
        ? TrendingDown
        : Minus;

  /* Divergence bar: center = baseline, fill shows simulated */
  const baselinePct = Math.min(100, Math.max(0, delta.baselineScore));
  const simulatedPct = Math.min(100, Math.max(0, delta.simulatedScore));
  return (
    <div className="glass-twin__rule-delta">
      <TrendIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: trendColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] capitalize">
            {delta.domain}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-mono)]">
            <span className="text-[var(--color-silver-500)]">{delta.baselineScore}</span>
            <ArrowRight className="w-3 h-3 text-[var(--color-silver-600)]" />
            <span className="font-semibold" style={{ color: trendColor }}>
              {delta.simulatedScore}
            </span>
            <span
              className="text-[10px] px-1 py-0.5 rounded"
              style={{
                color: trendColor,
                backgroundColor: `color-mix(in srgb, ${trendColor} 10%, transparent)`,
              }}
            >
              {delta.delta > 0 ? "+" : ""}
              {delta.delta}
            </span>
          </div>
        </div>

        {/* Divergence bar */}
        <div className="glass-twin__diverge">
          <div className="glass-twin__diverge-center" />
          {/* Baseline fill (left half = negative direction) */}
          <motion.div
            className="glass-twin__diverge-fill"
            style={{
              right: "50%",
              backgroundColor: "rgba(148, 163, 184, 0.2)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${baselinePct / 2}%` }}
            transition={{ duration: 0.6, ease: EASE }}
          />
          {/* Simulated fill */}
          <motion.div
            className="glass-twin__diverge-fill"
            style={{
              left: "50%",
              backgroundColor: trendColor,
              opacity: 0.7,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${simulatedPct / 2}%` }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          />
        </div>

        {/* Factor changes */}
        {delta.factorChanges.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {delta.factorChanges.slice(0, 3).map((fc) => (
              <div
                key={fc.factorName}
                className="flex items-center justify-between text-[9px] font-[family-name:var(--font-mono)]"
              >
                <span className="text-[var(--color-silver-500)] capitalize">
                  {fc.factorName}
                </span>
                <span
                  style={{
                    color:
                      fc.delta > 0
                        ? "var(--color-emerald-400)"
                        : fc.delta < 0
                          ? "var(--color-rose-400)"
                          : "var(--color-silver-400)",
                  }}
                >
                  {fc.baseline} → {fc.simulated} ({fc.delta > 0 ? "+" : ""}
                  {fc.delta})
                </span>
              </div>
            ))}
            {delta.factorChanges.length > 3 && (
              <span className="text-[8px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
                +{delta.factorChanges.length - 3} más
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Goal Candidate Row */
function GoalCandidateRow({
  candidate,
  onDerive,
}: {
  candidate: SimulatedGoalCandidate;
  onDerive: () => void;
}) {
  const impactColor =
    candidate.impact === "high"
      ? "var(--color-rose-400)"
      : candidate.impact === "medium"
        ? "var(--color-amber-400)"
        : "var(--color-silver-400)";

  return (
    <div className="glass-twin__goal">
      <Lightbulb className="w-4 h-4 text-[var(--color-gold-400)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] block truncate">
          {candidate.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[9px] px-1 py-0.5 rounded font-[family-name:var(--font-mono)]"
            style={{
              color: impactColor,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {candidate.impact}
          </span>
          <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
            {candidate.confidence}% conf
          </span>
        </div>
      </div>
      {!candidate.alreadyExists && onDerive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDerive}
          icon={<Target className="w-3 h-3" />}
          className="text-[var(--color-teal-400)] text-[10px] min-h-[32px]"
        >
          Derivar
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function formatCompact(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(1);
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

interface TwinResultsProps {
  result: TwinSimulationResult;
  onDeriveGoal?: (candidate: SimulatedGoalCandidate) => void;
  onResimulate?: () => void;
}

export function TwinResults({
  result,
  onDeriveGoal,
  onResimulate,
}: TwinResultsProps) {
  const reduced = useReducedMotion();
  const { expandedSections, toggle, derived } = useTwinResults(result);

  const {
    verdict,
    ruleDeltas,
    cascades,
    predictions,
    healthDeltas,
    goalCandidates,
  } = result;

  const sectionAnim = (delay: number) =>
    reduced
      ? undefined
      : ({
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: EASE },
        } as const);

  const hasContent =
    predictions.length > 0 ||
    ruleDeltas.length > 0 ||
    cascades.length > 0;

  return (
    <div className="glass-twin">
      <div
        className={cn(
          "glass-twin__glow",
          VERDICT_GLOW[verdict.assessment] ?? "glass-twin__glow--neutral",
        )}
      />

      <div className="relative z-10 p-5 space-y-3">
        {/* ═══ Verdict Theater ═══ */}
        <VerdictTheater
          verdict={verdict}
          executionMs={result.executionMs}
          onResimulate={onResimulate}
          reduced={!!reduced}
        />

        {/* ═══ Predictions ═══ */}
        {predictions.length > 0 && (
          <motion.div {...(sectionAnim(0.2) ?? {})}>
            <GlassSection
              title="Predicciones"
              subtitle={`${predictions.length} métrica(s) impactada(s)`}
              icon={<Target className="w-4 h-4 text-[var(--color-gold-400)]" />}
              expanded={expandedSections.has("predictions")}
              onToggle={() => toggle("predictions")}
              badge={
                derived.directPredictions.length > 0
                  ? `${derived.directPredictions.length} directas`
                  : undefined
              }
              badgeColor="var(--color-teal-400)"
            >
              <div className="space-y-2">
                {derived.directPredictions.map((p) => (
                  <PredictionRow key={p.id} prediction={p} />
                ))}
                {derived.cascadePredictions.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-1">
                      <GitBranch className="w-3 h-3 text-[var(--color-amber-400)]" />
                      <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
                        Impactos en cascada
                      </span>
                    </div>
                    {derived.cascadePredictions.map((p) => (
                      <PredictionRow key={p.id} prediction={p} />
                    ))}
                  </>
                )}
              </div>
            </GlassSection>
          </motion.div>
        )}

        {/* ═══ Rule Deltas ═══ */}
        {ruleDeltas.length > 0 && (
          <motion.div {...(sectionAnim(0.3) ?? {})}>
            <GlassSection
              title="Reglas impactadas"
              subtitle={`${ruleDeltas.length} cambio(s)`}
              icon={<Zap className="w-4 h-4 text-[var(--color-amber-400)]" />}
              expanded={expandedSections.has("rules")}
              onToggle={() => toggle("rules")}
              badge={
                derived.newlyActivated.length > 0
                  ? `${derived.newlyActivated.length} nuevas`
                  : undefined
              }
              badgeColor="var(--color-rose-400)"
            >
              <div className="space-y-3">
                {derived.newlyActivated.length > 0 && (
                  <RuleGroup
                    label="Nuevas alertas"
                    color="var(--color-rose-400)"
                    rules={derived.newlyActivated}
                    stateClass="glass-twin__rule-delta--activated"
                  />
                )}
                {derived.newlyDeactivated.length > 0 && (
                  <RuleGroup
                    label="Alertas resueltas"
                    color="var(--color-emerald-400)"
                    rules={derived.newlyDeactivated}
                    stateClass="glass-twin__rule-delta--deactivated"
                  />
                )}
                {derived.intensified.length > 0 && (
                  <RuleGroup
                    label="Intensificadas"
                    color="var(--color-amber-400)"
                    rules={derived.intensified}
                    stateClass="glass-twin__rule-delta--intensified"
                  />
                )}
              </div>
            </GlassSection>
          </motion.div>
        )}

        {/* ═══ Cascades ═══ */}
        {cascades.length > 0 && (
          <motion.div {...(sectionAnim(0.4) ?? {})}>
            <GlassSection
              title="Cascadas detectadas"
              subtitle={`${derived.newCascades.length} nueva(s), ${derived.existingCascades.length} existente(s)`}
              icon={<GitBranch className="w-4 h-4 text-[var(--color-amber-400)]" />}
              expanded={expandedSections.has("cascades")}
              onToggle={() => toggle("cascades")}
              badge={
                derived.newCascades.length > 0
                  ? `${derived.newCascades.length} nuevas`
                  : undefined
              }
              badgeColor="var(--color-rose-400)"
            >
              <div className="space-y-3">
                {derived.newCascades.map((c) => (
                  <CascadeCard
                    key={c.patternId}
                    cascade={c}
                    isNew={true}
                    reduced={!!reduced}
                  />
                ))}
                {derived.existingCascades.map((c) => (
                  <CascadeCard
                    key={c.patternId}
                    cascade={c}
                    isNew={false}
                    reduced={!!reduced}
                  />
                ))}
              </div>
            </GlassSection>
          </motion.div>
        )}

        {/* ═══ Health Deltas ═══ */}
        {healthDeltas.length > 0 && (
          <motion.div {...(sectionAnim(0.5) ?? {})}>
            <GlassSection
              title="Impacto en salud"
              subtitle={`${healthDeltas.length} dominio(s)`}
              icon={<Activity className="w-4 h-4 text-[var(--color-teal-400)]" />}
              expanded={expandedSections.has("health")}
              onToggle={() => toggle("health")}
            >
              <div className="space-y-2.5">
                {healthDeltas.map((hd) => (
                  <HealthDeltaRow key={hd.domain} delta={hd} />
                ))}
              </div>
            </GlassSection>
          </motion.div>
        )}

        {/* ═══ Goal Candidates ═══ */}
        {goalCandidates.length > 0 && onDeriveGoal && (
          <motion.div {...(sectionAnim(0.6) ?? {})}>
            <GlassSection
              title="Goals sugeridos"
              subtitle={`${goalCandidates.length} goal(s) se derivarían`}
              icon={<Sparkles className="w-4 h-4 text-[var(--color-gold-400)]" />}
              expanded={expandedSections.has("goals")}
              onToggle={() => toggle("goals")}
            >
              <div className="space-y-2">
                {goalCandidates.map((c, idx) => (
                  <GoalCandidateRow
                    key={idx}
                    candidate={c}
                    onDerive={() => onDeriveGoal(c)}
                  />
                ))}
              </div>
            </GlassSection>
          </motion.div>
        )}

        {/* ═══ Empty State ═══ */}
        {!hasContent && (
          <div className="glass-twin__empty">
            <ShieldQuestion
              className="glass-twin__empty-icon w-12 h-12 text-[var(--color-silver-500)] mb-3"
              strokeWidth={1}
            />
            <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
              Sin impactos detectados.
            </p>
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1 max-w-[280px]">
              Los deltas no cruzaron ningún umbral. Probá con deltas más grandes o un escenario diferente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}