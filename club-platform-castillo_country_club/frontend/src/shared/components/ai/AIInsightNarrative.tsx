// src/shared/components/ai/AIInsightNarrative.tsx
// Fase 23 — Silver Tide AI Insight Intelligence Briefing
// Glass · Typewriter · Confidence Lattice · Causal Chain · Benchmark Bar
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Brain, Target, TrendingUp, Zap, AlertCircle,
  Shield, ChevronRight, Clock,
} from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import { useAdvisorNarrative } from "@/shared/hooks/useAdvisorNarrative";
import './AIInsightNarrative.css';
/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface AIInsightNarrativeProps {
  insightId: string;
  insightData: Record<string, unknown>;
  financialContext?: unknown | null;
  eventsContext?: unknown | null;
  role?: string;
}

/* ──────────────────────────────────────
   Typewriter Hook
   ────────────────────────────────────── */

function useTypewriter(text: string, speed = 20, enabled = true) {
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed(text || "");
      setIsDone(true);
      return;
    }

    setDisplayed("");
    setIsDone(false);
    let i = 0;

    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayed, isDone };
}

/* ──────────────────────────────────────
   Section Reveal Stage
   ────────────────────────────────────── */

type Stage = "idle" | "confidence" | "rootcause" | "benchmark" | "recommendation" | "complete";

function useNarrativeReveal(reduced: boolean, isLoading: boolean) {
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    if (isLoading) {
      setStage("idle");
      return;
    }
    if (reduced) {
      setStage("complete");
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (s: Stage, ms: number) => {
      timers.push(setTimeout(() => setStage(s), ms));
    };

    schedule("confidence", 300);
    schedule("rootcause", 800);
    schedule("benchmark", 2000);
    schedule("recommendation", 3200);
    schedule("complete", 4000);

    return () => timers.forEach(clearTimeout);
  }, [isLoading, reduced]);

  return stage;
}

/* ──────────────────────────────────────
   Confidence Lattice — Hexagonal Gauge
   ────────────────────────────────────── */

function ConfidenceLattice({
  score,
  reduced,
}: {
  score: number;
  reduced: boolean;
}) {
  const color =
    score >= 80 ? "var(--color-emerald-400)"
    : score >= 60 ? "var(--color-amber-400)"
    : "var(--color-rose-400)";

  const label =
    score >= 80 ? "Alta"
    : score >= 60 ? "Media"
    : "Baja";

  /* Hexagon points (centered at 50,50, radius 40) */
  const hexPoints = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${50 + 40 * Math.cos(angle)},${50 + 40 * Math.sin(angle)}`;
    }).join(" ");
  }, []);

  const fillPoints = useMemo(() => {
    const r = (score / 100) * 40;
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
    }).join(" ");
  }, [score]);

  return (
    <div className="glass-narrative__lattice">
      <svg viewBox="0 0 100 100" className="glass-narrative__lattice-svg">
        <polygon
          points={hexPoints}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
        <motion.polygon
          points={fillPoints}
          fill={color}
          fillOpacity="0.08"
          stroke={color}
          strokeWidth="1.5"
          initial={reduced ? undefined : { opacity: 0, scale: 0.5 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: "50px 50px", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="glass-narrative__lattice-center">
        <span className="glass-narrative__lattice-score" style={{ color }}>{score}</span>
        <span className="glass-narrative__lattice-label">{label}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Causal Chain Mini-Visualization
   ────────────────────────────────────── */

function CausalChainMini({
  rootCause,
  reduced,
}: {
  rootCause: string;
  reduced: boolean;
}) {
  /* Extract causal chain from root cause text (heuristic) */
  const nodes = useMemo(() => {
    const sentences = rootCause.split(/[.·→]/).filter((s) => s.trim().length > 5);
    return sentences.slice(0, 4).map((s) => s.trim());
  }, [rootCause]);

  if (nodes.length < 2) return null;

  return (
    <div className="glass-narrative__chain">
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="glass-narrative__chain-node"
          initial={reduced ? undefined : { opacity: 0, x: -8 }}
          animate={reduced ? undefined : { opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.15 }}
        >
          <div
            className={cn(
              "glass-narrative__chain-dot",
              i === nodes.length - 1 && "glass-narrative__chain-dot--conclusion",
            )}
          />
          <span className="glass-narrative__chain-text">{node}</span>
          {i < nodes.length - 1 && (
            <ChevronRight className="w-3 h-3 text-[var(--color-silver-500)] flex-shrink-0" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────
   Benchmark Bar — Industry Comparison
   ────────────────────────────────────── */
/* ──────────────────────────────────────
   Narrative Section — Typewriter + Evidence Weight
   ────────────────────────────────────── */

function NarrativeSection({
  icon,
  label,
  color,
  content,
  evidenceWeight,
  stage,
  stageKey,
  reduced,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  content: string;
  evidenceWeight?: number;
  stage: Stage;
  stageKey: Stage;
  reduced: boolean;
}) {
  const shouldShow = stage === stageKey || stage === "complete";
  const shouldType = shouldShow && !reduced;

  const { displayed, isDone } = useTypewriter(content, 18, shouldType);

  if (!shouldShow && !reduced) return null;

  return (
    <motion.div
      className="glass-narrative__section"
      initial={reduced ? undefined : { opacity: 0, x: -8 }}
      animate={reduced ? undefined : { opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="glass-narrative__section-header">
        <span style={{ color }}>{icon}</span>
        <span className="glass-narrative__section-label" style={{ color }}>
          {label}
        </span>
        {evidenceWeight && (
          <span className="glass-narrative__evidence-weight">
            {Array.from({ length: 3 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "glass-narrative__evidence-dot",
                  i < evidenceWeight && "glass-narrative__evidence-dot--filled",
                )}
              />
            ))}
          </span>
        )}
      </div>
      <p className="glass-narrative__section-text">
        {reduced ? content : displayed}
        {!reduced && !isDone && <span className="glass-narrative__cursor" />}
      </p>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Impact Projection — Timeline Bar
   ────────────────────────────────────── */

function ImpactProjection({
  impact,
  reduced,
}: {
  impact: string;
  reduced: boolean;
}) {
  /* Extract percentage for bar width */
  const match = impact.match(/(\d+)/);
  const pct = match ? Math.min(parseInt(match[1], 10), 100) : 50;

  return (
    <motion.div
      className="glass-narrative__impact"
      initial={reduced ? undefined : { opacity: 0, y: 6 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="glass-narrative__impact-timeline">
        <span className="glass-narrative__impact-now">Ahora</span>
        <div className="glass-narrative__impact-track">
          <motion.div
            className="glass-narrative__impact-fill"
            initial={reduced ? undefined : { width: 0 }}
            animate={reduced ? undefined : { width: `${pct}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          />
        </div>
        <span className="glass-narrative__impact-target">90 días</span>
      </div>
      <span className="glass-narrative__impact-value">{impact}</span>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Loading State — Intelligence Briefing
   ────────────────────────────────────── */

function NarrativeLoading({ reduced }: { reduced: boolean }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [reduced]);

  return (
    <motion.div
      className="glass-narrative glass-narrative--loading"
      initial={reduced ? undefined : { opacity: 0 }}
      animate={reduced ? undefined : { opacity: 1 }}
    >
      <div className="glass-narrative__loading-content">
        <motion.div
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="w-5 h-5 text-[var(--color-gold-400)]" />
        </motion.div>
        <div>
          <p className="glass-narrative__loading-text">
            Generando análisis profundo{dots}
          </p>
          <p className="glass-narrative__loading-sub">
            Advisor procesando contexto financiero, eventos y datos operativos
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export default function AIInsightNarrative({
  insightId,
  insightData,
  financialContext,
  eventsContext,
  role = "admin",
}: AIInsightNarrativeProps) {
  const reduced = useReducedMotion();

  const { data, isLoading, isError } = useAdvisorNarrative({
    insightData: { ...insightData, id: insightId },
    financialContext,
    eventsContext,
    role,
  });

  const narrative = data?.narrative;
  const stage = useNarrativeReveal(reduced, isLoading);
  const timestamp = useMemo(() => {
    return new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  }, []);

  /* ── Loading ── */
  if (isLoading) return <NarrativeLoading reduced={reduced} />;

  /* ── Error ── */
  if (isError || !narrative) {
    return (
      <motion.div
        className="glass-narrative glass-narrative--error"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
      >
        <AlertCircle className="w-4 h-4 text-[var(--color-silver-400)]" />
        <p>No se pudo generar el análisis. Intentá de nuevo.</p>
      </motion.div>
    );
  }

  /* ── Evidence weight heuristic ── */
  const evidenceWeights = {
    rootCause: narrative.root_cause.length > 100 ? 3 : narrative.root_cause.length > 50 ? 2 : 1,
    benchmark: narrative.benchmark_comparison ? (narrative.benchmark_comparison.length > 80 ? 3 : 2) : 0,
    recommendation: narrative.recommendation.length > 100 ? 3 : narrative.recommendation.length > 50 ? 2 : 1,
  };

  return (
    <motion.div
      className="glass-narrative"
      initial={reduced ? undefined : { opacity: 0, y: 4 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Header ── */}
      <div className="glass-narrative__header">
        <div className="glass-narrative__header-left">
          <motion.div
            animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="w-4 h-4 text-[var(--color-gold-400)]" />
          </motion.div>
          <span className="glass-narrative__header-title">Análisis Profundo</span>
        </div>
        <div className="glass-narrative__header-right">
          {stage === "confidence" || stage === "complete" ? (
            <ConfidenceLattice score={narrative.adjusted_confidence} reduced={reduced} />
          ) : null}
          <span className="glass-narrative__header-time">
            <Clock className="w-3 h-3" />
            {timestamp}
          </span>
        </div>
      </div>

      {/* ── Root Cause ── */}
      {(stage === "rootcause" || stage === "benchmark" || stage === "recommendation" || stage === "complete") && (
        <>
          <NarrativeSection
            icon={<Target className="w-3 h-3" />}
            label="Causa Raíz"
            color="var(--color-rose-400)"
            content={narrative.root_cause}
            evidenceWeight={evidenceWeights.rootCause}
            stage={stage}
            stageKey="rootcause"
            reduced={reduced}
          />
          <CausalChainMini rootCause={narrative.root_cause} reduced={reduced} />
        </>
      )}

      {/* ── Benchmark ── */}
      {narrative.benchmark_comparison && (stage === "benchmark" || stage === "recommendation" || stage === "complete") && (
        <NarrativeSection
          icon={<TrendingUp className="w-3 h-3" />}
          label="Benchmark Costa Rica"
          color="var(--color-teal-400)"
          content={narrative.benchmark_comparison}
          evidenceWeight={evidenceWeights.benchmark}
          stage={stage}
          stageKey="benchmark"
          reduced={reduced}
        />
      )}

      {/* ── Recommendation + Impact ── */}
      {(stage === "recommendation" || stage === "complete") && (
        <motion.div
          className="glass-narrative__recommendation"
          initial={reduced ? undefined : { opacity: 0, x: -8 }}
          animate={reduced ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="glass-narrative__rec-header">
            <Zap className="w-3 h-3 text-[var(--color-gold-400)]" />
            <span className="glass-narrative__rec-label">Recomendación</span>
            <span className="glass-narrative__evidence-weight">
              {Array.from({ length: 3 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "glass-narrative__evidence-dot",
                    i < evidenceWeights.recommendation && "glass-narrative__evidence-dot--filled",
                  )}
                />
              ))}
            </span>
          </div>
          <p className="glass-narrative__rec-text">
            {reduced ? narrative.recommendation : null}
            {!reduced && (() => {
              const { displayed, isDone } = useTypewriter(narrative.recommendation, 18, stage === "recommendation" || stage === "complete");
              return <>{displayed}{!isDone && <span className="glass-narrative__cursor" />}</>;
            })()}
          </p>

          {narrative.estimated_impact && (
            <ImpactProjection impact={narrative.estimated_impact} reduced={reduced} />
          )}
        </motion.div>
      )}

      {/* ── Powered by footer ── */}
      {stage === "complete" && (
        <motion.div
          className="glass-narrative__footer"
          initial={reduced ? undefined : { opacity: 0 }}
          animate={reduced ? undefined : { opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Shield className="w-3 h-3" />
          <span>Advisor Intelligence · Datos operativos del Castillo</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export { AIInsightNarrative };