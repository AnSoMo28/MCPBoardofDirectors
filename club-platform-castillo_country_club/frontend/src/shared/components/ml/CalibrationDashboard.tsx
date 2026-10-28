// src/shared/components/ml/CalibrationDashboard.tsx
// Fase 23 — Silver Tide Calibration Neural Console
// Glass · Health Ring · Accuracy Matrix · Confidence Waterfall · Chain Validation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Target, Activity,
  BarChart3, Link2, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useCalibrationDashboard } from "./hooks/useCalibrationDashboard";
import type { CalibrationResult } from "@/shared/lib/advisor-engine/calibration-types";
import './ml-glass.css';
import './CalibrationDashboard.css';
/* ──────────────────────────────────────
   Helpers
   ────────────────────────────────────── */

function getAccuracyColor(rate: number): string {
  if (rate >= 0.7) return "var(--color-teal-400)";
  if (rate >= 0.5) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function getTrendVisual(trend: string) {
  if (trend === "improving") return { Icon: TrendingUp, color: "var(--color-emerald-400)" };
  if (trend === "declining") return { Icon: TrendingDown, color: "var(--color-rose-400)" };
  return { Icon: Minus, color: "var(--color-silver-500)" };
}

function getReadinessVisual(readiness: string) {
  if (readiness === "calibrated") return { Icon: CheckCircle2, color: "var(--color-teal-400)" };
  if (readiness === "warming") return { Icon: Clock, color: "var(--color-amber-400)" };
  return { Icon: AlertCircle, color: "var(--color-silver-500)" };
}

/* ──────────────────────────────────────
   Health Ring
   ────────────────────────────────────── */

function HealthRing({ score, reduced }: { score: number; reduced: boolean }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color =
    score >= 70 ? "var(--color-teal-400)"
    : score >= 40 ? "var(--color-amber-400)"
    : "var(--color-rose-400)";

  return (
    <div className="glass-cal__ring">
      <svg viewBox="0 0 100 100" className="glass-cal__ring-svg">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="5" opacity="0.06" />
        <motion.circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduced ? { strokeDashoffset: circ - fill } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - fill }}
          transition={reduced ? { duration: 0 } : { duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="glass-cal__ring-center">
        <motion.span
          className="glass-cal__ring-score"
          style={{ color }}
          initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="glass-cal__ring-label">Health</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Stat Card
   ────────────────────────────────────── */

function CalStatCard({
  icon: Icon, label, value, color, delay, reduced,
}: {
  icon: typeof Target;
  label: string;
  value: string | number;
  color: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="glass-cal__stat"
      initial={reduced ? undefined : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <div
        className="glass-cal__stat-icon"
        style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="glass-cal__stat-label">{label}</p>
        <p className="glass-cal__stat-value" style={{ color }}>{value}</p>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Accuracy Matrix — Heatmap Grid
   ────────────────────────────────────── */

function AccuracyMatrix({
  results,
  reduced,
}: {
  results: CalibrationResult[];
  reduced: boolean;
}) {
  return (
    <div className="glass-cal__section">
      <h4 className="glass-cal__section-title">Precisión por Rule</h4>
      <div className="glass-cal__matrix">
        {results.map((r, i) => {
          const pct = Math.round(r.accuracyRate * 100);
          const trend = getTrendVisual(r.trend);
          const TrendIcon = trend.Icon;
          const readiness = getReadinessVisual(r.readiness);

          return (
            <motion.div
              key={r.ruleId}
              className={cn("glass-cal__cell", `glass-cal__cell--${r.readiness}`)}
              initial={reduced ? undefined : { opacity: 0, scale: 0.95 }}
              animate={reduced ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.3 + i * 0.04 }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="glass-cal__cell-dot" style={{ background: readiness.color }} />
                <span className="glass-cal__cell-name" title={r.ruleId}>
                  {r.ruleId.replace("global_", "").replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="glass-cal__cell-pct" style={{ color: getAccuracyColor(r.accuracyRate) }}>
                  {pct}%
                </span>
                <TrendIcon className="w-3 h-3 flex-shrink-0" style={{ color: trend.color }} />
              </div>
              <div className="glass-cal__cell-bar-track">
                <motion.div
                  className="glass-cal__cell-bar-fill"
                  style={{ background: getAccuracyColor(r.accuracyRate) }}
                  initial={reduced ? undefined : { width: 0 }}
                  animate={reduced ? undefined : { width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.04 }}
                />
              </div>
              <span className="glass-cal__cell-count">{r.totalOutcomes} outcomes</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Confidence Waterfall — Diverging Bar Chart
   ────────────────────────────────────── */

function ConfidenceWaterfall({
  deltas,
  reduced,
}: {
  deltas: Array<{ ruleId: string; delta: number; original: number; accuracy: number; outcomes: number }>;
  reduced: boolean;
}) {
  const maxDelta = Math.max(...deltas.map((d) => Math.abs(d.delta)), 1);

  return (
    <div className="glass-cal__section">
      <h4 className="glass-cal__section-title">Delta de Confianza</h4>
      <p className="glass-cal__section-desc">
        Diferencia entre confianza del sistema y precisión real — 0 = calibración perfecta
      </p>
      <div className="glass-cal__wf">
        {deltas.map((d, i) => {
          const isOver = d.delta < 0;
          const barW = (Math.abs(d.delta) / maxDelta) * 45;
          const barColor = isOver ? "var(--color-amber-400)" : "var(--color-teal-400)";

          return (
            <motion.div
              key={d.ruleId}
              className="glass-cal__wf-row"
              initial={reduced ? undefined : { opacity: 0, x: isOver ? 8 : -8 }}
              animate={reduced ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
            >
              <span className="glass-cal__wf-label" title={d.ruleId}>
                {d.ruleId.length > 18 ? d.ruleId.slice(0, 18) + "…" : d.ruleId}
              </span>

              <div className="glass-cal__wf-bar-area">
                <div className="glass-cal__wf-center" />
                <div
                  className={cn(
                    "glass-cal__wf-bar",
                    isOver ? "glass-cal__wf-bar--left" : "glass-cal__wf-bar--right",
                  )}
                  style={{ width: `${barW}%`, background: barColor }}
                />
              </div>

              <span className="glass-cal__wf-delta" style={{ color: barColor }}>
                {d.delta > 0 ? "+" : ""}{d.delta}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="glass-cal__wf-legend">
        <span className="glass-cal__wf-legend-item">
          <span className="glass-cal__wf-legend-dot" style={{ background: "var(--color-amber-400)" }} />
          Sobre-confianza
        </span>
        <span className="glass-cal__wf-legend-item">
          <span className="glass-cal__wf-legend-dot" style={{ background: "var(--color-teal-400)" }} />
          Sub-confianza
        </span>
        <span className="glass-cal__wf-legend-item">
          <span className="glass-cal__wf-legend-dot" style={{ background: "rgba(255,255,255,0.1)" }} />
          Calibración perfecta (0)
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Causal Chain Section — Enhanced
   ────────────────────────────────────── */

function CausalChainSection({
  chains,
  reduced,
}: {
  chains: Array<{ patternId: string; detections: number; validated: number; confirmed: number; accuracy: number }>;
  reduced: boolean;
}) {
  return (
    <div className="glass-cal__section">
      <h4 className="glass-cal__section-title flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5" />
        Validación de Cadenas Causales
      </h4>
      <div className="glass-cal__chains">
        {chains.map((ch, i) => {
          const pct = Math.round(ch.accuracy * 100);
          const color = getAccuracyColor(ch.accuracy);

          return (
            <motion.div
              key={ch.patternId}
              className="glass-cal__chain-row"
              initial={reduced ? undefined : { opacity: 0, x: -8 }}
              animate={reduced ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.3 + i * 0.05 }}
            >
              <Link2 className="w-3.5 h-3.5 text-[var(--color-amber-400)] flex-shrink-0" />
              <span className="glass-cal__chain-name" title={ch.patternId}>
                {ch.patternId.replace(/_/g, " ")}
              </span>
              <div className="glass-cal__chain-bar-track">
                <motion.div
                  className="glass-cal__chain-bar-fill"
                  style={{ background: color }}
                  initial={reduced ? undefined : { width: 0 }}
                  animate={reduced ? undefined : { width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.05 }}
                />
              </div>
              <span className="glass-cal__chain-pct" style={{ color }}>{pct}%</span>
              <span className="glass-cal__chain-meta">
                {ch.detections} det · {ch.validated} val
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Empty State
   ────────────────────────────────────── */

function CalibrationEmptyState() {
  return (
    <div className="glass-cal glass-cal--empty">
      <div className="glass-cal__empty-icon">
        <Target className="w-12 h-12" strokeWidth={1} />
      </div>
      <p className="glass-cal__empty-title">Sin outcomes registrados</p>
      <p className="glass-cal__empty-desc">
        Ejecutá acciones del Advisor para comenzar a calibrar el sistema.
      </p>
    </div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export function CalibrationDashboard() {
  const reduced = useReducedMotion();
  const {
    report, totalOutcomes, resetCalibration,
    chainAccuracy, healthScore, readinessDist,
    sortedResults, confidenceDeltas,
  } = useCalibrationDashboard();

  const [showReset, setShowReset] = useState(false);

  const handleReset = useCallback(() => {
    if (showReset) {
      resetCalibration();
      setShowReset(false);
    } else {
      setShowReset(true);
      setTimeout(() => setShowReset(false), 3000);
    }
  }, [showReset, resetCalibration]);

  if (totalOutcomes === 0) return <CalibrationEmptyState />;

  return (
    <div className="glass-cal">
      {/* Ambient glow orb */}
      <span className="glass-cal__glow" aria-hidden="true" />

      {/* Header */}
      <div className="glass-cal__header">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-teal-400)]" />
          <h3 className="glass-cal__title">Calibración del Sistema</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="glass-cal__reset">
          {showReset ? "¿Confirmar reset?" : "Reset"}
        </Button>
      </div>

      {/* Hero: Health Ring + Stats */}
      <div className="glass-cal__hero">
        <HealthRing score={healthScore} reduced={reduced} />
        <div className="glass-cal__stats">
          <CalStatCard icon={BarChart3} label="Outcomes" value={totalOutcomes} color="var(--color-silver-300)" delay={0.1} reduced={reduced} />
          <CalStatCard icon={CheckCircle2} label="Calibradas" value={`${readinessDist.calibrated}/${report.rulesTracked}`} color="var(--color-teal-400)" delay={0.15} reduced={reduced} />
          <CalStatCard icon={Activity} label="Precisión" value={`${Math.round(report.overallAccuracy * 100)}%`} color={getAccuracyColor(report.overallAccuracy)} delay={0.2} reduced={reduced} />
          <CalStatCard icon={Target} label="Rules" value={report.rulesTracked} color="var(--color-gold-400)" delay={0.25} reduced={reduced} />
        </div>
      </div>

      {/* Accuracy Matrix */}
      {sortedResults.length > 0 && (
        <AccuracyMatrix results={sortedResults} reduced={reduced} />
      )}

      {/* Confidence Waterfall */}
      {confidenceDeltas.length > 0 && (
        <ConfidenceWaterfall deltas={confidenceDeltas} reduced={reduced} />
      )}

      {/* Causal Chains */}
      {chainAccuracy.length > 0 && (
        <CausalChainSection chains={chainAccuracy} reduced={reduced} />
      )}
    </div>
  );
}